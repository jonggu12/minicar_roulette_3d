import React, { useRef, Suspense, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, RapierRigidBody} from '@react-three/rapier'
import { Mesh } from 'three'
import PhysicsTrack from './PhysicsTrack'
import TestTrack from '../../Archive/TestTrack'

const USE_TEST_BALL = false

const PhysicsContent: React.FC = () => {
  const meshRef = useRef<Mesh>(null)
  const ballRef = useRef<RapierRigidBody>(null)
  
  useEffect(() => {
    if (!USE_TEST_BALL) return
    const timer = setTimeout(() => {
      // Real rolling setup - initial velocity only, no angular velocity
      if (ballRef.current) {
        ballRef.current.setLinvel({ x: 4.0, y: 0, z: 0 }, true)
        // No setAngvel - let friction create natural rolling
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [])
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.3
    }
    
    // No artificial torque - pure physics-based rolling
  })

  return (
    <>
      {/* Test Track - Simple straight track for testing */}
      <TestTrack 
        length={40}
        width={8}
        height={0.2}
      />
    </>
  )
}

const PhysicsScene: React.FC = () => {
  return (
    <Suspense fallback={<mesh><boxGeometry /><meshBasicMaterial color="red" /></mesh>}>
      <Physics gravity={[0, -9.81, 0]} timeStep={1/60} interpolate debug>
        <PhysicsContent />
      </Physics>
    </Suspense>
  )
}

export default PhysicsScene
