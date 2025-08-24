import React, { useMemo } from 'react'
import { Shape, ExtrudeGeometry, Vector2 } from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

interface TrackProps {
  innerRadius?: number
  outerRadius?: number
  trackWidth?: number
  height?: number
}

const Track: React.FC<TrackProps> = ({ 
  innerRadius = 8,
  outerRadius = 12, 
  trackWidth = 4,
  height = 0.2 
}) => {
  // Create oval track geometry
  const trackGeometry = useMemo(() => {
    // Outer oval shape
    const outerShape = new Shape()
    const segments = 64
    
    // Create oval by combining two semicircles and rectangles
    const width = outerRadius * 2
    const straightLength = width * 0.6 // Length of straight sections
    const radius = width * 0.4 // Radius of curved sections
    
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

  // Create barrier geometry
  const barrierGeometry = useMemo(() => {
    const segments = 64
    const barriers = []
    
    // Outer barriers
    const outerWidth = outerRadius * 2
    const outerStraightLength = outerWidth * 0.6
    const outerRadius_ = outerWidth * 0.4
    
    // Inner barriers  
    const innerStraightLength = outerStraightLength - trackWidth
    const innerRadius_ = outerRadius_ - trackWidth/2
    
    return { outerStraightLength, outerRadius_, innerStraightLength, innerRadius_ }
  }, [outerRadius, trackWidth])

  return (
    <group>
      {/* Track Surface */}
      <RigidBody type="fixed" position={[0, -0.1, 0]}>
        <mesh geometry={trackGeometry} rotation={[-Math.PI/2, 0, 0]}>
          <meshStandardMaterial 
            color="#2c3e50" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        {/* Track collision - simplified as multiple box colliders */}
        <CuboidCollider args={[outerRadius, 0.1, outerRadius]} />
      </RigidBody>
      
      {/* Outer Barriers */}
      <group>
        {/* Outer straight barriers */}
        <RigidBody type="fixed" position={[0, 0.5, outerRadius + 0.5]}>
          <mesh>
            <boxGeometry args={[outerRadius * 1.2, 1, 0.5]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
          <CuboidCollider args={[outerRadius * 0.6, 0.5, 0.25]} />
        </RigidBody>
        
        <RigidBody type="fixed" position={[0, 0.5, -outerRadius - 0.5]}>
          <mesh>
            <boxGeometry args={[outerRadius * 1.2, 1, 0.5]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
          <CuboidCollider args={[outerRadius * 0.6, 0.5, 0.25]} />
        </RigidBody>
        
        {/* Outer curved barriers */}
        <RigidBody type="fixed" position={[outerRadius + 0.5, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 1, outerRadius * 0.8]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
          <CuboidCollider args={[0.25, 0.5, outerRadius * 0.4]} />
        </RigidBody>
        
        <RigidBody type="fixed" position={[-outerRadius - 0.5, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 1, outerRadius * 0.8]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
          <CuboidCollider args={[0.25, 0.5, outerRadius * 0.4]} />
        </RigidBody>
      </group>
      
      {/* Inner Barriers */}
      <group>
        {/* Inner straight barriers */}
        <RigidBody type="fixed" position={[0, 0.5, innerRadius - 0.5]}>
          <mesh>
            <boxGeometry args={[innerRadius * 0.8, 1, 0.5]} />
            <meshStandardMaterial color="#3498db" />
          </mesh>
          <CuboidCollider args={[innerRadius * 0.4, 0.5, 0.25]} />
        </RigidBody>
        
        <RigidBody type="fixed" position={[0, 0.5, -innerRadius + 0.5]}>
          <mesh>
            <boxGeometry args={[innerRadius * 0.8, 1, 0.5]} />
            <meshStandardMaterial color="#3498db" />
          </mesh>
          <CuboidCollider args={[innerRadius * 0.4, 0.5, 0.25]} />
        </RigidBody>
        
        {/* Inner curved barriers */}
        <RigidBody type="fixed" position={[innerRadius - 0.5, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 1, innerRadius * 0.6]} />
            <meshStandardMaterial color="#3498db" />
          </mesh>
          <CuboidCollider args={[0.25, 0.5, innerRadius * 0.3]} />
        </RigidBody>
        
        <RigidBody type="fixed" position={[-innerRadius + 0.5, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 1, innerRadius * 0.6]} />
            <meshStandardMaterial color="#3498db" />
          </mesh>
          <CuboidCollider args={[0.25, 0.5, innerRadius * 0.3]} />
        </RigidBody>
      </group>
      
      {/* Track markings */}
      <group position={[0, 0.01, 0]}>
        {/* Start/Finish line */}
        <mesh position={[0, 0, outerRadius - trackWidth/2]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[trackWidth, 1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        
        {/* Center line */}
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[innerRadius + trackWidth/2 - 0.1, innerRadius + trackWidth/2 + 0.1, 64]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
      </group>
    </group>
  )
}

export default Track