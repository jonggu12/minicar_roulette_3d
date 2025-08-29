import React, { forwardRef, useRef, useEffect, useCallback } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider, RapierRigidBody, CollisionEnterPayload, IntersectionEnterPayload, IntersectionExitPayload, useRapier } from '@react-three/rapier'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { useFrame } from '@react-three/fiber'
import { Vector3, Mesh } from 'three'
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
  // 보조 혼합 비율(수동 모드에서 PP yawRate와 혼합). 0=순수 수동, 1=순수 PP
  assistBlend?: number
  // autopilot 훅: 차량 상태→ { throttle(-1..1), yawRate(rad/s) 또는 steer(-1..1) }
  autopilot?: (state: {
    position: Vector3
    yaw: number
    velocity: Vector3
    speed: number
    dt: number
  }) => { throttle: number; yawRate?: number; steer?: number }
  // 동역학 트랙션 한계 계산용 마찰계수(μ)
  mu?: number
  enabledRotations?: [boolean, boolean, boolean]
  controlKeys?: {
    forward: string
    backward: string
    left: string
    right: string
    brake: string
  }
  onCollision?: (collisionData: CollisionData) => void
}

interface CollisionData {
  otherBody: RapierRigidBody
  impactStrength: number
  collisionDirection: Vector3
  relativeVelocity: Vector3
  contactPoint: Vector3
}

