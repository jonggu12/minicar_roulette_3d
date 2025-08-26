import React from 'react'
import { RigidBody, CuboidCollider, CylinderCollider, BallCollider } from '@react-three/rapier'
import * as RAPIER from '@dimforge/rapier3d-compat'
import PhysicsCar from '../components/3d/PhysicsCar'

interface TestTrackProps {
  length?: number
  width?: number
  height?: number
}

const TestTrack: React.FC<TestTrackProps> = ({ 
  length = 48,
  width = 6, 
  height = 0.2 
}) => {
  // 충돌 핸들러 - 기본적인 충돌 로깅만 (선택적)
  const handleCarCollision = (carName: string) => (collisionData: any) => {
    // 개발 환경에서만 충돌 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚗 ${carName} 충돌: ${collisionData.impactStrength.toFixed(1)}`)
    }
  }

  // 기본 직선 트랙(단순하고 안정적인 물리)
  const halfL = length / 2
  const halfW = width / 2
  const wallT = 0.25
  const wallH = 1.0
  // 물리 바닥은 두껍게, 하지만 시각 메쉬 상단과 맞추기 위해 아래로 오프셋
  const visualHalfY = height / 2
  const groundHy = 0.5 // 콜라이더 반높이(물리 안정성)
  const groundTopY = 0 // 월드 기준 바닥 상단을 y=0으로 정규화
  const groundColliderOffsetY = groundTopY - groundHy // 콜라이더 상단이 0이 되도록 아래로 이동

  return (
    <group>
      {/* Test vehicle 1 - Player controlled (improved responsiveness) */}
      <PhysicsCar 
        position={[-halfL + 3, groundTopY + 0.2, 0]}
        color="#3fa7ff"
        name="Player"
        autoControl={false}
        mass={800} // 동일한 질량 (공정성)
        engineForce={4200} // 더 반응적인 가속
        brakeForce={5000}  // 더 강한 브레이킹
        steerStrength={1000} // 더 민감한 조향
        maxSpeed={15}      // 최고속도 증가
        onCollision={handleCarCollision("Player")}
      />

      {/* Test vehicle 2 - AI controlled */}
      <PhysicsCar 
        position={[halfL - 8, groundTopY + 0.2, 1]}
        color="#ff4757"
        name="AI"
        autoControl={true}
        mass={800} // 동일한 질량 (공정성)
        engineForce={2000}
        brakeForce={3000}
        steerStrength={600}
        onCollision={handleCarCollision("AI")}
      />

      {/* Test vehicle 3 - Static target */}
      <PhysicsCar 
        position={[0, groundTopY + 0.2, -2]}
        color="#2ecc71"
        name="Target"
        autoControl={true}
        mass={800} // 동일한 질량 (공정성)
        engineForce={0} // 움직이지 않음
        brakeForce={0}
        steerStrength={0}
        onCollision={handleCarCollision("Target")}
      />

      {/* 바닥(고정) - 두꺼운 콜라이더로 관통/튐 방지 */}
      <RigidBody
        type="fixed"
        position={[0, 0, 0]}
        colliders={false}
        friction={0.2}
        restitution={0.02}
      >
        {/* 시각 메쉬: 상단이 y=0이 되도록 아래로 이동 */}
        <mesh receiveShadow position={[0, -visualHalfY, 0]}>
          <boxGeometry args={[length, height, width]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.8} metalness={0.1} />
        </mesh>

        {/* 물리 콜라이더(바닥) */}
        <CuboidCollider
          args={[halfL, groundHy, halfW]}
          position={[0, groundColliderOffsetY, 0]}
          friction={0.9} // 바닥 마찰력 증가
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
        />
      </RigidBody>

      {/* 좌우 벽(고정) - 단순 직선 벽 */}
      <RigidBody
        type="fixed"
        position={[0, wallH / 2, halfW + wallT / 2]}
        colliders={false}
        friction={1.1}
        restitution={0.04}
      >
        <mesh receiveShadow>
          <boxGeometry args={[length, wallH, wallT]} />
          <meshStandardMaterial color="#e74c3c" transparent opacity={0.5} />
        </mesh>
        <CuboidCollider
          args={[halfL, wallH / 2, wallT / 2]}
          friction={0.4}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
        />
      </RigidBody>

      <RigidBody
        type="fixed"
        position={[0, wallH / 2, -halfW - wallT / 2]}
        colliders={false}
        friction={1.1}
        restitution={0.04}
      >
        <mesh receiveShadow>
          <boxGeometry args={[length, wallH, wallT]} />
          <meshStandardMaterial color="#e74c3c" transparent opacity={0.5} />
        </mesh>
        <CuboidCollider
          args={[halfL, wallH / 2, wallT / 2]}
          friction={0.4}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
        />
      </RigidBody>

      {/* 끝단(엔드 캡) - 정면 충돌 안정 */}
      <RigidBody
        type="fixed"
        position={[halfL + wallT / 2, 0.5, 0]}
        colliders={false}
        friction={1.1}
        restitution={0.04}
      >
        <mesh receiveShadow>
          <boxGeometry args={[wallT, 1.0, width + wallT]} />
          <meshStandardMaterial color="#e74c3c" transparent opacity={0.45} />
        </mesh>
        <CuboidCollider
          args={[wallT / 2, 0.5, halfW + wallT / 2]}
          friction={0.4}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
        />
      </RigidBody>

      <RigidBody
        type="fixed"
        position={[-halfL - wallT / 2, 0.5, 0]}
        colliders={false}
        friction={1.1}
        restitution={0.04}
      >
        <mesh receiveShadow>
          <boxGeometry args={[wallT, 1.0, width + wallT]} />
          <meshStandardMaterial color="#e74c3c" transparent opacity={0.45} />
        </mesh>
        <CuboidCollider
          args={[wallT / 2, 0.5, halfW + wallT / 2]}
          friction={0.4}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Min}
        />
      </RigidBody>

      {/* START/FINISH 시각요소 */}
      <mesh position={[-halfL + 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, width + 0.6]} />
        <meshStandardMaterial color="#00ff7f" emissive="#00ff7f" emissiveIntensity={0.25} />
      </mesh>

      <mesh position={[halfL - 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, width + 0.6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[halfL - 2, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, width + 0.6]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* 중앙선(시각용) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, 0.08]} />
        <meshStandardMaterial color="#f1c40f" />
      </mesh>

      {/* 충돌 테스트용 장애물 - 트랙 중간 */}
      <RigidBody
        type="fixed"
        position={[5, 0.75, 0]}
        colliders={false}
        friction={0.6}
        restitution={0.3}
      >
        {/* 시각 모델 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#e67e22" roughness={0.7} metalness={0.1} />
        </mesh>
        
        {/* 물리 콜라이더 */}
        <CuboidCollider
          args={[0.75, 0.75, 0.75]}
          friction={0.6}
          restitution={0.3}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>

      {/* 추가 테스트용 원기둥 장애물 */}
      <RigidBody
        type="fixed"
        position={[-8, 0.6, 1.5]}
        colliders={false}
        friction={0.8}
        restitution={0.2}
      >
        {/* 시각 모델 */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.2, 16]} />
          <meshStandardMaterial color="#9b59b6" roughness={0.5} metalness={0.2} />
        </mesh>
        
        {/* 물리 콜라이더 */}
        <CylinderCollider
          args={[0.6, 0.6]}
          friction={0.8}
          restitution={0.2}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>

      {/* 구형 장애물 */}
      <RigidBody
        type="fixed"
        position={[10, 0.5, -2]}
        colliders={false}
        friction={0.4}
        restitution={0.7}
      >
        {/* 시각 모델 */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#e74c3c" roughness={0.3} metalness={0.4} />
        </mesh>
        
        {/* 물리 콜라이더 */}
        <BallCollider
          args={[0.5]}
          friction={0.4}
          restitution={0.7}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>
    </group>
  )
}

export default TestTrack
