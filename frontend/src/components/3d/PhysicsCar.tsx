import React, { forwardRef, useRef, useEffect } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider, RapierRigidBody } from '@react-three/rapier'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import Car from './Car'
import useGroundAssist from './utils/useGroundAssist'

interface PhysicsCarProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  name?: string
  mass?: number
  friction?: number
  restitution?: number
  engineForce?: number
  brakeForce?: number
  maxSpeed?: number
  steerStrength?: number
  autoControl?: boolean
  controlKeys?: {
    forward: string
    backward: string
    left: string
    right: string
    brake: string
  }
}

const PhysicsCar = forwardRef<RapierRigidBody, PhysicsCarProps>(({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  color = '#ff6b6b',
  name = 'Car',
  mass = 800,
  friction = 0.4,
  restitution = 0.02,
  engineForce = 2800,
  brakeForce = 6000,
  maxSpeed = 12,
  steerStrength = 850,
  autoControl = false,
  controlKeys = { forward: 'w', backward: 's', left: 'a', right: 'd', brake: ' ' }
}, ref) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const keys = useRef<Set<string>>(new Set())
  const ai = useRef({ t: 0 })
  const spawn = useRef<[number, number, number]>(position)

  // 입력 처리
  useEffect(() => {
    if (autoControl) return
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const preventKeys = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright']
      if (preventKeys.indexOf(k) !== -1) e.preventDefault()
      if (!e.repeat) keys.current.add(k)
    }
    const up = (e: KeyboardEvent) => { keys.current.delete(e.key.toLowerCase()) }
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [autoControl])

  // Reusable vectors to avoid GC spikes each frame
  const vTmp = useRef({
    forward: new Vector3(1, 0, 0),
    right: new Vector3(0, 0, 1),
    lv: new Vector3(),
    v2: new Vector3(),
    vdir: new Vector3(),
    // Axle-related
    rF: new Vector3(),
    rR: new Vector3(),
    fwdF: new Vector3(1, 0, 0),
    rightF: new Vector3(0, 0, 1),
    fwdR: new Vector3(1, 0, 0),
    rightR: new Vector3(0, 0, 1),
    vF: new Vector3(),
    vR: new Vector3(),
    w: new Vector3(),
    totalF: new Vector3(),
    Ft: new Vector3(),
    Flf: new Vector3(),
    Flr: new Vector3(),
  })

  useFrame((_, delta) => {
    const body = (ref && 'current' in ref ? ref.current : rigidBodyRef.current)
    if (!body) return

    // 속도/각속도
    const lv = body.linvel(), av = body.angvel()
    
    // 2단계: X/Z축 회전만 안정화 (Y축 조향은 허용)
    if (Math.abs(av.x) > 0.01 || Math.abs(av.z) > 0.01) {
      body.setAngvel({ x: 0, y: av.y, z: 0 }, true)
    }

    // 낙하 안전장치: 지면 아래로 떨어지면 리스폰
    const p = body.translation()
    if (p.y < -0.5) {
      body.setTranslation({ x: spawn.current[0], y: spawn.current[1], z: spawn.current[2] }, true)
      body.setLinvel({ x:0, y:0, z:0 }, true)
      body.setAngvel({ x:0, y:0, z:0 }, true)
      return
    }
    const q = body.rotation()
    const tmp = vTmp.current
    // directions
    tmp.forward.set(1, 0, 0).applyQuaternion(q).normalize()
    tmp.right.set(0, 0, 1).applyQuaternion(q).normalize()
    // planar velocity
    tmp.lv.set(lv.x, lv.y, lv.z)
    tmp.v2.set(lv.x, 0, lv.z)
    const speed = tmp.v2.length()

    // 2단계: 전진/후진 + 조향 입력 처리
    let throttle = 0
    let steer = 0
    let braking = 0
    if (autoControl) {
      ai.current.t += delta
      throttle = 0.3 // 자동 제어시 약간만
      steer = 0 // 직진
    } else {
      const f = keys.current.has(controlKeys.forward) || keys.current.has('arrowup')
      const b = keys.current.has(controlKeys.backward) || keys.current.has('arrowdown')
      const l = keys.current.has(controlKeys.left)    || keys.current.has('arrowleft')
      const r = keys.current.has(controlKeys.right)   || keys.current.has('arrowright')
      const br= keys.current.has(controlKeys.brake)
      
      // 전진/후진 (기존과 동일)
      throttle = (f ? 1.5 : 0) + (b ? -1.0 : 0)
      
      // 좌우 조향 추가
      steer = (l ? -1 : 0) + (r ? 1 : 0)
      
      // 브레이킹
      braking = br ? 1.5 : 0
    }

    // ===== 2단계: 전진/후진 + 조향 물리 =====
    
    // 전진/후진 힘 계산
    let driveForce = engineForce * throttle
    
    // 브레이킹
    if (braking > 0 && speed > 0.1) {
      const brakeDir = speed > 0.1 ? -1 : 1
      driveForce += brakeForce * braking * brakeDir
    }
    
    // 실제 질량 사용 (콜라이더 density 합산값)
    const m = (body as any).mass ? (body as any).mass() : 800
    const maxForce = m * 9.81 * 0.95 // 트랙션 한계(μ≈0.95)
    driveForce = Math.max(-maxForce, Math.min(maxForce, driveForce))
    
    // 차량의 앞 방향으로 힘 적용
    const forceVector = {
      x: tmp.forward.x * driveForce,
      y: 0,
      z: tmp.forward.z * driveForce
    }
    
    body.addForce(forceVector, true)
    
    // ===== 측면 미끄러짐 방지 =====
    // 차량의 오른쪽 방향 벡터
    tmp.right.set(0, 0, 1).applyQuaternion(q).normalize()
    
    // 측면 속도 계산
    const lateralVelocity = tmp.v2.dot(tmp.right)
    
    // 측면 미끄러짐이 있으면 반대 힘 적용 (완화됨)
    if (Math.abs(lateralVelocity) > 0.1) {
      const lateralDrag = -lateralVelocity * m * 1.2 // 과도한 횡저항 완화
      const lateralForce = {
        x: tmp.right.x * lateralDrag,
        y: 0,
        z: tmp.right.z * lateralDrag
      }
      body.addForce(lateralForce, true)
    }
    
    // ===== 조향 토크 추가 =====
    // 속도 기반 조향 스케일링(정지 시 제자리 회전 방지)
    const steerScale = Math.min(speed / 6, 1)
    if (Math.abs(steer) > 0.01 && steerScale > 0.01) {
      // 좌핸들(A)=좌회전, 우핸들(D)=우회전이 되도록 토크 부호 반전
      const steerTorque = -steerStrength * steer * steerScale
      body.addTorque({ x: 0, y: steerTorque, z: 0 }, true)
    } else {
      // 조향 입력이 없으면 Y축 회전 감쇠
      const currentYAngvel = av.y
      if (Math.abs(currentYAngvel) > 0.05) {
        const dampingTorque = -currentYAngvel * 1000 // 강한 감쇠
        body.addTorque({ x: 0, y: dampingTorque, z: 0 }, true)
      }
    }

    // 5) 항력+구름저항 + 다운포스 (완화)
    if (speed > 0.01) {
      tmp.vdir.copy(tmp.v2).normalize()
      const dragK = 0.25, rollK = 8
      const Fx = dragK * speed * speed + rollK * speed
      body.addForce({ x: -tmp.vdir.x * Fx, y: 0, z: -tmp.vdir.z * Fx }, true)
      const downK = 0.2 // 다운포스 완화
      body.addForce({ x: 0, y: -downK * speed * speed, z: 0 }, true)
    }

    // 6) 안정화: X/Z 각속도 감쇠, 수직 속도 캡
    if (Math.abs(av.x) > 0.1 || Math.abs(av.z) > 0.1) {
      body.setAngvel({ x: av.x * 0.9, y: av.y, z: av.z * 0.9 }, true)
    }
    if (Math.abs(lv.y) > 16) {
      body.setLinvel({ x: lv.x, y: Math.sign(lv.y) * 16, z: lv.z }, true)
    }

    // 7) 속도 하드캡
    const hardMax = maxSpeed * 1.15
    if (speed > hardMax && speed > 1e-6) {
      tmp.vdir.copy(tmp.v2).normalize()
      body.setLinvel({ x: tmp.vdir.x * hardMax, y: lv.y, z: tmp.vdir.z * hardMax }, true)
    }
  })

  // Ground assist: 휠 센서 위치와 하부 콜라이더에 맞춰 보정
  useGroundAssist(rigidBodyRef, {
    enable: true,
    debug: false,
    wheelOffsets: [
      [0.7, 0.34, 0.6],   // FL (휠 센서 위치와 일치)
      [0.7, 0.34, -0.6],  // FR
      [-0.7, 0.34, 0.6],  // RL
      [-0.7, 0.34, -0.6], // RR
    ],
    bodyHalfHeight: 0.05, // 가장 낮은 콜라이더 바닥까지의 로컬 거리(≈0.05)
    targetGap: 0.04,
    maxSnap: 0.08,
  })

  return (
    <RigidBody
      ref={ref || rigidBodyRef}
      position={position}
      rotation={rotation}
      friction={friction}
      restitution={restitution}
      type="dynamic"
      enabledRotations={[false, true, false]} // 2단계: Y축 회전(조향) 활성화
      linearDamping={0.1}
      angularDamping={3.0}
      canSleep={false}
      colliders={false}
      ccd // CCD 활성화로 관통 방지
    >
      {/* 메인 차체(중간) - 현실적인 질량을 위해 밀도 상향 */}
      <CuboidCollider
        args={[0.9, 0.25, 0.5]}
        position={[0, 0.78, 0]}
        density={800} // ≈720 kg
        friction={friction}
        restitution={restitution}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
      />

      {/* 루프(경량) */}
      <CuboidCollider
        args={[0.6, 0.15, 0.35]}
        position={[0, 1.28, 0]}
        density={200} // ≈50 kg
        friction={friction}
        restitution={restitution}
      />

      {/* 하부 스키드(접지 담당, 가장 낮은 지점) */}
      <CuboidCollider
        args={[0.8, 0.1, 0.4]}
        position={[0, 0.15, 0]} // 바닥까지 ≈0.05
        density={400} // ≈100 kg
        friction={friction}
        restitution={restitution}
      />
      
      {/* 4개 휠 콜라이더 (실린더) - 트랙 표면에 맞춤 */}
      {/* Front Left (센서 전환) */}
      <CylinderCollider
        args={[0.125, 0.3]} // [height/2, radius]
        position={[0.7, 0.34, 0.6]}
        rotation={[Math.PI/2, 0, 0]}
        sensor
      />
      
      {/* Front Right (센서 전환) */}
      <CylinderCollider
        args={[0.125, 0.3]}
        position={[0.7, 0.34, -0.6]}
        rotation={[Math.PI/2, 0, 0]}
        sensor
      />
      
      {/* Rear Left (센서 전환) */}
      <CylinderCollider
        args={[0.125, 0.3]}
        position={[-0.7, 0.34, 0.6]}
        rotation={[Math.PI/2, 0, 0]}
        sensor
      />
      
      {/* Rear Right (센서 전환) */}
      <CylinderCollider
        args={[0.125, 0.3]}
        position={[-0.7, 0.34, -0.6]}
        rotation={[Math.PI/2, 0, 0]}
        sensor
      />
      {/* 시각 모델 - y = 0.5 위치 */}
      <Car color={color} name={name} position={[0,0.5,0]} />
    </RigidBody>
  )
})

PhysicsCar.displayName = 'PhysicsCar'
export default PhysicsCar
