import { useFrame } from '@react-three/fiber'
import { useRapier, RapierRigidBody } from '@react-three/rapier'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { MutableRefObject, useRef } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'

export interface GroundAssistOptions {
  wheelOffsets?: [number, number, number][]
  bodyHalfHeight?: number
  probeUp?: number
  probeDown?: number
  targetGap?: number
  maxSnap?: number
  enable?: boolean
  debug?: boolean
  // Soft landing options
  softLanding?: boolean
  preLandingDist?: number      // start limiting descent within this distance (m)
  maxDownVel?: number          // clamp downward velocity (m/s)
  dynamicSnap?: boolean        // vary snap based on vy
  landingDampingTime?: number  // extra damping duration after touch-down
  // Slope alignment options (requires pitch/roll enabled on body)
  alignToSlope?: boolean
  maxTiltDeg?: number
  slopeSlerp?: number
}

/**
 * Raycast 4 wheel probes to check ground contact and gently snap to ground when floating.
 * Logs distances when debug=true.
 */
export function useGroundAssist(
  bodyRef: MutableRefObject<RapierRigidBody | null>,
  opts: GroundAssistOptions = {}
) {
  const { world } = useRapier()
  const options = {
    wheelOffsets: [
      [0.7, -0.1, 0.6],   // FL (matches Car.tsx visuals)
      [0.7, -0.1, -0.6],  // FR
      [-0.7, -0.1, 0.6],  // RL
      [-0.7, -0.1, -0.6], // RR
    ] as [number, number, number][],
    bodyHalfHeight: 0.4,
    probeUp: 0.6,
    probeDown: 2.0,
    targetGap: 0.02, // desired tiny clearance
    maxSnap: 0.5,    // only snap if within this distance
    enable: true,
    debug: false,
    softLanding: true,
    preLandingDist: 1.2,
    maxDownVel: 6.0,
    dynamicSnap: true,
    landingDampingTime: 0.25,
    alignToSlope: false,
    maxTiltDeg: 12,
    slopeSlerp: 0.15,
    ...opts,
  }

  const debugTimer = useRef(0)
  const wasGrounded = useRef(false)
  const landingTimer = useRef(0)

  // Reusable math objects
  const qTmp = useRef(new Quaternion())
  const vTmp = useRef({
    offset: new Vector3(),
    t: new Vector3(),
  })

  useFrame((_, delta) => {
    if (!options.enable) return
    const body = bodyRef.current
    if (!body) return

    const t = body.translation()
    const q = body.rotation()
    const lin = body.linvel()

    // three.js quaternion for transforming offsets
    qTmp.current.set(q.x, q.y, q.z, q.w)
    vTmp.current.t.set(t.x, t.y, t.z)

    let grounded = false
    let minGroundY: number | null = null
    let minWheelGap: number = Infinity
    const contactPoints: Vector3[] = []

    for (const o of options.wheelOffsets) {
      vTmp.current.offset.set(o[0], o[1], o[2]).applyQuaternion(qTmp.current).add(vTmp.current.t)

      const origin = { x: vTmp.current.offset.x, y: vTmp.current.offset.y + options.probeUp, z: vTmp.current.offset.z }
      const dir = { x: 0, y: -1, z: 0 }
      const ray = new RAPIER.Ray(origin, dir)
      type RayHit = { toi: number }
      const hit = world.castRay(ray, options.probeDown + options.probeUp, true) as unknown as RayHit | null

      if (hit && hit.toi >= 0) {
        const groundY = origin.y - hit.toi
        const distWheelToGround = vTmp.current.offset.y - groundY
        if (distWheelToGround <= options.targetGap + 0.01) grounded = true
        if (minGroundY === null || groundY > minGroundY) minGroundY = groundY
        if (distWheelToGround < minWheelGap) minWheelGap = distWheelToGround
        // accumulate contact point for slope fitting
        contactPoints.push(new Vector3(vTmp.current.offset.x, groundY, vTmp.current.offset.z))
      }
    }

    // Debug log throttled
    if (options.debug) {
      debugTimer.current += delta
      if (debugTimer.current > 0.25) {
        console.log('[GroundAssist] grounded=', grounded, 'minGroundY=', minGroundY?.toFixed(3), 'bodyY=', t.y.toFixed(3))
        debugTimer.current = 0
      }
    }

    // Soft landing: pre-landing velocity clamp
    if (options.softLanding && !grounded && isFinite(minWheelGap)) {
      if (minWheelGap < (options.preLandingDist ?? 1.2) && lin.y < -(options.maxDownVel ?? 6.0)) {
        body.setLinvel({ x: lin.x, y: -(options.maxDownVel ?? 6.0), z: lin.z }, true)
      }
    }

    // Assist: gently snap down to ground if floating and near ground
    if (!grounded && minGroundY !== null) {
      const desiredY = minGroundY + (options.bodyHalfHeight ?? 0.4) + (options.targetGap ?? 0.02)
      const dy = desiredY - t.y
      const vy = lin.y
      const absDy = Math.abs(dy)

      const maxSnapEff = options.dynamicSnap
        ? Math.max(0.08, (options.maxSnap ?? 0.5) * Math.max(0.2, 1 - Math.min(1, Math.abs(vy) / 6)))
        : (options.maxSnap ?? 0.5)

      if (absDy < maxSnapEff && Math.abs(vy) < 1.5) {
        const k = 0.7 * Math.max(0.3, 1 - Math.abs(vy) * 0.2)
        const newY = t.y + dy * k // smooth snap
        body.setTranslation({ x: t.x, y: newY, z: t.z }, true)
      }
    }

    // Landing event detection and temporary damping
    if (!wasGrounded.current && grounded) {
      landingTimer.current = options.landingDampingTime ?? 0.25
    }
    wasGrounded.current = grounded

    if (landingTimer.current > 0) {
      landingTimer.current -= delta
      // Reduce vertical and angular bounces slightly
      const dampLinY = lin.y * 0.6
      const ang = body.angvel()
      body.setLinvel({ x: lin.x, y: dampLinY, z: lin.z }, true)
      body.setAngvel({ x: ang.x * 0.6, y: ang.y, z: ang.z * 0.6 }, true)
    }

    // Slope alignment (requires pitch/roll enabled on body)
    if (options.alignToSlope && grounded && contactPoints.length >= 3) {
      // Fit plane normal from three points (use first 3 well-spaced points)
      const a = contactPoints[0]
      const b = contactPoints[1]
      const c = contactPoints[2]
      const ab = b.clone().sub(a)
      const ac = c.clone().sub(a)
      let n = ab.clone().cross(ac).normalize()
      // Force normal to face upward to avoid flipping toward underside
      if (n.y < 0) n.multiplyScalar(-1)
      if (isFinite(n.x) && isFinite(n.y) && isFinite(n.z) && n.lengthSq() > 0.5) {
        // Current forward projected onto plane to preserve heading
        const q = body.rotation()
        const qT = new Quaternion(q.x, q.y, q.z, q.w)
        const f = new Vector3(1, 0, 0).applyQuaternion(qT)
        const fProj = f.clone().sub(n.clone().multiplyScalar(f.dot(n)))
        if (fProj.lengthSq() > 1e-5) {
          fProj.normalize()
          const r = new Vector3().crossVectors(n, fProj).normalize()
          const m = new Matrix4().makeBasis(fProj, n, r)
          const qTarget = new Quaternion().setFromRotationMatrix(m)
          // Limit tilt
          const up = new Vector3(0, 1, 0).applyQuaternion(qT)
          const tilt = Math.acos(Math.max(-1, Math.min(1, up.dot(n))))
          const maxTilt = (options.maxTiltDeg ?? 12) * Math.PI / 180
          const limitScale = tilt > 1e-3 ? Math.min(1, maxTilt / tilt) : 1
          const slerpAlpha = (options.slopeSlerp ?? 0.15) * limitScale
          const qNew = qT.clone().slerp(qTarget, Math.max(0, Math.min(1, slerpAlpha)))
          body.setRotation({ x: qNew.x, y: qNew.y, z: qNew.z, w: qNew.w }, true)
        }
      }
    }
  })
}

export default useGroundAssist
