import { useFrame } from '@react-three/fiber'
import { useRapier, RapierRigidBody } from '@react-three/rapier'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { MutableRefObject, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'

export interface GroundAssistOptions {
  wheelOffsets?: [number, number, number][]
  bodyHalfHeight?: number
  probeUp?: number
  probeDown?: number
  targetGap?: number
  maxSnap?: number
  enable?: boolean
  debug?: boolean
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
    ...opts,
  }

  const debugTimer = useRef(0)

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

    // Assist: gently snap down to ground if floating and near ground
    if (!grounded && minGroundY !== null) {
      const desiredY = minGroundY + options.bodyHalfHeight + options.targetGap
      const dy = desiredY - t.y
      const vy = lin.y
      const absDy = Math.abs(dy)

      if (absDy < options.maxSnap && Math.abs(vy) < 1.0) {
        const newY = t.y + dy * 0.7 // smooth snap
        body.setTranslation({ x: t.x, y: newY, z: t.z }, true)
      }
    }
  })
}

export default useGroundAssist
