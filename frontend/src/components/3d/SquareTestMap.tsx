import React, { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier'
import PhysicsCar from './PhysicsCar'
import RAPIER from '@dimforge/rapier3d-compat'
import CameraController, { CameraView } from './CameraController'

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
  const wallHeight = 3.0
  const wallThickness = 2.0

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

        <Physics gravity={[0, -9.81, 0]} debug={true}>
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

          {/* 중앙 마커 (원점 표시) */}
          <RigidBody type="fixed" position={[0, 1, 0]} colliders={false}>
            <mesh>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshStandardMaterial 
                color="#FF5722" 
                emissive="#FF5722" 
                emissiveIntensity={0.3}
              />
            </mesh>
          </RigidBody>

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

          {/* 차량들 */}
          {startPositions.slice(0, numCars).map((position, index) => (
            <PhysicsCar
              key={`car-${index}`}
              ref={index === 0 ? playerCarRef : undefined}
              position={position}
              rotation={[0, 0, 0]}  // 정면 방향
              color={carColors[index % carColors.length]}
              name={`TestCar ${index + 1}`}
              autoControl={index > 0}  // 첫 번째만 플레이어 제어
              // 기본 물리 설정 사용 (테스트맵이므로 고성능 설정 불필요)
            />
          ))}
        </Physics>
      </Canvas>
    </div>
  )
}

export default SquareTestMap
