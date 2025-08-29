import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier'
import PhysicsCar from './PhysicsCar'
import * as RAPIER from '@dimforge/rapier3d-compat'
import CameraController, { CameraView } from './CameraController'
import * as THREE from 'three'
import { purePursuitController, PPParams, getLookaheadPoint } from './utils/purePursuit'
import { StraightWaypointSystem } from './utils/straightWaypointSystem'
import { TurnWaypointSystem } from './utils/turnWaypointSystem'

interface SquareTestMapProps {
  numCars?: number
}

const SquareTestMap: React.FC<SquareTestMapProps> = ({
  numCars = 1
}) => {
  const [cameraView, setCameraView] = useState<CameraView>(CameraView.OVERVIEW)
  const playerCarRef = useRef<RapierRigidBody>(null)
  // 정사각형 맵 설정
  const mapSize = 120  // 120m x 120m 큰 정사각형
  const START_MARGIN = 4   // 출발선/차량을 벽 안쪽으로 이동
  const FINISH_MARGIN = 4  // 도착선도 벽 안쪽으로 이동
  const wallHeight = 3.0
  const wallThickness = 2.0

  type PathType = 'straight' | 'right' | 'left'
  const [pathType, setPathType] = useState<PathType>('straight')
  // 차량 내부 상태까지 초기화하기 위한 리마운트 키
  const [carResetKey, setCarResetKey] = useState(0)
  // 현재 웨이포인트 제공자 (직선 2/3, 코너 1/3 구성)
  const currentSystem = useMemo(() => {
    const startX = -mapSize / 2 + START_MARGIN
    const start = new THREE.Vector3(startX, 0, 0)
    const straightEndX = startX + (mapSize * 2) / 3 // 전체 길이의 2/3 지점(시작점 기준)
    if (pathType === 'straight') {
      return new StraightWaypointSystem(start, new THREE.Vector3(mapSize / 2 - FINISH_MARGIN, 0, 0), 2.0, 14)
    } else if (pathType === 'right') {
      // 웨이포인트 샘플 간격을 1.0으로 좁혀 정밀 추종
      return new TurnWaypointSystem(start, straightEndX, 12, 1.0, 14, 7.5, 'right', mapSize/2 - FINISH_MARGIN)
    } else {
      return new TurnWaypointSystem(start, straightEndX, 12, 1.0, 14, 7.5, 'left', mapSize/2 - FINISH_MARGIN)
    }
  }, [pathType, mapSize])

  // PP 파라미터(직선용)
  const ppParams: PPParams = useMemo(() => ({
    L: 1.8,
    // 룩어헤드: 기본 2.0m, 속도 계수 1.0으로 상향
    L0: 2.0,
    kV: 1.0,
    LdMin: 0.8,
    LdMax: 8.0,
    rMax: 1.0,
    rRate: 2.5,
    mu: 0.8,
    g: 9.81,
  }), [])

  const aiStates = useRef<{ yawRate: number; vTarget?: number }[]>([])
  const ppDebugRef = useRef<{ look?: THREE.Vector3 }>({})

  // R 키로 차량만 리스폰 (선택된 경로 유지)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        respawnAI()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 경로 변경 시 차량 리스폰(출발선 재배치)
  const respawnAI = () => {
    const rb = playerCarRef.current
    if (!rb) return
    rb.setTranslation({ x: (-mapSize / 2) + START_MARGIN - 2, y: 0.5, z: 0 }, true)
    rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    aiStates.current[0] = { yawRate: 0, vTarget: 0 }
  }

  // 시작 위치들 - 맵 중앙 근처에 격자 배치
  const startPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const carsPerRow = Math.ceil(Math.sqrt(numCars))
    const spacing = 6.0  // 6m 간격
    const startOffset = -(carsPerRow - 1) * spacing / 2

    for (let i = 0; i < numCars; i++) {
      const row = Math.floor(i / carsPerRow)
      const col = i % carsPerRow
      positions.push([
        startOffset + col * spacing,
        0.5,
        startOffset + row * spacing
      ])
    }
    return positions
  }, [numCars])

  const carColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#8844ff']

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 경로 선택 UI는 정보 패널 내부 하단에 표시 (아래에서 추가) */}
      {/* 맵 정보 UI */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>
          🏟️ 정사각형 테스트 맵
        </h3>
        <p><strong>크기:</strong> {mapSize}m × {mapSize}m</p>
        <p><strong>벽 높이:</strong> {wallHeight}m</p>
        <p><strong>차량 수:</strong> {numCars}대</p>
        
        <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px' }}>
          <p style={{ fontSize: '10px', opacity: 0.8, margin: 0 }}>
            💡 <strong>용도:</strong> 자유 주행 및 물리 엔진 테스트<br/>
            🎯 넓은 공간에서 차량 조작감과 물리 반응 확인<br/>
            🚧 벽 충돌 테스트 및 차량 안정성 검증
          </p>
        </div>

        <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
          <p>🎮 WASD: 차량 조작</p>
          <p>🛑 스페이스: 브레이크</p>
          <p>🎥 V: 카메라 전환 (Overview/Follow)</p>
          <p>🖱️ 휠: Follow에서 줌 인/아웃</p>
          <p>🔁 R: 차량 리스폰 (경로 유지)</p>
        </div>

        {/* 경로 선택 버튼 (정보 패널 바로 아래) */}
        <div style={{ marginTop: '10px', display: 'flex', gap: 8 }}>
          {(['straight','right','left'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                // 경로 변경: 차량 컴포넌트를 리마운트하여 내부 상태까지 초기화
                setPathType(t)
                setCarResetKey((k) => k + 1)
                // 외부 AI 상태/디버그 포인트도 초기화
                aiStates.current = []
                ppDebugRef.current.look = undefined
              }}
              style={{
                padding: '8px 10px',
                background: pathType === t ? '#4CAF50' : 'rgba(255,255,255,0.9)',
                color: pathType === t ? '#fff' : '#333',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12
              }}
            >
              {t === 'straight' ? '직선' : t === 'right' ? '우회전' : '좌회전'}
            </button>
          ))}
        </div>
      </div>

      <Canvas camera={{ position: [0, 60, 60], fov: 75 }}>
        <CameraController 
          currentView={cameraView}
          playerCarRef={playerCarRef}
          onViewChange={setCameraView}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 5]} intensity={1.2} />
        <directionalLight position={[-10, 15, -5]} intensity={0.8} />

        <Physics gravity={[0, -9.81, 0]} timeStep={1/60} debug={true}>
          {/* 바닥면 */}
          <RigidBody type="fixed" position={[0, -0.1, 0]} colliders={false}>
            <CuboidCollider
              args={[mapSize/2, 0.1, mapSize/2]}
              friction={0.9}
              restitution={0.02}
              frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
              restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
            />
            {/* 바닥 시각 표현 */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[mapSize, 0.2, mapSize]} />
              <meshStandardMaterial 
                color="#2a2a2a" 
                roughness={0.8} 
                metalness={0.1}
              />
            </mesh>
            
            {/* 격자 라인 표시 */}
            <group>
              {/* 세로 격자선 */}
              {Array.from({ length: 13 }, (_, i) => {
                const x = -mapSize/2 + (i * mapSize/12)
                return (
                  <mesh key={`v-${i}`} position={[x, 0.11, 0]}>
                    <boxGeometry args={[0.2, 0.02, mapSize]} />
                    <meshStandardMaterial 
                      color={i === 6 ? "#4CAF50" : "#444444"} 
                      transparent 
                      opacity={i === 6 ? 0.8 : 0.4}
                    />
                  </mesh>
                )
              })}
              {/* 가로 격자선 */}
              {Array.from({ length: 13 }, (_, i) => {
                const z = -mapSize/2 + (i * mapSize/12)
                return (
                  <mesh key={`h-${i}`} position={[0, 0.11, z]}>
                    <boxGeometry args={[mapSize, 0.02, 0.2]} />
                    <meshStandardMaterial 
                      color={i === 6 ? "#4CAF50" : "#444444"} 
                      transparent 
                      opacity={i === 6 ? 0.8 : 0.4}
                    />
                  </mesh>
                )
              })}
            </group>
          </RigidBody>

          {/* 벽면들 - TestTrackWithWaypoints.tsx의 CircularTrackBarriers 참고 */}
          
          {/* 북쪽 벽 (top) */}
          <RigidBody 
            type="fixed" 
            position={[0, wallHeight/2, mapSize/2 + wallThickness/2]}
            colliders={false}
          >
            <CuboidCollider
              args={[mapSize/2 + wallThickness, wallHeight/2, wallThickness/2]}
              friction={0.6}
              restitution={0.3}
              frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
              restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
            />
            <mesh>
              <boxGeometry args={[mapSize + wallThickness*2, wallHeight, wallThickness]} />
              <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>
          </RigidBody>

          {/* 남쪽 벽 (bottom) */}
          <RigidBody 
            type="fixed" 
            position={[0, wallHeight/2, -mapSize/2 - wallThickness/2]}
            colliders={false}
          >
            <CuboidCollider
              args={[mapSize/2 + wallThickness, wallHeight/2, wallThickness/2]}
              friction={0.6}
              restitution={0.3}
              frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
              restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
            />
            <mesh>
              <boxGeometry args={[mapSize + wallThickness*2, wallHeight, wallThickness]} />
              <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>
          </RigidBody>

          {/* 동쪽 벽 (right) */}
          <RigidBody 
            type="fixed" 
            position={[mapSize/2 + wallThickness/2, wallHeight/2, 0]}
            colliders={false}
          >
            <CuboidCollider
              args={[wallThickness/2, wallHeight/2, mapSize/2]}
              friction={0.6}
              restitution={0.3}
              frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
              restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
            />
            <mesh>
              <boxGeometry args={[wallThickness, wallHeight, mapSize]} />
              <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>
          </RigidBody>

          {/* 서쪽 벽 (left) */}
          <RigidBody 
            type="fixed" 
            position={[-mapSize/2 - wallThickness/2, wallHeight/2, 0]}
            colliders={false}
          >
            <CuboidCollider
              args={[wallThickness/2, wallHeight/2, mapSize/2]}
              friction={0.6}
              restitution={0.3}
              frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
              restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
            />
            <mesh>
              <boxGeometry args={[wallThickness, wallHeight, mapSize]} />
              <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>
          </RigidBody>

          {/* 중앙 마커 제거: 직선 테스트 간섭 방지 */}

          {/* 몇 개 장애물 추가 (선택적 테스트용) */}
          <RigidBody type="fixed" position={[20, 1, 20]} colliders={false}>
            <CuboidCollider args={[2, 1, 2]} friction={0.8} restitution={0.4} />
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[4, 2, 4]} />
              <meshStandardMaterial color="#607D8B" />
            </mesh>
          </RigidBody>

          <RigidBody type="fixed" position={[-25, 0.75, -25]} colliders={false}>
            <CuboidCollider args={[1.5, 0.75, 1.5]} friction={0.8} restitution={0.4} />
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[3, 1.5, 3]} />
              <meshStandardMaterial color="#9C27B0" />
            </mesh>
          </RigidBody>

          <RigidBody type="fixed" position={[30, 1.5, -30]} colliders={false}>
            <CuboidCollider args={[3, 1.5, 1]} friction={0.8} restitution={0.4} />
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[6, 3, 2]} />
              <meshStandardMaterial color="#FF9800" />
            </mesh>
          </RigidBody>

          {/* 출발/도착선 - 벽 안쪽 마진 적용 */}
          <RigidBody type="fixed" position={[-mapSize/2 + START_MARGIN, 0.01, 0]} colliders={false}>
            <mesh rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[6, 1]} />
              <meshStandardMaterial color="#00ff00" transparent opacity={0.8} />
            </mesh>
          </RigidBody>
          {(() => {
            const wps = currentSystem.getWaypoints()
            const last = wps[wps.length - 1]?.position
            const fx = last ? last.x : (mapSize/2 - FINISH_MARGIN)
            const fz = last ? last.z : 0
            return (
              <RigidBody type="fixed" position={[fx, 0.01, fz]} colliders={false}>
                <mesh rotation={[-Math.PI/2, 0, 0]}>
                  <planeGeometry args={[6, 1]} />
                  <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
              </RigidBody>
            )
          })()}

          {/* 웨이포인트 시각화 */}
          {currentSystem.getWaypoints().map((wp, i, arr) => (
            <RigidBody key={`wp-${i}`} type="fixed" position={[wp.position.x, 0.05, wp.position.z]} colliders={false}>
              <mesh>
                <sphereGeometry args={[0.15, 10, 10]} />
                <meshStandardMaterial color={i === 0 ? '#00ff00' : (i === arr.length-1 ? '#ffffff' : '#2196f3')} />
              </mesh>
            </RigidBody>
          ))}

          {/* PP 룩어헤드 포인트 시각화 (디버그) */}
          {ppDebugRef.current.look && (
            <mesh position={[ppDebugRef.current.look.x, 0.2, ppDebugRef.current.look.z]}>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial color="#ff4444" />
            </mesh>
          )}

          {/* AI 차량 1대: 출발선 좌측 약간 뒤에서 시작 */}
          <PhysicsCar
            key={`car-ai-pp-${pathType}-${carResetKey}`}
            ref={playerCarRef}
            position={[(-mapSize/2) + START_MARGIN - 2, 0.5, 0]}
            rotation={[0, 0, 0]}
            color={'#ff4444'}
            name={`AI-PP`}
            autoControl={true}
            maxSpeed={14}
            engineForce={5200}
            mu={0.8}
            autopilot={(st) => {
              if (!aiStates.current[0]) aiStates.current[0] = { yawRate: 0, vTarget: st.speed }
              const prev = aiStates.current[0]
              const cmd = purePursuitController(currentSystem, {
                pos: st.position,
                yaw: st.yaw,
                vel: st.velocity,
                speed: st.speed,
                dt: st.dt,
              }, prev, ppParams)
              // 룩어헤드 디버그 계산/저장
              const Ld = Math.max(ppParams.LdMin, Math.min(ppParams.LdMax, ppParams.L0 + ppParams.kV * Math.abs(st.speed)))
              ppDebugRef.current.look = getLookaheadPoint(currentSystem, st.position, Ld)
              prev.yawRate = cmd.yawRate
              prev.vTarget = Math.max(0, (prev.vTarget ?? st.speed) + ((cmd.throttle>=0?1:-1) * Math.abs(cmd.throttle) * 0.5))
              return { throttle: cmd.throttle, yawRate: cmd.yawRate }
            }}
          />
        </Physics>
      </Canvas>
    </div>
  )
}

export default SquareTestMap
