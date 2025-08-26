import React, { useMemo } from 'react'
import { TrackWaypointSystem } from './utils/waypointSystem'
import * as THREE from 'three'

interface WaypointVisualizerProps {
  waypointSystem: TrackWaypointSystem
  visible?: boolean
  showSpeeds?: boolean
  showDirections?: boolean
  showNormals?: boolean
}

const WaypointVisualizer: React.FC<WaypointVisualizerProps> = ({
  waypointSystem,
  visible = true,
  showSpeeds = true,
  showDirections = false,
  showNormals = false
}) => {
  const waypoints = useMemo(() => waypointSystem.getWaypoints(), [waypointSystem])

  // Create waypoint markers geometry
  const waypointGeometry = useMemo(() => {
    const positions = new Float32Array(waypoints.length * 3)
    const colors = new Float32Array(waypoints.length * 3)

    waypoints.forEach((waypoint, index) => {
      const i = index * 3
      
      // Position
      positions[i] = waypoint.position.x
      positions[i + 1] = waypoint.position.y + 0.2 // Slightly above track
      positions[i + 2] = waypoint.position.z

      // Color based on waypoint type and speed
      let color: THREE.Color
      switch (waypoint.type) {
        case 'start_finish':
          color = new THREE.Color(0x00ff00) // Green for start/finish
          break
        case 'corner':
          // Red to yellow based on speed (slower = more red)
          const speedRatio = waypoint.targetSpeed / 12 // Normalize to max speed
          color = new THREE.Color().setHSL(speedRatio * 0.17, 1, 0.5) // 0.17 = 60 degrees (yellow)
          break
        case 'straight':
        default:
          color = new THREE.Color(0x0088ff) // Blue for straights
          break
      }

      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geometry
  }, [waypoints])

  // Create racing line geometry
  const racingLineGeometry = useMemo(() => {
    const positions = new Float32Array(waypoints.length * 3)

    waypoints.forEach((waypoint, index) => {
      const i = index * 3
      positions[i] = waypoint.position.x
      positions[i + 1] = waypoint.position.y + 0.05 // Just above track surface
      positions[i + 2] = waypoint.position.z
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    return geometry
  }, [waypoints])

  // Direction arrows (optional)
  const directionArrows = useMemo(() => {
    if (!showDirections) return []

    return waypoints.filter((_, index) => index % 3 === 0).map((waypoint, index) => {
      const start = waypoint.position.clone()
      start.y += 0.3
      
      const end = start.clone().add(waypoint.direction.clone().multiplyScalar(1.5))

      return (
        <group key={`arrow-${waypoint.id}`}>
          {/* Arrow shaft */}
          <mesh position={start.clone().lerp(end, 0.5).toArray()}>
            <cylinderGeometry args={[0.05, 0.05, 1.5]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
          
          {/* Arrow head */}
          <mesh position={end.toArray()}>
            <coneGeometry args={[0.15, 0.3]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
        </group>
      )
    })
  }, [waypoints, showDirections])

  // Speed indicators (optional)
  const speedIndicators = useMemo(() => {
    if (!showSpeeds) return []

    return waypoints.filter((_, index) => index % 4 === 0).map((waypoint) => {
      const position = waypoint.position.clone()
      position.y += 1.0

      return (
        <mesh key={`speed-${waypoint.id}`} position={position.toArray()}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial 
            color={waypoint.targetSpeed > 10 ? "#00ff00" : waypoint.targetSpeed > 6 ? "#ffff00" : "#ff0000"} 
          />
        </mesh>
      )
    })
  }, [waypoints, showSpeeds])

  // Normal vectors (for lane offset debugging)
  const normalVectors = useMemo(() => {
    if (!showNormals) return []

    const normals: React.ReactElement[] = []

    waypoints.filter((_, index) => index % 5 === 0).forEach((waypoint) => {
      const basePos = waypoint.position.clone()
      basePos.y += 0.4

      // Left normal (cyan) - using simple mesh lines instead of line geometry
      const leftEnd = basePos.clone().add(waypoint.normalLeft.clone().multiplyScalar(1.0))
      const leftDirection = leftEnd.clone().sub(basePos)
      const leftMidpoint = basePos.clone().lerp(leftEnd, 0.5)
      
      normals.push(
        <mesh key={`normal-left-${waypoint.id}`} position={leftMidpoint.toArray()}>
          <cylinderGeometry args={[0.02, 0.02, leftDirection.length()]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )

      // Right normal (magenta)
      const rightEnd = basePos.clone().add(waypoint.normalRight.clone().multiplyScalar(1.0))
      const rightDirection = rightEnd.clone().sub(basePos)
      const rightMidpoint = basePos.clone().lerp(rightEnd, 0.5)
      
      normals.push(
        <mesh key={`normal-right-${waypoint.id}`} position={rightMidpoint.toArray()}>
          <cylinderGeometry args={[0.02, 0.02, rightDirection.length()]} />
          <meshBasicMaterial color="#ff00ff" />
        </mesh>
      )
    })

    return normals
  }, [waypoints, showNormals])

  if (!visible) return null

  return (
    <group name="waypoint-visualizer">
      {/* Racing line */}
      <primitive object={new THREE.Line(racingLineGeometry, new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.7 }))} />

      {/* Waypoint markers */}
      <points geometry={waypointGeometry}>
        <pointsMaterial 
          size={0.3} 
          vertexColors 
          sizeAttenuation 
          transparent 
          opacity={0.8}
        />
      </points>

      {/* Direction arrows */}
      {directionArrows}

      {/* Speed indicators */}
      {speedIndicators}

      {/* Normal vectors */}
      {normalVectors}

      {/* Start/finish line marker */}
      {waypoints
        .filter(wp => wp.type === 'start_finish')
        .map(waypoint => (
          <mesh 
            key={`start-finish-${waypoint.id}`} 
            position={[waypoint.position.x, waypoint.position.y + 0.5, waypoint.position.z]}
          >
            <boxGeometry args={[0.5, 1.0, 0.1]} />
            <meshStandardMaterial 
              color="#00ff00" 
              transparent 
              opacity={0.8}
              emissive="#004400"
            />
          </mesh>
        ))
      }
    </group>
  )
}

export default WaypointVisualizer