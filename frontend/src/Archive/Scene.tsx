import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import Track from '../../Archive/Track'

const Scene: React.FC = () => {
  // Reference for animated cube
  const meshRef = useRef<Mesh>(null)
  
  // Animate the cube rotation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <>
      {/* Oval Racing Track */}
      <Track 
        innerRadius={6}
        outerRadius={10}
        trackWidth={4}
        height={0.2}
      />
      
      {/* Ground plane around track */}
      <RigidBody type="fixed" position={[0, -1, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <CuboidCollider args={[20, 0.1, 20]} />
      </RigidBody>
      
      {/* Test physics objects on track */}
      <RigidBody position={[0, 2, 8]} restitution={0.05}>
        <mesh>
          <boxGeometry args={[0.5, 0.3, 1]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </RigidBody>
      
      <RigidBody position={[-2, 2, 8]} restitution={0.06}>
        <mesh>
          <boxGeometry args={[0.5, 0.3, 1]} />
          <meshStandardMaterial color="#4ecdc4" />
        </mesh>
      </RigidBody>
      
      <RigidBody position={[2, 2, 8]} restitution={0.04}>
        <mesh>
          <boxGeometry args={[0.5, 0.3, 1]} />
          <meshStandardMaterial color="#45b7d1" />
        </mesh>
      </RigidBody>
      
      {/* Reference animated cube */}
      <mesh ref={meshRef} position={[0, 3, 15]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#ffa500" wireframe />
      </mesh>
    </>
  )
}

export default Scene
