import React, { useMemo } from 'react'
import { Shape, ExtrudeGeometry } from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

interface PhysicsTrackProps {
  innerRadius?: number
  outerRadius?: number
  trackWidth?: number
  height?: number
}

const PhysicsTrack: React.FC<PhysicsTrackProps> = ({ 
  innerRadius = 6,
  outerRadius = 10, 
  trackWidth = 4,
  height = 0.2 
}) => {
  // Create oval track geometry
  const trackGeometry = useMemo(() => {
    // Outer oval shape
    const outerShape = new Shape()
    
    // Create oval by combining two semicircles and rectangles
    const width = outerRadius * 2
    const straightLength = width * 0.6
    const radius = width * 0.4
    
    // Start from bottom center
    outerShape.moveTo(-straightLength/2, -radius)
    
    // Bottom straight section
    outerShape.lineTo(straightLength/2, -radius)
    
    // Right semicircle
    outerShape.absarc(straightLength/2, 0, radius, -Math.PI/2, Math.PI/2, false)
    
    // Top straight section  
    outerShape.lineTo(-straightLength/2, radius)
    
    // Left semicircle
    outerShape.absarc(-straightLength/2, 0, radius, Math.PI/2, 3*Math.PI/2, false)
    
    // Inner oval hole
    const innerShape = new Shape()
    const innerStraightLength = straightLength - trackWidth
    const innerRadius = radius - trackWidth/2
    
    // Start from bottom center (inner)
    innerShape.moveTo(-innerStraightLength/2, -innerRadius)
    
    // Bottom straight section (inner)
    innerShape.lineTo(innerStraightLength/2, -innerRadius)
    
    // Right semicircle (inner)
    innerShape.absarc(innerStraightLength/2, 0, innerRadius, -Math.PI/2, Math.PI/2, false)
    
    // Top straight section (inner)
    innerShape.lineTo(-innerStraightLength/2, innerRadius)
    
    // Left semicircle (inner)
    innerShape.absarc(-innerStraightLength/2, 0, innerRadius, Math.PI/2, 3*Math.PI/2, false)
    
    // Add hole to outer shape
    outerShape.holes.push(innerShape)
    
    // Extrude the shape to create 3D track
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    }
    
    return new ExtrudeGeometry(outerShape, extrudeSettings)
  }, [innerRadius, outerRadius, trackWidth, height])

  return (
    <group>
      {/* Track Surface - Simple and reliable */}
      <RigidBody type="fixed" position={[0, 0, 0]} friction={1.2} restitution={0.2}>
        <mesh geometry={trackGeometry} rotation={[-Math.PI/2, 0, 0]}>
          <meshStandardMaterial 
            color="#2c3e50" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        
        {/* Simple overlapping colliders for reliable track surface */}
        <CuboidCollider args={[8, 0.2, 6]} position={[0, -0.1, 0]} />
        <CuboidCollider args={[6, 0.2, 8]} position={[0, -0.1, 0]} />
        <CuboidCollider args={[9, 0.2, 4]} position={[0, -0.1, 0]} />
        <CuboidCollider args={[4, 0.2, 9]} position={[0, -0.1, 0]} />
        
        {/* Corner coverage */}
        <CuboidCollider args={[3, 0.2, 3]} position={[6, -0.1, 6]} />
        <CuboidCollider args={[3, 0.2, 3]} position={[-6, -0.1, 6]} />
        <CuboidCollider args={[3, 0.2, 3]} position={[6, -0.1, -6]} />
        <CuboidCollider args={[3, 0.2, 3]} position={[-6, -0.1, -6]} />
      </RigidBody>
      
      {/* Start/Finish Line on track surface */}
      <mesh position={[0, 0.01, 8]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[4, 1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Track lane markers */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[7.8, 8.2, 32]} />
        <meshStandardMaterial color="#f1c40f" />
      </mesh>
      
      {/* Outer Wall - High precision oval with many small colliders */}
      <group>
        {(() => {
          const segments = 80 // Number of wall segments for smooth curve
          const width = outerRadius * 2
          const straightLength = width * 0.6
          const radius = width * 0.4
          const wallOffset = 0.4
          const wallThickness = 0.15
          const wallHeight = 1
          
          const walls = []
          
          // Create oval perimeter points and place wall segments
          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            let x, z, rotY = 0
            
            // Calculate position on oval perimeter
            if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
              // Straight sections (left and right sides)
              const side = Math.sign(Math.cos(angle))
              x = side * (straightLength/2 + radius + wallOffset)
              z = Math.sin(angle) * radius
              rotY = side > 0 ? Math.PI/2 : -Math.PI/2
            } else {
              // Curved sections (top and bottom)
              const side = Math.sign(Math.sin(angle))
              x = Math.cos(angle) * (straightLength/2)
              z = side * (radius + wallOffset)
              rotY = side > 0 ? 0 : Math.PI
            }
            
            walls.push(
              <RigidBody key={`outer-${i}`} type="fixed" position={[x, 0.5, z]} rotation={[0, rotY, 0]} friction={1.2} restitution={0.3}>
                <CuboidCollider args={[wallThickness, wallHeight, 0.3]} />
              </RigidBody>
            )
          }
          
          return walls
        })()}
      </group>
      
      {/* Inner Wall - High precision oval with many small colliders */}
      <group>
        {(() => {
          const segments = 64 // Slightly fewer segments for inner wall
          const width = outerRadius * 2
          const straightLength = width * 0.6 - trackWidth
          const radius = width * 0.4 - trackWidth/2
          const wallOffset = 0.4
          const wallThickness = 0.15
          const wallHeight = 1
          
          const walls = []
          
          // Create inner oval perimeter points and place wall segments
          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            let x, z, rotY = 0
            
            // Calculate position on inner oval perimeter
            if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
              // Straight sections (left and right sides)
              const side = Math.sign(Math.cos(angle))
              x = side * (straightLength/2 + radius - wallOffset)
              z = Math.sin(angle) * radius
              rotY = side > 0 ? -Math.PI/2 : Math.PI/2
            } else {
              // Curved sections (top and bottom)
              const side = Math.sign(Math.sin(angle))
              x = Math.cos(angle) * (straightLength/2)
              z = side * (radius - wallOffset)
              rotY = side > 0 ? Math.PI : 0
            }
            
            walls.push(
              <RigidBody key={`inner-${i}`} type="fixed" position={[x, 0.5, z]} rotation={[0, rotY, 0]} friction={1.2} restitution={0.3}>
                <CuboidCollider args={[wallThickness, wallHeight, 0.3]} />
              </RigidBody>
            )
          }
          
          return walls
        })()}
      </group>
    </group>
  )
}

export default PhysicsTrack