import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import PhysicsScene from './components/3d/PhysicsScene'

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 10, 20], fov: 50 }}>
      {/* Scene background */}
      <color attach="background" args={['#ffffff']} />
      
      {/* Lights so StandardMaterial objects are visible */}
      <hemisphereLight intensity={0.35} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <ambientLight intensity={0.2} />
            
      {/* Physics scene with Rapier */}
      <PhysicsScene />
      
      {/* Camera controls */}
      <OrbitControls enableDamping />
    </Canvas>
  )
}