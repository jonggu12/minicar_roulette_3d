import * as THREE from 'three'
import { TrackWaypointSystem } from './waypointSystem'
// 최소 인터페이스: PP가 필요로 하는 메서드/필드만 정의
export type WaypointLike = { position: THREE.Vector3; targetSpeed: number; distanceToNext: number }
export type WaypointProvider = {
  getWaypoints(): WaypointLike[]
  getWaypointsInRange(position: THREE.Vector3, range: number): WaypointLike[]
}

export type PPParams = {
  L: number            // 축거(가상 자전거 모델)
  L0: number           // 기본 룩어헤드
  kV: number           // 속도당 룩어헤드 증가 계수
  LdMin: number        // 룩어헤드 하한
  LdMax: number        // 룩어헤드 상한
  rMax: number         // 요레이트 상한(rad/s)
  rRate: number        // 요레이트 레이트 리밋(rad/s^2)
  mu: number           // 마찰계수(트랙션 한계 계산용)
  g: number            // 중력가속도
}

export type AutoState = {
  pos: THREE.Vector3
  yaw: number
  vel: THREE.Vector3
  speed: number
  dt: number
}

export type AutoCmd = {
  throttle: number   // -1..1 (양수 가속, 음수 제동/후진)
  yawRate: number    // 목표 요레이트(rad/s)
}

function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)) }
function wrapAngle(a: number) { while (a> Math.PI) a -= 2*Math.PI; while (a<=-Math.PI) a += 2*Math.PI; return a }

// 최근접 웨이포인트에서 지정 거리만큼 앞선 위치(선형 보간) 추정
export function getLookaheadPoint(system: WaypointProvider, from: THREE.Vector3, Ld: number): THREE.Vector3 {
  const waypoints = system.getWaypoints()
  if (waypoints.length === 0) return from.clone()
  // 최근접 인덱스 검색
  let idx = 0
  let bestD = from.distanceTo(waypoints[0].position)
  for (let i=1;i<waypoints.length;i++){
    const d = from.distanceTo(waypoints[i].position)
    if (d < bestD){ bestD = d; idx = i }
  }
  // 앞으로 누적
  let remaining = Ld
  let cur = idx
  while (remaining > 0) {
    const next = (cur + 1) % waypoints.length
    const segLen = waypoints[cur].distanceToNext
    if (segLen <= 1e-4) { cur = next; continue }
    if (remaining <= segLen) {
      const t = remaining / segLen
      return waypoints[cur].position.clone().lerp(waypoints[next].position, t)
    }
    remaining -= segLen
    cur = next
  }
  return waypoints[cur].position.clone()
}

export function getYawFromQuaternion(q: {x:number,y:number,z:number,w:number}): number {
  // 좌표계: Forward +X, Right +Z, Up +Y (three.js 기본)
  // 표준 ZYX(roll-pitch-yaw)에서 yaw(=around Y) 추출식
  const t3 = 2.0 * (q.w * q.y + q.x * q.z)
  const t4 = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
  return Math.atan2(t3, t4)
}

