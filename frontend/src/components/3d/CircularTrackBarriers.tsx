import React, { useMemo } from 'react'
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d-compat'

interface CircularTrackBarriersProps {
  innerRadius?: number
  outerRadius?: number
  barrierHeight?: number
  barrierThickness?: number
  segments?: number  // 원형 외벽의 세그먼트 수 (더 부드러운 곡선)
}

const CircularTrackBarriers: React.FC<CircularTrackBarriersProps> = ({
  innerRadius = 12,
  outerRadius = 28,
  barrierHeight = 2.0,
  barrierThickness = 0.8,
  segments = 64  // 64개 세그먼트로 부드러운 원형
}) => {
  
  // Track geometry matching Track.tsx exactly (Indy500 style)
  const width = outerRadius * 2
  const straightLength = width * 0.8  // Longer straights like Indy500
  const curveRadius = width * 0.2     // Tighter corners like Indy500
  
  // Calculate actual track boundaries (matching Track.tsx logic)
  const trackOuterRadius = curveRadius  // This is the actual outer curve radius
  const trackInnerRadius = curveRadius - (outerRadius - innerRadius)  // Inner curve radius
  const trackInnerStraightLength = straightLength - (outerRadius - innerRadius)

  // Outer barrier geometry (following track outer edge)
  const outerBarrierGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    
    // Create oval shape for outer barrier (following track outer edge exactly)
    const barrierOuterRadius = trackOuterRadius + barrierThickness
    const barrierInnerRadius = trackOuterRadius
    
    // Outer edge of barrier
    shape.moveTo(-straightLength/2, -barrierOuterRadius)
    shape.lineTo(straightLength/2, -barrierOuterRadius)
    shape.absarc(straightLength/2, 0, barrierOuterRadius, -Math.PI/2, Math.PI/2, false)
    shape.lineTo(-straightLength/2, barrierOuterRadius)
    shape.absarc(-straightLength/2, 0, barrierOuterRadius, Math.PI/2, 3*Math.PI/2, false)
    
    // Inner hole (track outer edge)
    const hole = new THREE.Shape()
    hole.moveTo(-straightLength/2, -barrierInnerRadius)
    hole.lineTo(straightLength/2, -barrierInnerRadius)
    hole.absarc(straightLength/2, 0, barrierInnerRadius, -Math.PI/2, Math.PI/2, false)
    hole.lineTo(-straightLength/2, barrierInnerRadius)
    hole.absarc(-straightLength/2, 0, barrierInnerRadius, Math.PI/2, 3*Math.PI/2, false)
    
    shape.holes.push(hole)
    
    const extrudeSettings = {
      depth: barrierHeight,
      bevelEnabled: false,
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [outerRadius, straightLength, barrierThickness, barrierHeight])

  // Inner barrier geometry (following track inner edge)
  const innerBarrierGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    
    // Create oval shape for inner barrier (following track inner edge exactly)  
    const barrierOuterRadius = trackInnerRadius
    const barrierInnerRadius = trackInnerRadius - barrierThickness
    
    // Only create inner barrier if there's enough space (Indy500 might not have inner barrier)
    if (trackInnerRadius > 0 && barrierInnerRadius > 1 && trackInnerStraightLength > 0) {
      // Outer edge (track inner edge)
      shape.moveTo(-trackInnerStraightLength/2, -barrierOuterRadius)
      shape.lineTo(trackInnerStraightLength/2, -barrierOuterRadius)
      shape.absarc(trackInnerStraightLength/2, 0, barrierOuterRadius, -Math.PI/2, Math.PI/2, false)
      shape.lineTo(-trackInnerStraightLength/2, barrierOuterRadius)
      shape.absarc(-trackInnerStraightLength/2, 0, barrierOuterRadius, Math.PI/2, 3*Math.PI/2, false)
      
      // Inner hole
      const hole = new THREE.Shape()
      hole.moveTo(-trackInnerStraightLength/2, -barrierInnerRadius)
      hole.lineTo(trackInnerStraightLength/2, -barrierInnerRadius)
      hole.absarc(trackInnerStraightLength/2, 0, barrierInnerRadius, -Math.PI/2, Math.PI/2, false)
      hole.lineTo(-trackInnerStraightLength/2, barrierInnerRadius)
      hole.absarc(-trackInnerStraightLength/2, 0, barrierInnerRadius, Math.PI/2, 3*Math.PI/2, false)
      
      shape.holes.push(hole)
    }
    
    const extrudeSettings = {
      depth: barrierHeight,
      bevelEnabled: false,
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [innerRadius, straightLength, barrierThickness, barrierHeight])

  // Generate wall colliders using simple box approach for better alignment
  const outerColliders = useMemo(() => {
    const colliders = []
    const wallOffset = trackOuterRadius + barrierThickness / 2
    
    // Bottom straight wall
    colliders.push(
      <RigidBody
        key="outer-wall-bottom"
        type="fixed"
        position={[0, barrierHeight / 2, -wallOffset]}
        colliders={false}
      >
        <CuboidCollider
          args={[straightLength / 2, barrierHeight / 2, barrierThickness / 2]}
          friction={0.8}
          restitution={0.3}
        />
      </RigidBody>
    )
    
    // Top straight wall
    colliders.push(
      <RigidBody
        key="outer-wall-top"
        type="fixed"
        position={[0, barrierHeight / 2, wallOffset]}
        colliders={false}
      >
        <CuboidCollider
          args={[straightLength / 2, barrierHeight / 2, barrierThickness / 2]}
          friction={0.8}
          restitution={0.3}
        />
      </RigidBody>
    )
    
    // Right curved wall (multiple segments for smooth collision)
    const rightCurveSegments = 32
    for (let i = 0; i < rightCurveSegments; i++) {
      const angle = -Math.PI/2 + (i / (rightCurveSegments - 1)) * Math.PI
      const x = straightLength/2 + (trackOuterRadius + barrierThickness/2) * Math.cos(angle)
      const z = (trackOuterRadius + barrierThickness/2) * Math.sin(angle)
      
      colliders.push(
        <RigidBody
          key={`outer-curve-right-${i}`}
          type="fixed"
          position={[x, barrierHeight / 2, z]}
          colliders={false}
        >
          <CylinderCollider
            args={[barrierHeight / 2, barrierThickness / 3]}
            friction={0.8}
            restitution={0.3}
          />
        </RigidBody>
      )
    }
    
    // Left curved wall (multiple segments for smooth collision)
    const leftCurveSegments = 32
    for (let i = 0; i < leftCurveSegments; i++) {
      const angle = Math.PI/2 + (i / (leftCurveSegments - 1)) * Math.PI
      const x = -straightLength/2 + (trackOuterRadius + barrierThickness/2) * Math.cos(angle)
      const z = (trackOuterRadius + barrierThickness/2) * Math.sin(angle)
      
      colliders.push(
        <RigidBody
          key={`outer-curve-left-${i}`}
          type="fixed"
          position={[x, barrierHeight / 2, z]}
          colliders={false}
        >
          <CylinderCollider
            args={[barrierHeight / 2, barrierThickness / 3]}
            friction={0.8}
            restitution={0.3}
          />
        </RigidBody>
      )
    }
    
    return colliders
  }, [trackOuterRadius, straightLength, barrierThickness, barrierHeight])

  const innerColliders = useMemo(() => {
    const colliders = []
    
    // Only create inner barriers if there's enough space (Indy500 usually doesn't have inner barriers)
    if (trackInnerRadius > 0 && trackInnerRadius > barrierThickness && trackInnerStraightLength > 0) {
      const wallOffset = trackInnerRadius - barrierThickness / 2
      
      // Bottom straight wall
      colliders.push(
        <RigidBody
          key="inner-wall-bottom"
          type="fixed"
          position={[0, barrierHeight / 2, -wallOffset]}
          colliders={false}
        >
          <CuboidCollider
            args={[trackInnerStraightLength / 2, barrierHeight / 2, barrierThickness / 2]}
            friction={0.8}
            restitution={0.3}
          />
        </RigidBody>
      )
      
      // Top straight wall
      colliders.push(
        <RigidBody
          key="inner-wall-top"
          type="fixed"
          position={[0, barrierHeight / 2, wallOffset]}
          colliders={false}
        >
          <CuboidCollider
            args={[trackInnerStraightLength / 2, barrierHeight / 2, barrierThickness / 2]}
            friction={0.8}
            restitution={0.3}
          />
        </RigidBody>
      )
      
      // Inner curved walls (if radius is big enough)
      if (trackInnerRadius > 2) {
        // Right curved wall
        const rightCurveSegments = 24
        for (let i = 0; i < rightCurveSegments; i++) {
          const angle = -Math.PI/2 + (i / (rightCurveSegments - 1)) * Math.PI
          const x = trackInnerStraightLength/2 + (trackInnerRadius - barrierThickness/2) * Math.cos(angle)
          const z = (trackInnerRadius - barrierThickness/2) * Math.sin(angle)
          
          colliders.push(
            <RigidBody
              key={`inner-curve-right-${i}`}
              type="fixed"
              position={[x, barrierHeight / 2, z]}
              colliders={false}
            >
              <CylinderCollider
                args={[barrierHeight / 2, barrierThickness / 4]}
                friction={0.8}
                restitution={0.3}
              />
            </RigidBody>
          )
        }
        
        // Left curved wall
        const leftCurveSegments = 24
        for (let i = 0; i < leftCurveSegments; i++) {
          const angle = Math.PI/2 + (i / (leftCurveSegments - 1)) * Math.PI
          const x = -trackInnerStraightLength/2 + (trackInnerRadius - barrierThickness/2) * Math.cos(angle)
          const z = (trackInnerRadius - barrierThickness/2) * Math.sin(angle)
          
          colliders.push(
            <RigidBody
              key={`inner-curve-left-${i}`}
              type="fixed"
              position={[x, barrierHeight / 2, z]}
              colliders={false}
            >
              <CylinderCollider
                args={[barrierHeight / 2, barrierThickness / 4]}
                friction={0.8}
                restitution={0.3}
              />
            </RigidBody>
          )
        }
      }
    }
    
    return colliders
  }, [trackInnerRadius, trackInnerStraightLength, barrierThickness, barrierHeight])

  return (
    <group name="circular-track-barriers">
      {/* Outer barrier visual */}
      <mesh geometry={outerBarrierGeometry} position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <meshStandardMaterial 
          color="#e74c3c" 
          roughness={0.8} 
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Inner barrier visual (if space allows - Indy500 might not have inner barrier) */}
      {trackInnerRadius > 0 && trackInnerRadius - barrierThickness > 1 && trackInnerStraightLength > 0 && (
        <mesh geometry={innerBarrierGeometry} position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <meshStandardMaterial 
            color="#3498db" 
            roughness={0.8} 
            metalness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {/* Physics colliders */}
      {outerColliders}
      {innerColliders}

      {/* Start/Finish line marker on outer barrier */}
      <mesh position={[0, barrierHeight + 0.2, -(trackOuterRadius + barrierThickness)]} rotation={[0, 0, 0]}>
        <boxGeometry args={[8, 0.3, 0.1]} />
        <meshStandardMaterial 
          color="#00ff00" 
          emissive="#004400"
          emissiveIntensity={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Checkered flag pattern on start/finish */}
      <group position={[0, barrierHeight + 0.5, -(trackOuterRadius + barrierThickness + 0.1)]}>
        {Array.from({length: 8}, (_, i) => 
          Array.from({length: 4}, (_, j) => (
            <mesh key={`flag-${i}-${j}`} position={[(i-3.5)*0.5, (j-1.5)*0.2, 0]}>
              <boxGeometry args={[0.4, 0.15, 0.05]} />
              <meshStandardMaterial 
                color={(i + j) % 2 === 0 ? "#ffffff" : "#000000"}
              />
            </mesh>
          ))
        )}
      </group>
    </group>
  )
}

export default CircularTrackBarriers