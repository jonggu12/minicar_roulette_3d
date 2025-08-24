import React, { forwardRef } from 'react'
import { Group } from 'three'

interface CarProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  name?: string
  scale?: number
}

const Car = forwardRef<Group, CarProps>(({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  color = '#ff6b6b',
  name = 'Mini 4WD',
  scale = 1
}, ref) => {
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>

      {/* === 메인 차체 === */}
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.5, 1.0]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* 루프 */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.3, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* === 4개 휠 (단순화) === */}
      {/* Front Left */}
      <group position={[0.7, -0.1, 0.6]} rotation={[Math.PI/2, 0, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Front Right */}
      <group position={[0.7, -0.1, -0.6]} rotation={[Math.PI/2, 0, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Rear Left */}
      <group position={[-0.7, -0.1, 0.6]} rotation={[Math.PI/2, 0, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Rear Right */}
      <group position={[-0.7, -0.1, -0.6]} rotation={[Math.PI/2, 0, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
    </group>
  )
})

Car.displayName = 'Car'
export default Car
