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
  // Calculate track dimensions
  const width = outerRadius * 2
  const straightLength = width * 0.8 // Much longer straight sections (80%)
  const radius = width * 0.2 // Much smaller corner radius (20%)
  
  // Create oval track geometry
  const trackGeometry = useMemo(() => {
    // Outer oval shape
    const outerShape = new Shape()
    const segments = 64
    
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
    
    // Inner oval hole (only if there's enough space for inner track)
    const innerStraightLength = straightLength - trackWidth
    const innerRadius = radius - trackWidth/2
    
    // Only create inner hole if radius is positive and straight length is positive
    if (innerRadius > 0 && innerStraightLength > 0) {
      const innerShape = new Shape()
      
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
    }
    
    // Extrude the shape to create 3D track
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    }
    
    return new ExtrudeGeometry(outerShape, extrudeSettings)
  }, [innerRadius, outerRadius, trackWidth, height, straightLength, radius])

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
            color="#ffffff" 
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>
        {/* Track collision - multiple box colliders matching track shape */}
        {/* Bottom straight section */}
        <CuboidCollider args={[straightLength/2, 0.1, trackWidth/2]} position={[0, 0, -radius]} />
        {/* Top straight section */}
        <CuboidCollider args={[straightLength/2, 0.1, trackWidth/2]} position={[0, 0, radius]} />
        {/* Right curved section */}
        <CuboidCollider args={[trackWidth/2, 0.1, radius]} position={[straightLength/2, 0, 0]} />
        {/* Left curved section */}
        <CuboidCollider args={[trackWidth/2, 0.1, radius]} position={[-straightLength/2, 0, 0]} />
      </RigidBody>
      
      {/* Track markings */}
      <group position={[0, 0.01, 0]}>
        {/* Start/Finish line - positioned at track center on bottom straight */}
        <mesh position={[0, 0, -radius]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[trackWidth, 1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        
        {/* Center line markings on straights */}
        <mesh position={[0, 0, -radius]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[straightLength, 0.2]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
        <mesh position={[0, 0, radius]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[straightLength, 0.2]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
      </group>
    </group>
  )
}

export default Track