const PhysicsCar = forwardRef<RapierRigidBody, PhysicsCarProps>(({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  color = '#ff6b6b',
  name = 'Car',
  // Car.tsx(1.8 x 0.5 x 1.0 본체 기준) + 현재 콜라이더 밀도 합 ≈ 870~900kg
  mass = 880,
  // 드라이 아스팔트 타이어 계수에 가깝게 상향 (시뮬레이티브 접지감)
  friction = 1.1,
  // 커스텀 충돌 임펄스를 쓰므로 기본 반발은 0 유지
  restitution = 0,
  // 엔진/브레이크는 트랙/조향 제어와 균형
  engineForce = 2300,
  brakeForce = 6500,
  // 기준 최고속(체감 속도 낮춤): 12 -> 9
  maxSpeed = 12,
  steerStrength = 850,
  autoControl = false,
  assistBlend = 0.25,
  autopilot,
  mu = 0.7,
  enabledRotations,
  controlKeys = { forward: 'w', backward: 's', left: 'a', right: 'd', brake: ' ' },
  onCollision
}, ref) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const { world } = useRapier()
  const keys = useRef<Set<string>>(new Set())
  const ai = useRef({ t: 0 })
  const spawn = useRef<[number, number, number]>(position)
  
  // 충돌 감지를 위한 이전 속도 저장
  const prevVelocity = useRef<Vector3>(new Vector3())
  const collisionCooldown = useRef(0)
  const sideUnstickCooldown = useRef(0)
  const frontUnstickCooldown = useRef(0)
  const debugTimer = useRef(0)
  const frontHitMarkerRef = useRef<Mesh | null>(null)
  const frontSensorBlocked = useRef(false)
  // 전방 충돌 응답/회피 상태
  const wasFrontBlocked = useRef(false)
  const wallAvoidTimer = useRef(0)
  const wallAvoidSteerSign = useRef(0) // -1: 좌로 회피, +1: 우로 회피
  
  // 사용자 조작감 개선을 위한 상태
  const inputSmoothing = useRef({
    throttle: 0,      // 부드러운 가속/감속
    steer: 0,         // 부드러운 조향
  })
  
  // 충돌 이벤트 핸들러
  const handleCollisionEnter = useCallback((payload: CollisionEnterPayload) => {
    const body = (ref && 'current' in ref ? ref.current : rigidBodyRef.current)
    if (!body || !onCollision) return
    
    // 쿨다운 체크 (너무 빈번한 충돌 이벤트 방지)
    if (collisionCooldown.current > 0) return
    
    const otherBody = payload.other.rigidBody
    if (!otherBody) return
    
    // 현재 차량의 속도와 상대방의 속도
    const myVelocity = body.linvel()
    const otherVelocity = otherBody.linvel()
    
    // 상대 속도 계산
    const relativeVelocity = new Vector3(
      myVelocity.x - otherVelocity.x,
      myVelocity.y - otherVelocity.y,
      myVelocity.z - otherVelocity.z
    )
    
    // 충돌 강도 계산 (속도 기반)
    const impactStrength = relativeVelocity.length()
    
    // 최소 충돌 강도 필터 (너무 약한 충돌은 무시)
    if (impactStrength < 1.0) return
    
    // 충돌 방향 계산
    const myPos = body.translation()
    const otherPos = otherBody.translation()
    const collisionDirection = new Vector3(
      myPos.x - otherPos.x,
      0, // Y축은 제외 (수평 충돌만 고려)
      myPos.z - otherPos.z
    ).normalize()
    
    // 접촉점 계산 (두 차량 중점)
    const contactPoint = new Vector3(
      (myPos.x + otherPos.x) / 2,
      (myPos.y + otherPos.y) / 2,
      (myPos.z + otherPos.z) / 2
    )
    
    // 충돌 데이터 생성
    const collisionData: CollisionData = {
      otherBody,
      impactStrength,
      collisionDirection,
      relativeVelocity,
      contactPoint
    }
    
    // ===== 공정한 충돌 반응 물리 적용 =====
    applyCollisionPhysics(body, otherBody, collisionData)
    
    // 콜백 호출 (선택적)
    if (onCollision) {
      onCollision(collisionData)
    }
    
    // 쿨다운 설정 (0.2초로 단축)
    collisionCooldown.current = 0.2
    
    // 간단한 디버그 로그
    console.log(`[충돌] ${name} - 강도: ${impactStrength.toFixed(1)}`)
  }, [name, onCollision, ref])

  // 충돌 반응 물리 계산 함수
  const applyCollisionPhysics = useCallback((
    myBody: RapierRigidBody, 
    otherBody: RapierRigidBody, 
    collisionData: CollisionData
  ) => {
    // 질량 가져오기
    const myMass = (myBody as any).mass ? (myBody as any).mass() : mass
    const otherMass = (otherBody as any).mass ? (otherBody as any).mass() : mass
    
    // 충돌 법선 벡터 (normalized)
    const normal = collisionData.collisionDirection
    
    // 상대 속도를 법선 방향으로 투영
    const relativeVelNormal = collisionData.relativeVelocity.dot(normal)
    
    // 이미 분리 중이면 충돌 반응 생략
    if (relativeVelNormal > 0) return
    
    // 반발 계수 - 모든 차량에 동일 적용 (공정성)
    const restitutionCoeff = 0.4
    
    // 충돌 임펄스 크기 계산 (운동량 보존)
    const impulseStrength = -(1 + restitutionCoeff) * relativeVelNormal / (1/myMass + 1/otherMass)
    
    // 임펄스 벡터
    const impulse = {
      x: normal.x * impulseStrength,
      y: 0, // 수평 충돌만 고려
      z: normal.z * impulseStrength
    }
    
    // 공정한 충돌 강도 제한 (모든 차량 동일)
    const maxImpulse = myMass * 12 // 최대 임펄스 제한 (약간 낮춤)
    const impulseLength = Math.sqrt(impulse.x * impulse.x + impulse.z * impulse.z)
    if (impulseLength > maxImpulse) {
      const scale = maxImpulse / impulseLength
      impulse.x *= scale
      impulse.z *= scale
    }
    
    // 내 차량에 임펄스 적용 (밀려나는 방향)
    myBody.applyImpulse(impulse, true)
    
    // 상대 차량에 반대 임펄스 적용 (뉴턴 3법칙)
    otherBody.applyImpulse({
      x: -impulse.x,
      y: 0,
      z: -impulse.z
    }, true)
    
    // 공정한 회전 임펄스 (모든 차량 동일 반응)
    const spinStrength = impulseLength * 0.05 // 스핀 강도 낮춤
    const crossProduct = normal.x * collisionData.relativeVelocity.z - normal.z * collisionData.relativeVelocity.x
    
    myBody.applyTorqueImpulse({
      x: 0,
      y: crossProduct > 0 ? spinStrength : -spinStrength,
      z: 0
    }, true)
    
    // 간단한 물리 로그 (선택적) - 개발 환경에서만
    if (import.meta.env?.DEV) {
      console.log(`[충돌 물리] 임펄스: ${impulseLength.toFixed(2)}, 질량비: ${(myMass/otherMass).toFixed(2)}`)
    }
  }, [mass])


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

  // === Control helpers ===
  const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  
  // 부호 보존 거듭제곱: t ∈ [-1,1] → sign(t) * |t|^γ  (t=0이면 0)
  const signPow = (t: number, gamma = 1.6) =>
    (t === 0 ? 0 : Math.sign(t) * Math.pow(Math.abs(t), gamma))

  // 데드존 유틸 (작은 떨림/크리핑 제거) - 더 큰 데드존으로 후진 방지
  const applyDeadzone = (x: number, dz = 0.06) => (Math.abs(x) < dz ? 0 : x)

  // 선형 보간 유틸
  const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t))

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
    // world is obtained from useRapier() at component top-level (Rules of Hooks)

    // 충돌 쿨다운 업데이트
    if (collisionCooldown.current > 0) {
      collisionCooldown.current -= delta
    }
    if (sideUnstickCooldown.current > 0) {
      sideUnstickCooldown.current -= delta
    }
    if (frontUnstickCooldown.current > 0) {
      frontUnstickCooldown.current -= delta
    }

    // 속도/각속도
    const lv = body.linvel(), av = body.angvel()

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

    // === 벽-사이드/정면 스턱 방지 보조 (레이캐스트) ===
    let rightBlocked = false, leftBlocked = false, frontBlockedRay = false
    let frontNear = false
    let minToi = Infinity
    try {
      const p = body.translation()
      // probe params
      const sideOffset = 0.7
      const probeUp = 0.4
      const reach = 0.35
      // 정면 감지: 차 앞단을 살짝 넘긴 위치에서 쏨(자기차 감지 방지)
      const reachFront = 1.2  // 레이 거리 (월까지)
      const reachFrontNear = 0.25
      // Right probe
      const oR = { x: p.x + tmp.right.x * sideOffset, y: p.y + probeUp, z: p.z + tmp.right.z * sideOffset }
      const rR = new RAPIER.Ray(oR, { x: tmp.right.x, y: 0, z: tmp.right.z })
      const hitR = world.castRay(rR, reach, true)
      rightBlocked = !!(hitR && (hitR as any).toi >= 0)
      // Left probe
      const oL = { x: p.x - tmp.right.x * sideOffset, y: p.y + probeUp, z: p.z - tmp.right.z * sideOffset }
      const rL = new RAPIER.Ray(oL, { x: -tmp.right.x, y: 0, z: -tmp.right.z })
      const hitL = world.castRay(rL, reach, true)
      leftBlocked = !!(hitL && (hitL as any).toi >= 0)
      // Front probes (center/left/right) for better detection on angles
      const frontStart = 1.05 // start ahead of car to avoid self-hit
      const oCenter = { x: p.x + tmp.forward.x * frontStart, y: p.y + probeUp, z: p.z + tmp.forward.z * frontStart }
      const oLeft   = { x: oCenter.x - tmp.right.x * 0.35,    y: oCenter.y,     z: oCenter.z - tmp.right.z * 0.35 }
      const oRight  = { x: oCenter.x + tmp.right.x * 0.35,    y: oCenter.y,     z: oCenter.z + tmp.right.z * 0.35 }
      const hC = world.castRay(new RAPIER.Ray(oCenter, { x: tmp.forward.x, y: 0, z: tmp.forward.z }), reachFront, true) as any
      const hL = world.castRay(new RAPIER.Ray(oLeft,   { x: tmp.forward.x, y: 0, z: tmp.forward.z }), reachFront, true) as any
      const hR = world.castRay(new RAPIER.Ray(oRight,  { x: tmp.forward.x, y: 0, z: tmp.forward.z }), reachFront, true) as any
      if (hC && hC.toi >= 0) { frontBlockedRay = true; minToi = Math.min(minToi, hC.toi) }
      if (hL && hL.toi >= 0) { frontBlockedRay = true; minToi = Math.min(minToi, hL.toi) }
      if (hR && hR.toi >= 0) { frontBlockedRay = true; minToi = Math.min(minToi, hR.toi) }
      // 좌/우 근접성 비교를 위한 toi 수집
      const leftToi = (hL && hL.toi >= 0) ? hL.toi : Infinity
      const rightToi = (hR && hR.toi >= 0) ? hR.toi : Infinity
      if (frontBlockedRay) {
        const hitX = oCenter.x + tmp.forward.x * minToi
        const hitY = oCenter.y
        const hitZ = oCenter.z + tmp.forward.z * minToi
        if (frontHitMarkerRef.current) {
          frontHitMarkerRef.current.visible = true
          frontHitMarkerRef.current.position.set(hitX, hitY, hitZ)
        }
      } else {
        if (frontHitMarkerRef.current) frontHitMarkerRef.current.visible = false
      }
    } catch {}

    // 1) 정면 감지 결과 집계(frontBlocked, frontNear)
    const frontBlocked = frontBlockedRay || frontSensorBlocked.current
    // 센서가 true면 실제 접촉 상태로 간주하여 near도 true
    const nearThreshold = 0.25
    frontNear = frontSensorBlocked.current || (frontBlockedRay && minToi <= nearThreshold)

    // 전방 차단 신규 진입 시: 즉시 튕겨내기 + 회피 방향 설정
    if (frontBlocked && frontNear && !wasFrontBlocked.current) {
      const m = (body as any).mass ? (body as any).mass() : 800
      const lvNow = body.linvel()
      tmp.v2.set(lvNow.x, 0, lvNow.z)
      const forwardSpeed = tmp.v2.dot(tmp.forward)
      // 벽을 향해 진입 중일 때만 튕김
      if (forwardSpeed > 0.05) {
        const J = m * 1.0
        body.applyImpulse({ x: -tmp.forward.x * J, y: 0, z: -tmp.forward.z * J }, true)
      }
      // 레이 캐스트 좌/우 toi 기반 회피 조향 방향 설정 (가까운 쪽을 피함)
      // leftToi/rightToi는 위 블록 스코프이므로 frontBlocked 시 재계산 필요할 수 있으나
      // minToi 업데이트 시점과 동일 프레임이므로, 가까운 측면 센서로 대체
      if (leftBlocked !== rightBlocked) {
        wallAvoidSteerSign.current = rightBlocked ? -1 : 1
      } else {
        // 둘 다 막히지 않았거나 둘 다 막혔으면 약하게 무작위/우선 오른쪽
        wallAvoidSteerSign.current = 1
      }
      wallAvoidTimer.current = 0.6
      wasFrontBlocked.current = true
    } else if (!frontBlocked) {
      wasFrontBlocked.current = false
    }

    // 디버그 로그: 0.3초 간격으로 전방 차단 상태 출력 (3-ray + sensor)
    debugTimer.current += delta
    if (debugTimer.current > 0.3) {
      const speedForward = tmp.v2.dot(tmp.forward)
      console.log(`[FrontDetect] ray=${frontBlockedRay}, sensor=${frontSensorBlocked.current}, near=${frontNear}, speedF=${speedForward.toFixed(3)}, speed=${speed.toFixed(3)}`)
      debugTimer.current = 0
    }

    // 2) 전진 속도 성분 강제 제거 (엔진력 계산 전에 적용)
    if (frontBlocked && frontNear) {
      const speedForward = tmp.v2.dot(tmp.forward)
      if (speedForward > 0.01) {
        const newVx = lv.x - tmp.forward.x * speedForward
        const newVz = lv.z - tmp.forward.z * speedForward
        body.setLinvel({ x: newVx, y: lv.y, z: newVz }, true)
        // 보정 후 내부 상태도 업데이트하여 일관성 유지
        tmp.v2.set(newVx, 0, newVz)
      }
    }
    
    // === 개선된 입력 처리 시스템 ===
    let targetThrottle = 0
    let targetSteer = 0
    
    // 키 입력 상태 (전체 스코프에서 사용)
    const f = keys.current.has(controlKeys.forward) || keys.current.has('arrowup')
    const b = keys.current.has(controlKeys.backward) || keys.current.has('arrowdown')
    const l = keys.current.has(controlKeys.left)    || keys.current.has('arrowleft')
    const r = keys.current.has(controlKeys.right)   || keys.current.has('arrowright')
    const br = keys.current.has(controlKeys.brake)
    
    // 정지 스냅(anti-creep): 키가 없음 + 아주 느린 속도면 속도를 딱 0으로 고정 - 더 큰 임계값
    const vPlanarLen = tmp.v2.length()
    if (!f && !b && !br && vPlanarLen < 0.08) {
      body.setLinvel({ x: 0, y: lv.y, z: 0 }, true)   // 수직속도는 유지
      if (Math.abs(av.y) < 0.08) body.setAngvel({ x: av.x, y: 0, z: av.z }, true)
    }
    
    if (autoControl) {
      ai.current.t += delta
      // 외부 autopilot 훅이 있으면 사용
      if (autopilot) {
        const t = body.translation()
        const q = body.rotation()
        // yaw 추출 (Forward +X, Right +Z, Up +Y)
        // 표준 ZYX(roll-pitch-yaw)에서 yaw(=around Y)
        const t3 = 2.0 * (q.w * q.y + q.x * q.z)
        const t4 = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        const yaw = Math.atan2(t3, t4)
        const cmd = autopilot({
          position: new Vector3(t.x, t.y, t.z),
          yaw,
          velocity: new Vector3(tmp.v2.x, 0, tmp.v2.z),
          speed,
          dt: delta,
        })
        targetThrottle = Math.max(-1, Math.min(1, cmd.throttle))
        // autopilot이 yawRate를 줄 경우 이후 요 제어에서 직접 사용하도록 저장
        ;(ai.current as any)._yawRateCmd = typeof cmd.yawRate === 'number' ? cmd.yawRate : null
        ;(ai.current as any)._steerCmd = typeof cmd.steer === 'number' ? cmd.steer : null
      } else {
        // 기본 자동 제어(유지)
        targetThrottle = 0.3
        targetSteer = 0
        ;(ai.current as any)._yawRateCmd = null
        ;(ai.current as any)._steerCmd = null
      }
    } else {
      // 수동 모드에서도 보조용 yawRate 산출(있으면 혼합)
      if (autopilot) {
        const t = body.translation()
        const q = body.rotation()
        const t3 = 2.0 * (q.w * q.y + q.x * q.z)
        const t4 = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        const yaw = Math.atan2(t3, t4)
        const cmdA = autopilot({
          position: new Vector3(t.x, t.y, t.z),
          yaw,
          velocity: new Vector3(tmp.v2.x, 0, tmp.v2.z),
          speed,
          dt: delta,
        })
        ;(ai.current as any)._assistYawRate = typeof cmdA.yawRate === 'number' ? cmdA.yawRate : null
      } else {
        ;(ai.current as any)._assistYawRate = null
      }
      
      // 1) 원시 스로틀 커맨드 (-1..1)
      const rawThrottleCmd = (f ? 1 : 0) + (b ? -1 : 0)

      // 2) 스무딩(램프): 올릴 때는 적당히, 뗄 땐 빠르게 - 더 부드러운 가속
      const up = 4.5, down = 15.0
      const targetThrottleSmooth = rawThrottleCmd
      const prev = inputSmoothing.current.throttle
      const speedK = (targetThrottleSmooth > prev ? up : down) * delta
      inputSmoothing.current.throttle = clamp(lerp(prev, targetThrottleSmooth, speedK), -1, 1)

      // 3) 데드존 + 부호 보존 커브 (0→0 보장, 저속 토크 억제)
      let throttleProcessed = applyDeadzone(inputSmoothing.current.throttle, 0.04)
      throttleProcessed = signPow(throttleProcessed, 1.6)  // 1.6~1.8 사이 취향 조절
      targetThrottle = throttleProcessed

      // 사용자가 W만 누르면 추진력은 절대 음수가 되지 않도록
      if (f && !b && targetThrottle < 0) targetThrottle = 0
      if (b && !f && targetThrottle > 0) targetThrottle = 0

      // 3) 정면 차단 시 입력 스냅: 전진 차단, 후진 가속 빠르게 스냅
      const frontBlockedSnap = frontBlocked
      if (frontBlockedSnap) {
        if (f && !b) {
          // 전진 출력 차단
          targetThrottle = Math.min(0, targetThrottle)
        } else if (b) {
          // 후진은 스무딩 무시하고 빠르게 스냅
          const snapSpeed = 35 // 더 빠른 램프업
          inputSmoothing.current.throttle = lerp(prev, -1, Math.min(1, delta * snapSpeed))
          targetThrottle = -1
          if (import.meta.env?.DEV) console.log('[ReverseSnap] throttle -> -1 (frontBlocked)')
        }
      }
      
      // 2. 속도 기반 조향 민감도 - 더 부드러운 조향
      const baseSteering = (l ? -1 : 0) + (r ? 1 : 0)
      const steerDeadzone = 0.05
      const speedRatio = clamp(speed / maxSpeed, 0, 1)
      // 고속일수록 훨씬 둔감해지도록 (제곱 곡선)
      const steerSensitivity = clamp(1 - Math.pow(speedRatio, 1.5), 0.2, 1)
      const processedSteering = Math.abs(baseSteering) < steerDeadzone ? 0 : baseSteering
      // 저속에서 유턴 억제를 위해 추가 스케일: 0m/s에서 0.65, 2m/s에서 0.9, 그 이상 1.0
      const lowSpeedSteerScale = 0.65 + 0.35 * clamp(speed / 2.0, 0, 1)
      targetSteer = processedSteering * steerSensitivity * lowSpeedSteerScale
      
    }
    
    // 부드러운 입력 스무딩 (조향만)
    const smoothSpeed = {
      steer: 12.0,    // 조향 반응속도 증가  
    }
    
    // throttle은 이미 위에서 처리됨
    inputSmoothing.current.steer = lerp(inputSmoothing.current.steer, targetSteer, delta * smoothSpeed.steer)
    
    // 최종 입력값 적용
    const throttle = targetThrottle  // 이미 곡선/스냅 처리됨
    const steer = inputSmoothing.current.steer

    // ===== 추진/제동 시스템 =====
    const m = (body as any).mass ? (body as any).mass() : 800
    const maxTraction = m * 9.81 * mu // μ·N 기반 트랙션 한계(보수적)

    // 추진력 (엔진)
    // 3) 정면 차단 시 전진 출력 차단
    let driveThrottle = throttle
    if (frontBlocked && driveThrottle > 0) driveThrottle = 0
    // 전방 차단 시, 입력 여부와 무관하게 강한 자동 후진 보조
    if (frontBlocked && frontNear) {
      const targetNeg = b ? -1 : -0.7
      driveThrottle = Math.min(driveThrottle, targetNeg)
    }
    // 후진 부스트: 정면 차단 + 후진 입력 시 초기 탈출력 강화 (상향)
    let reverseBoost = frontBlocked && b && driveThrottle < 0
    // autopilot의 음수 스로틀은 제동으로 해석(후진 의도 제외)
    if (autoControl && driveThrottle < 0 && speed > 0.2) {
      const vdir = tmp.v2.clone().normalize()
      const brakeMag = Math.min(brakeForce * Math.abs(driveThrottle), maxTraction)
      body.addForce({ x: -vdir.x * brakeMag, y: 0, z: -vdir.z * brakeMag }, true)
    }
    let driveForce = engineForce * (reverseBoost ? driveThrottle * 1.6 : driveThrottle)
    driveForce = Math.max(-maxTraction, Math.min(maxTraction, driveForce))

    // 전진 방향으로 추진력 적용
    const forwardForce = {
      x: tmp.forward.x * driveForce,
      y: 0,
      z: tmp.forward.z * driveForce
    }
    // 저속·대조향 시 제자리 스핀 방지: 조향 강도에 따라 엔진 출력 소폭 감소(저속에서 더 큼)
    const steerLoad = Math.abs(steer)
    const speedSteerRatio = clamp(speed / 6, 0, 1)
    // 조향 중 저속 스핀 억제: 저속+대조향에서 엔진 출력 더 줄임
    const driveSteerScale = clamp(1 - 0.5 * steerLoad * (1 - speedSteerRatio), 0.5, 1)
    // 후진 시에는 출력 감쇠를 적용하지 않아 초기 탈출을 돕는다
    if (driveThrottle > 0) {
      forwardForce.x *= driveSteerScale
      forwardForce.z *= driveSteerScale
    }
    body.addForce(forwardForce, true)

    // === 사이드 스턱 탈출 보조 ===
    if (!frontBlocked && sideUnstickCooldown.current <= 0 && throttle > 0 && speed < 1.2 && (leftBlocked || rightBlocked)) {
      // 벽 반대 방향으로 측면 밀어내기 + 약간의 전진 보조
      const lateralDir = rightBlocked && !leftBlocked ? -1 : (leftBlocked && !rightBlocked ? 1 : 0)
      if (lateralDir !== 0) {
        const lateralFx = m * 12 * lateralDir
        const forwardFx = m * 4
        body.addForce({ x: tmp.right.x * lateralFx + tmp.forward.x * forwardFx, y: 0, z: tmp.right.z * lateralFx + tmp.forward.z * forwardFx }, true)
        // 탈출 보조는 짧은 쿨다운
        sideUnstickCooldown.current = 0.25
      }
    }

    // 제동력: 현재 속도 벡터 반대방향 (절대 전/후 뒤집지 않음)
    const vPlanar = tmp.v2 // 평면 속도 벡터
    
    // 브레이크 키 또는 코스팅 상태에서 제동  
    const wantBrake = br || (!f && !b) // 브레이크 키 또는 키를 놓음
    let autoBrakeGain = 0
    
    if (wantBrake && !frontBlocked && vPlanarLen > 0.08) {
      // 수동 브레이크는 강하게, 코스팅시는 더 약하게 - 후진 방지
      autoBrakeGain = br ? 1.0 : 0.15
      const vdir = vPlanar.clone().normalize()
      const brakeMag = Math.min(brakeForce * autoBrakeGain, maxTraction)
      body.addForce({ x: -vdir.x * brakeMag, y: 0, z: -vdir.z * brakeMag }, true)
    }

    // 저속·대조향 보조 브레이크: 유턴 시 과회전 억제를 위해 소량의 감속
    if (!wantBrake && f && Math.abs(steer) > 0.6 && speed > 0.05 && speed < 1.2) {
      const vdir = vPlanar.clone().normalize()
      const assist = Math.min(m * 5.0, maxTraction * 0.25)
      body.addForce({ x: -vdir.x * assist, y: 0, z: -vdir.z * assist }, true)
    }

    // 4) 초기 후진 임펄스 (정지에 가까울 때 1회성) - 입력 없이도 동작
    if (frontBlocked && speed < 0.5 && frontUnstickCooldown.current <= 0) {
      const J = m * 1.3
      body.applyImpulse({ x: -tmp.forward.x * J, y: 0, z: -tmp.forward.z * J }, true)
      frontUnstickCooldown.current = 0.3
      if (import.meta.env?.DEV) console.log('[ReverseImpulse] J=', J.toFixed(1))
    }

    // 전방 회피 타이머 동안 조향 보조: 벽에서 살짝 튕겨나오며 방향 찾기 느낌
    if (wallAvoidTimer.current > 0) {
      const steerAssist = 0.7 * wallAvoidSteerSign.current
      // 사용자 입력과 블렌딩하여 자연스럽게 회복
      inputSmoothing.current.steer = lerp(inputSmoothing.current.steer, steerAssist, delta * 10)
      wallAvoidTimer.current -= delta
    }
    
    // ===== 측면 미끄러짐 방지 =====
    // 차량의 오른쪽 방향 벡터
    tmp.right.set(0, 0, 1).applyQuaternion(q).normalize()
    
    // 측면 속도 계산
    const lateralVelocity = tmp.v2.dot(tmp.right)
    
    // 측면 미끄러짐이 있으면 반대 힘 적용 (완화됨)
    if (Math.abs(lateralVelocity) > 0.15) {
      // 저속·대조향에서 횡저항을 가중해 유턴 시 스핀 억제
      const steerLoadAbs = Math.abs(steer)
      const lowSpeedFactor = 1 - clamp(speed / 6, 0, 1)
      const lateralGain = 0.9 + 1.0 * steerLoadAbs * lowSpeedFactor
      const lateralDrag = -lateralVelocity * m * lateralGain
      const lateralForce = {
        x: tmp.right.x * lateralDrag,
        y: 0,
        z: tmp.right.z * lateralDrag
      }
      body.addForce(lateralForce, true)
    }
    
    // ===== 개선된 조향 시스템 =====
    // 속도 기반 조향 스케일링 (더 부드럽고 반응적으로)
    const maxSteerSpeed = 8
    // 목표 요레이트 기반 P-제어로 조향 토크를 제한: 저속/정지에서 과토크 방지
    const minSteerSpeed = 0.9
    const speedRatioSteer = clamp((speed - minSteerSpeed) / maxSteerSpeed, 0, 1)
    const yawRateMax = 1.7 // rad/s, 요레이트 상한
    // autopilot이 yawRate 명시 시 이를 우선, 아니면 기존 steer 기반
    const yawRateCmd = (ai.current as any)._yawRateCmd
    const steerCmdAI = (ai.current as any)._steerCmd
    const assistYaw = (ai.current as any)._assistYawRate
    const hasAssist = !autoControl && typeof assistYaw === 'number' && isFinite(assistYaw as number)
    const hasYawCmd = typeof yawRateCmd === 'number' && isFinite(yawRateCmd as number)
    let targetYaw: number
    if (typeof yawRateCmd === 'number') {
      targetYaw = Math.max(-yawRateMax, Math.min(yawRateMax, yawRateCmd))
    } else if (typeof steerCmdAI === 'number') {
      targetYaw = steerCmdAI * yawRateMax * speedRatioSteer
    } else {
      // 수동 기반
      const manualYaw = steer * yawRateMax * (autoControl ? speedRatioSteer : Math.max(0.35, speedRatioSteer))
      if (hasAssist) {
        const a = Math.max(0, Math.min(1, assistBlend))
        const assistClamped = Math.max(-yawRateMax, Math.min(yawRateMax, assistYaw as number))
        targetYaw = (1 - a) * manualYaw + a * assistClamped
      } else {
        targetYaw = manualYaw
      }
    }
    // 작은 명령은 무시해 직진 안정화(데드밴드) - PP는 더 민감하게
    const deadband = hasYawCmd ? 0.01 : 0.03
    if (Math.abs(targetYaw) < deadband) targetYaw = 0
    const yawErr = targetYaw - av.y
    // 질량 스케일 보정: 무거울수록 더 큰 토크 필요 → 게인/캡을 질량비로 스케일
    const baseMass = 800
    const massRatio = m / baseMass
    let yawGain = 650 * (0.6 + 0.4 * speedRatioSteer) * massRatio
    // PP 저속 턴인 보정: hasYawCmd && 저속에서 게인 소폭 증대
    if (hasYawCmd && speed < 1.0) yawGain *= 1.3
    // P 제어(부호 교정)
    let pTerm = yawErr * yawGain
    // 선택적 AI 디버그: autopilot 요레이트 명령과 실제 비교
    const AI_DEBUG = false
    if (AI_DEBUG && (import.meta as any)?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.log('[AI Yaw]', {
        cmd: yawRateCmd,
        target: targetYaw.toFixed(3),
        avY: av.y.toFixed(3),
        err: yawErr.toFixed(3),
        gain: yawGain.toFixed(1),
        torqueY: torqueY.toFixed(1)
      })
    }
    // 소량의 요 감쇠(D) 추가해 오버슈트 방지
    const dampingGain = 420 * (0.7 + 0.3 * speedRatioSteer) * massRatio
    const dTerm = -av.y * dampingGain

    // 속도 페이드인: 저속에서 P 토크를 완만히 키움(피벗 회전 방지)
    const fadeLow = 0.2, fadeHigh = 1.0
    let yawFade = clamp((speed - fadeLow) / (fadeHigh - fadeLow), 0, 1)
    // 전진 성분 게이트: 전진 속도 성분이 작으면 P 토크를 더 줄임
    const speedForward = tmp.v2.dot(tmp.forward)
    let forwardGate = 1.0
    if (speedForward <= 0) forwardGate = 0.3
    else if (speedForward < 0.2) forwardGate = 0.35
    else if (speedForward < 0.5) forwardGate = 0.7
    // PP는 정지/저속에서도 회전력 확보를 위해 하한 보장
    if (hasYawCmd) {
      yawFade = Math.max(yawFade, 0.6)
      forwardGate = Math.max(forwardGate, 0.6)
    }

    pTerm *= yawFade * forwardGate
    let torqueY = pTerm + dTerm
    // 토크 캡: 차량별 일관성 유지를 위해 상한 적용(질량 비례)
    const torqueCap = steerStrength * 0.7 * massRatio
    torqueY = Math.max(-torqueCap, Math.min(torqueCap, torqueY))

    // 조향 조건: autopilot의 yawRate 명령이 있거나 사용자 steer 입력이 있으면 토크 적용
    // throttle 유무와 무관하게 조향 가능하도록 수정
    const hasThrottle = Math.abs(targetThrottle) > 0.05
    const wantYaw = hasYawCmd || Math.abs(steer) > 0.01
    // 수동 모드에서는 속도 문턱 없이 조향 토크 허용
    if (wantYaw && (hasYawCmd || (!autoControl || speed > minSteerSpeed)) && Math.abs(torqueY) > 1e-3) {
      body.addTorque({ x: 0, y: torqueY, z: 0 }, true)
    } else if (Math.abs(av.y) > 0.02) {
      const dampingOnly = -av.y * (dampingGain * 1.0)
      body.addTorque({ x: 0, y: dampingOnly, z: 0 }, true)
    }

    // ESC 스타일: 요레이트 하드 리미터로 과회전 방지 (유턴 안정화)
    const yawLimit = yawRateMax * 1.0
    if (Math.abs(av.y) > yawLimit) {
      const excess = av.y - Math.sign(av.y) * yawLimit
      const escTorque = -excess * (800 * massRatio)
      body.addTorque({ x: 0, y: escTorque, z: 0 }, true)
    }

    // 5) 항력+구름저항 + 다운포스 (maxSpeed 정규화)
    if (speed > 0.01) {
      tmp.vdir.copy(tmp.v2).normalize()
      // 기준 속도(디폴트 maxSpeed=12)를 기준으로 정규화하여 튜닝 변경 시 감각 유지
      const baseMax = 12
      const ms = Math.max(1, maxSpeed)
      const scaleQ = (baseMax / ms) * (baseMax / ms) // v^2 항목 스케일
      const scaleL = (baseMax / ms)                  // v 항목 스케일
      const dragKBase = 0.22, rollKBase = 7, downKBase = 0.2
      const dragK = dragKBase * scaleQ
      const rollK = rollKBase * scaleL
      const downK = downKBase * scaleQ
      const Fx = dragK * speed * speed + rollK * speed
      body.addForce({ x: -tmp.vdir.x * Fx, y: 0, z: -tmp.vdir.z * Fx }, true)
      body.addForce({ x: 0, y: -downK * speed * speed, z: 0 }, true)
    }

    // 6) 안정화: 수직 속도 캡 (롤/피치 보정은 enabledRotations로 잠금 처리)
    if (Math.abs(lv.y) > 16) {
      body.setLinvel({ x: lv.x, y: Math.sign(lv.y) * 16, z: lv.z }, true)
    }

    // 7) 속도 하드캡
    // 하드캡을 타이트하게 조정하여 최고속 근처에서 과도한 가속 억제
    const hardMax = maxSpeed * 1.05
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
      type="dynamic"
      enabledRotations={enabledRotations ?? [false, true, false]} // 기본: Y축만 회전
      linearDamping={0.25}
      angularDamping={4.0}
      canSleep={false}
      colliders={false}
      ccd // CCD 활성화로 관통 방지
      onCollisionEnter={handleCollisionEnter}
      >
      {/* 디버그: 전방 레이 히트 지점 시각화 (빨간 점) */}
      <mesh ref={frontHitMarkerRef as any} visible={false}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>
      {/* 전방 범퍼 센서: 고정 벽 감지용 (ray 보완) */}
      <CuboidCollider
        args={[0.08, 0.3, 0.45]}
        position={[0.98, 0.6, 0]}
        sensor
        onIntersectionEnter={(e: IntersectionEnterPayload) => {
          const rb = e.other.rigidBody
          // 고정체(벽/트랙)만 frontBlocked로 인정
          if (rb && rb.isFixed && rb.isFixed()) frontSensorBlocked.current = true
        }}
        onIntersectionExit={(e: IntersectionExitPayload) => {
          const rb = e.other.rigidBody
          if (rb && rb.isFixed && rb.isFixed()) frontSensorBlocked.current = false
        }}
      />
      {/* 메인 차체(중간) - 현실적인 질량을 위해 밀도 상향 */}
      <CuboidCollider
        args={[0.9, 0.25, 0.5]}
        position={[0, 0.78, 0]}
        density={800} // ≈720 kg
        friction={1.0}
        restitution={0}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
      />

      {/* 루프(경량) */}
      <CuboidCollider
        args={[0.6, 0.15, 0.35]}
        position={[0, 1.28, 0]}
        density={200} // ≈50 kg
        friction={0.7}
        restitution={0}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
      />

      {/* 하부 스키드(접지 담당, 가장 낮은 지점) */}
      <CuboidCollider
        args={[0.8, 0.1, 0.4]}
        position={[0, 0.15, 0]} // 바닥까지 ≈0.05
        density={400} // ≈100 kg
        friction={1.25}
        restitution={0}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
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
      <Car 
        color={color} 
        name={name} 
        position={[0,0.5,0]} 
      />
    </RigidBody>
  )
})

PhysicsCar.displayName = 'PhysicsCar'
export default PhysicsCar
