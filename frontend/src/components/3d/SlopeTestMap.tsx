import React, { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import PhysicsCar from './PhysicsCar'
import CameraController, { CameraView } from './CameraController'

const SlopeTestMap: React.FC = () => {
  const [cameraView, setCameraView] = useState<CameraView>(CameraView.OVERVIEW)
  const carRef = useRef<RapierRigidBody>(null)

  // Assist toggles
  // 경사/착지 보조 제거됨: 단순 비교 토글 제거

  // Respawn helper
  const respawn = () => {
    const rb = carRef.current
    if (!rb) return
    rb.setTranslation({ x: -60, y: 1.0, z: 0 }, true)
    rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); respawn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const slopeAngle = THREE.MathUtils.degToRad(12) // 12° gentle ramp (uphill toward +X)
  const kickerAngle = THREE.MathUtils.degToRad(18) // small jump kicker

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 100,
        background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 12, borderRadius: 8,
        fontFamily: 'monospace', fontSize: 12, border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#4CAF50' }}>⛰️ 경사/착지 테스트</h3>
        <div style={{ marginBottom: 8 }}>R: 리스폰, V: 카메라 전환, WASD: 수동 조작</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>
          R: 리스폰, V: 카메라 전환, WASD: 수동 조작
        </div>
      </div>

      <Canvas camera={{ position: [0, 45, 70], fov: 65 }}>
        <CameraController currentView={cameraView} playerCarRef={carRef} onViewChange={setCameraView} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[30, 50, 20]} intensity={1.1} />

        <Physics gravity={[0, -9.81, 0]} timeStep={1/60} debug={true}>
          {/* Base ground */}
          <RigidBody type="fixed" position={[0, -0.1, 0]} colliders={false}>
            <CuboidCollider args={[80, 0.1, 40]} friction={1.0} restitution={0.02} />
            <mesh>
              <boxGeometry args={[160, 0.2, 80]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.85} />
            </mesh>
          </RigidBody>

          {/* Long slope along +X (rotate around Z, positive = uphill) */}
          <RigidBody type="fixed" position={[0, 0, 0]} rotation={[0, 0, slopeAngle]} colliders={false}>
            <CuboidCollider args={[30, 0.2, 12]} friction={1.0} restitution={0.02} />
            <mesh>
              <boxGeometry args={[60, 0.4, 24]} />
              <meshStandardMaterial color="#3a3a3a" />
            </mesh>
          </RigidBody>

          {/* Small kicker near end to induce a short jump (uphill) */}
          <RigidBody type="fixed" position={[28, 0, 0]} rotation={[0, 0, kickerAngle]} colliders={false}>
            <CuboidCollider args={[6, 0.2, 8]} friction={1.0} restitution={0.02} />
            <mesh>
              <boxGeometry args={[12, 0.4, 16]} />
              <meshStandardMaterial color="#4a4a4a" />
            </mesh>
          </RigidBody>

          {/* Landing flat zone */}
          <RigidBody type="fixed" position={[50, 0, 0]} colliders={false}>
            <CuboidCollider args={[30, 0.1, 20]} friction={1.0} restitution={0.02} />
            <mesh>
              <boxGeometry args={[60, 0.2, 40]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
          </RigidBody>

          {/* Car */}
          <PhysicsCar
            ref={carRef}
            position={[-60, 1.0, 0]}
            rotation={[0, 0, 0]}
            color={'#ff8844'}
            name={'AI-Slope'}
            autoControl={true}
            enabledRotations={[false, true, false]}
            maxSpeed={14}
            engineForce={5200}
            mu={0.9}
            autopilot={() => ({ throttle: 0.6 })}
          />
        </Physics>
      </Canvas>
    </div>
  )
}

export default SlopeTestMap
