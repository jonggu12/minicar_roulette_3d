import React from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as RAPIER from '@dimforge/rapier3d-compat'

interface TrackBarriersProps {
  innerRadius?: number
  outerRadius?: number
  barrierHeight?: number
  barrierThickness?: number
}

const TrackBarriers: React.FC<TrackBarriersProps> = ({
  innerRadius = 12,
  outerRadius = 28,
  barrierHeight = 1.5,
  barrierThickness = 0.5
}) => {
  // Calculate track dimensions matching Track.tsx
  const width = outerRadius * 2
  const straightLength = width * 0.6
  const curveRadius = width * 0.4

  const barriers: JSX.Element[] = []
  
  // Outer barriers (prevent cars from going outside track)
  const outerBarrierRadius = outerRadius + barrierThickness / 2

  // Outer straight barriers (top and bottom)
  barriers.push(
    <RigidBody
      key="outer-barrier-bottom"
      type="fixed"
      position={[0, barrierHeight / 2, -outerBarrierRadius]}
      colliders={false}
    >
      {/* Visual mesh */}
      <mesh>
        <boxGeometry args={[straightLength, barrierHeight, barrierThickness]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.8} />
      </mesh>
      {/* Physics collider */}
      <CuboidCollider
        args={[straightLength / 2, barrierHeight / 2, barrierThickness / 2]}
        friction={0.6}
        restitution={0.3}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
      />
    </RigidBody>
  )

  barriers.push(
    <RigidBody
      key="outer-barrier-top"
      type="fixed"
      position={[0, barrierHeight / 2, outerBarrierRadius]}
      colliders={false}
    >
      {/* Visual mesh */}
      <mesh>
        <boxGeometry args={[straightLength, barrierHeight, barrierThickness]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.8} />
      </mesh>
      {/* Physics collider */}
      <CuboidCollider
        args={[straightLength / 2, barrierHeight / 2, barrierThickness / 2]}
        friction={0.6}
        restitution={0.3}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
      />
    </RigidBody>
  )

  // Outer curved barriers (left and right)
  barriers.push(
    <RigidBody
      key="outer-barrier-left"
      type="fixed"
      position={[-straightLength / 2 - barrierThickness / 2, barrierHeight / 2, 0]}
      colliders={false}
    >
      {/* Visual mesh */}
      <mesh>
        <boxGeometry args={[barrierThickness, barrierHeight, curveRadius * 2]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.8} />
      </mesh>
      {/* Physics collider */}
      <CuboidCollider
        args={[barrierThickness / 2, barrierHeight / 2, curveRadius]}
        friction={0.6}
        restitution={0.3}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
      />
    </RigidBody>
  )

  barriers.push(
    <RigidBody
      key="outer-barrier-right"
      type="fixed"
      position={[straightLength / 2 + barrierThickness / 2, barrierHeight / 2, 0]}
      colliders={false}
    >
      {/* Visual mesh */}
      <mesh>
        <boxGeometry args={[barrierThickness, barrierHeight, curveRadius * 2]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.8} />
      </mesh>
      {/* Physics collider */}
      <CuboidCollider
        args={[barrierThickness / 2, barrierHeight / 2, curveRadius]}
        friction={0.6}
        restitution={0.3}
        frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
        restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
      />
    </RigidBody>
  )

  // Inner barriers (prevent cars from going inside track)
  const innerBarrierRadius = innerRadius - barrierThickness / 2
  const innerStraightLength = straightLength - (outerRadius - innerRadius)
  const innerCurveRadius = curveRadius - (outerRadius - innerRadius) / 2

  // Inner straight barriers (top and bottom)
  if (innerStraightLength > 0) {
    barriers.push(
      <RigidBody
        key="inner-barrier-bottom"
        type="fixed"
        position={[0, barrierHeight / 2, -innerBarrierRadius]}
        colliders={false}
      >
        {/* Visual mesh */}
        <mesh>
          <boxGeometry args={[innerStraightLength, barrierHeight, barrierThickness]} />
          <meshStandardMaterial color="#3498db" roughness={0.8} />
        </mesh>
        {/* Physics collider */}
        <CuboidCollider
          args={[innerStraightLength / 2, barrierHeight / 2, barrierThickness / 2]}
          friction={0.6}
          restitution={0.3}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>
    )

    barriers.push(
      <RigidBody
        key="inner-barrier-top"
        type="fixed"
        position={[0, barrierHeight / 2, innerBarrierRadius]}
        colliders={false}
      >
        {/* Visual mesh */}
        <mesh>
          <boxGeometry args={[innerStraightLength, barrierHeight, barrierThickness]} />
          <meshStandardMaterial color="#3498db" roughness={0.8} />
        </mesh>
        {/* Physics collider */}
        <CuboidCollider
          args={[innerStraightLength / 2, barrierHeight / 2, barrierThickness / 2]}
          friction={0.6}
          restitution={0.3}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>
    )
  }

  // Inner curved barriers (left and right)
  if (innerCurveRadius > 0) {
    const innerCurveOffset = (outerRadius - innerRadius) / 4

    barriers.push(
      <RigidBody
        key="inner-barrier-left"
        type="fixed"
        position={[-straightLength / 2 + innerCurveOffset + barrierThickness / 2, barrierHeight / 2, 0]}
        colliders={false}
      >
        {/* Visual mesh */}
        <mesh>
          <boxGeometry args={[barrierThickness, barrierHeight, innerCurveRadius * 1.5]} />
          <meshStandardMaterial color="#3498db" roughness={0.8} />
        </mesh>
        {/* Physics collider */}
        <CuboidCollider
          args={[barrierThickness / 2, barrierHeight / 2, innerCurveRadius * 0.75]}
          friction={0.6}
          restitution={0.3}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>
    )

    barriers.push(
      <RigidBody
        key="inner-barrier-right"
        type="fixed"
        position={[straightLength / 2 - innerCurveOffset - barrierThickness / 2, barrierHeight / 2, 0]}
        colliders={false}
      >
        {/* Visual mesh */}
        <mesh>
          <boxGeometry args={[barrierThickness, barrierHeight, innerCurveRadius * 1.5]} />
          <meshStandardMaterial color="#3498db" roughness={0.8} />
        </mesh>
        {/* Physics collider */}
        <CuboidCollider
          args={[barrierThickness / 2, barrierHeight / 2, innerCurveRadius * 0.75]}
          friction={0.6}
          restitution={0.3}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>
    )
  }

  // Corner barriers for better coverage
  const cornerBarriers: React.ReactElement[] = []
  const cornerPositions = [
    // Top-left corner
    { x: -straightLength / 2, z: outerBarrierRadius * 0.7, rotation: [0, Math.PI / 4, 0] },
    // Top-right corner  
    { x: straightLength / 2, z: outerBarrierRadius * 0.7, rotation: [0, -Math.PI / 4, 0] },
    // Bottom-left corner
    { x: -straightLength / 2, z: -outerBarrierRadius * 0.7, rotation: [0, -Math.PI / 4, 0] },
    // Bottom-right corner
    { x: straightLength / 2, z: -outerBarrierRadius * 0.7, rotation: [0, Math.PI / 4, 0] }
  ]

  cornerPositions.forEach((pos, index) => {
    cornerBarriers.push(
      <RigidBody
        key={`corner-barrier-${index}`}
        type="fixed"
        position={[pos.x, barrierHeight / 2, pos.z]}
        rotation={pos.rotation}
        colliders={false}
      >
        {/* Visual mesh */}
        <mesh>
          <boxGeometry args={[barrierThickness * 2, barrierHeight, barrierThickness]} />
          <meshStandardMaterial color="#f39c12" roughness={0.8} />
        </mesh>
        {/* Physics collider */}
        <CuboidCollider
          args={[barrierThickness, barrierHeight / 2, barrierThickness / 2]}
          friction={0.6}
          restitution={0.3}
          frictionCombineRule={RAPIER.CoefficientCombineRule.Average}
          restitutionCombineRule={RAPIER.CoefficientCombineRule.Average}
        />
      </RigidBody>
    )
  })

  return (
    <group name="track-barriers">
      {barriers}
      {cornerBarriers}
      
      {/* Start/Finish barrier markers */}
      <RigidBody
        key="start-finish-marker"
        type="fixed"
        position={[0, barrierHeight + 0.5, -outerBarrierRadius - 0.2]}
        colliders={false}
      >
        <mesh>
          <boxGeometry args={[8, 0.5, 0.1]} />
          <meshStandardMaterial 
            color="#00ff00" 
            emissive="#004400"
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
      </RigidBody>
    </group>
  )
}

export default TrackBarriers