// 내부 유틸: 최근접 인덱스 찾기
function findNearestIndex(system: WaypointProvider, from: THREE.Vector3): number {
  const wps = system.getWaypoints()
  if (wps.length === 0) return -1
  let best = 0, bestD = from.distanceTo(wps[0].position)
  for (let i=1;i<wps.length;i++){
    const d = from.distanceTo(wps[i].position)
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

export function purePursuitController(
  system: WaypointProvider,
  state: AutoState,
  prev: { yawRate: number; vTarget?: number },
  params: PPParams
): AutoCmd {
  const { L, L0, kV, LdMin, LdMax, rMax, rRate, mu, g } = params
  const v = state.speed
  let Ld = clamp(L0 + kV * Math.abs(v), LdMin, LdMax)
  // 1차 추정으로 alpha/kappa 계산 후, 코너 적응형 룩어헤드로 보정한 뒤 다시 계산
  let look = getLookaheadPoint(system, state.pos, Ld)
  let to = new THREE.Vector2(look.x - state.pos.x, look.z - state.pos.z)
  // X-forward 기준: yaw=0 → +X, yaw 증가 → +Z 방향
  let alpha = wrapAngle(Math.atan2(to.y, to.x) - state.yaw)
  // 알파 데드밴드(속도 의존): 직선에서 소각 진동 억제(더 민감)
  const alphaDbDeg = THREE.MathUtils.lerp(0.8, 0.5, THREE.MathUtils.clamp(Math.abs(v)/12, 0, 1))
  const alphaDb = THREE.MathUtils.degToRad(alphaDbDeg)
  if (Math.abs(alpha) < alphaDb) alpha = 0
  // 자전거 모델 곡률
  let kappa = (2 * Math.sin(alpha)) / Math.max(1e-3, Ld)
  // 코너 적응형 룩어헤드: 곡률이 큰 구간에서는 룩어헤드를 줄여 턴-인 강화
  const cLd = 0.5
  const LdEff = Ld / (1 + cLd * Math.abs(kappa))
  if (Math.abs(LdEff - Ld) > 1e-3) {
    Ld = THREE.MathUtils.clamp(LdEff, LdMin, LdMax)
    look = getLookaheadPoint(system, state.pos, Ld)
    to = new THREE.Vector2(look.x - state.pos.x, look.z - state.pos.z)
    alpha = wrapAngle(Math.atan2(to.y, to.x) - state.yaw)
    kappa = (2 * Math.sin(alpha)) / Math.max(1e-3, Ld)
  }
  // 크로스트랙 보정: 최근접 세그먼트의 좌측 기준 횡오차(eY)
  let eY = 0
  const wpsLocal = system.getWaypoints()
  if (wpsLocal.length >= 2) {
    const idxN = findNearestIndex(system, state.pos)
    if (idxN >= 0) {
      const j = (idxN + 1) % wpsLocal.length
      const p0 = wpsLocal[idxN].position
      const p1 = wpsLocal[j].position
      const seg = new THREE.Vector2(p1.x - p0.x, p1.z - p0.z)
      if (seg.lengthSq() > 1e-6) {
        seg.normalize()
        const nL = new THREE.Vector2(-seg.y, seg.x) // left normal
        const rel = new THREE.Vector2(state.pos.x - p0.x, state.pos.z - p0.z)
        eY = rel.dot(nL)
      }
    }
  }
  const kEy = 0.22
  const rCrosstrack = kEy * (eY / Math.max(1, Math.abs(v)))
  // 요레이트 목표(속도 * 곡률) - 좌표계 정합을 위해 부호 반전 + 횡오차 보정
  const rCmdRaw = -v * kappa + rCrosstrack
  // 저역통과로 급격한 변화 완화 (속도 의존)
  const rPrev = prev.yawRate
  const beta = THREE.MathUtils.clamp(0.35 + 0.35 * (Math.abs(v)/12), 0.35, 0.7)
  let rCmd = rPrev + beta * (rCmdRaw - rPrev)
  // 마찰 타원 근사: ay가 한계에 접근할수록 rCmd 축소 (ay = v^2 * |kappa|)
  const ay = Math.abs(v) * Math.abs(v) * Math.abs(kappa)
  const ayMax = mu * g
  if (ayMax > 1e-6) {
    const ratio = Math.min(0.999, ay / ayMax)
    const scale = Math.sqrt(Math.max(0, 1 - ratio * ratio))
    rCmd *= scale
  }
  // 횡가속 한계 기반의 속도 상한 보정: ay = v^2 * |kappa| <= mu*g
  if (Math.abs(kappa) > 1e-5) {
    const vMaxK = Math.sqrt(ayMax / Math.max(1e-6, Math.abs(kappa)))
    if (v > vMaxK) {
      // 너무 빠르면 요레이트도 상한에 걸리므로 rCmd를 줄임
      rCmd = Math.sign(rCmd) * vMaxK * Math.abs(kappa)
    }
  }
  // 레이트 리밋
  const rStep = rRate * state.dt
  rCmd = clamp(rCmd, rPrev - rStep, rPrev + rStep)
  rCmd = clamp(rCmd, -rMax, rMax)

  // 선택적 디버그 로깅 (개발 모드에서 PP_DEBUG 토글)
  const PP_DEBUG = false
  if (PP_DEBUG && (import.meta as any)?.env?.DEV) {
    // 간단한 각도/속도 출력
    // eslint-disable-next-line no-console
    console.log('PP Debug', {
      carPos: `(${state.pos.x.toFixed(1)}, ${state.pos.z.toFixed(1)})`,
      lookAhead: `(${look.x.toFixed(1)}, ${look.z.toFixed(1)})`,
      yawDeg: (state.yaw * 180/Math.PI).toFixed(1),
      alphaDeg: (alpha * 180/Math.PI).toFixed(1),
      kappa: kappa.toFixed(4),
      yawRate: rCmd.toFixed(3),
    })
  }

  // 1) 프리뷰 기반 속도 계획(시간 도메인): 앞으로 previewTime 구간의 최소 targetSpeed 사용
  const all = system.getWaypoints()
  let vWp = 8
  let tToMin = 1.2
  if (all.length > 0) {
    // 프리뷰 시간: 1.2~2.0초
    const previewTime = THREE.MathUtils.clamp(1.2 + Math.abs(v)*0.06, 1.2, 2.0)
    let idx = findNearestIndex(system, state.pos)
    if (idx >= 0) {
      let tleft = previewTime
      let minSpd = Infinity
      let cur = idx
      // 앞으로 시간 누적하며 최소 targetSpeed 검색
      const times: number[] = []
      const speeds: number[] = []
      while (tleft > 0 && cur < all.length) {
        const wp = all[cur]
        minSpd = Math.min(minSpd, wp.targetSpeed)
        const seg = all[cur].distanceToNext || 0
        if (seg <= 1e-4) break
        const vEst = Math.max(0.3, Math.min(Math.abs(v), wp.targetSpeed))
        const dtSeg = seg / vEst
        tleft -= dtSeg
        times.push(Math.max(0, previewTime - tleft))
        speeds.push(wp.targetSpeed)
        cur = (cur + 1) % all.length
        // 루프 보호
        if (cur === idx) break
      }
      vWp = isFinite(minSpd) ? minSpd : vWp
      // 최소 속도에 도달하기까지의 대략적인 시간 추정
      const k = speeds.findIndex(s => s <= vWp + 1e-6)
      if (k >= 0 && k < times.length) tToMin = Math.max(0.3, times[k])
      else tToMin = Math.max(0.8, previewTime)
    }
  }
  // 2) 곡률 기반 상한도 반영(현재 조향 요구)
  let vK = Infinity
  if (Math.abs(kappa) > 1e-6) vK = Math.sqrt(ayMax / Math.abs(kappa))
  const vDesired = Math.min(vWp, vK)
  // 3) 속도 목표 완만 변경: 가·감속 램프 한계 적용
  const vPrev = prev.vTarget ?? state.speed
  const accelRate = 4.0   // m/s^2 가속 램프 (목표 변화율)
  const decelRate = 3.0   // m/s^2 감속 램프 (목표 변화율)
  const maxUp = accelRate * state.dt
  const maxDn = decelRate * state.dt
  let vTarget = vPrev
  const dvDes = vDesired - vPrev
  if (dvDes > 0) vTarget = vPrev + Math.min(maxUp, dvDes)
  else vTarget = vPrev + Math.max(-maxDn, dvDes)

  // 4) 스로틀 제어: P제어 + 데드밴드(작은 과속은 브레이크 금지)
  const kP = 0.22
  const dv = vTarget - v
  let throttle = clamp(kP * dv, -1, 1)
  // ±0.3 m/s 이내는 코스팅(음수 금지)
  if (Math.abs(dv) < 0.3) throttle = Math.max(0, throttle)
  // 큰 과속일 때만 완만한 브레이크 허용(하한 -0.4)
  if (dv < -0.5) throttle = Math.max(throttle, -0.4)
  // 선제 감속 Feed-forward: tToMin 내에 vWp/vDesired 도달을 목표로 음수 스로틀 추가
  if (v > vDesired + 0.2) {
    const tPlan = Math.max(0.6, Math.min(2.2, tToMin))
    const aReq = (v - vDesired) / tPlan // m/s^2
    const aMax = mu * g
    const thrFF = -clamp(aReq / Math.max(0.1, aMax), 0, 1)
    throttle = Math.min(throttle, thrFF)
  }
  return { throttle, yawRate: rCmd }
}
