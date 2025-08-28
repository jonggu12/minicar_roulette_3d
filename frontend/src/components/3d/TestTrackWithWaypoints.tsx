import React, { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Track from '../../Archive/Track'
import PhysicsCar from './PhysicsCar'
import WaypointVisualizer from './WaypointVisualizer'
import CircularTrackBarriers from './CircularTrackBarriers'
import { TrackWaypointSystem } from './utils/waypointSystem'

interface TestTrackWithWaypointsProps {
  showWaypoints?: boolean
  showSpeeds?: boolean
  showDirections?: boolean
  showNormals?: boolean
  numCars?: number
}

const TestTrackWithWaypoints: React.FC<TestTrackWithWaypointsProps> = ({
  showWaypoints = true,
  showSpeeds = false,
  showDirections = false,
  showNormals = false,
  numCars = 4
}) => {
  const [isDebugMode, setIsDebugMode] = useState(true)

  // Create waypoint system with wider track for better racing
  const waypointSystem = useMemo(() => {
    return new TrackWaypointSystem(
      {
        // Much wider track config for better racing
        outerRadius: 28,         // Increased from 20 to 28
        innerRadius: 12,         // Keep inner radius same
        trackWidth: 16           // Doubled from 8 to 16 (much wider racing surface)
      },
      {
        // Waypoint config optimized for Indy500 racing
        straightSpacing: 4.0,    // Wide spacing on long straights
        cornerSpacing: 0.8,      // Tight spacing on sharp corners  
        speedLimit: 18,          // Very high speed on straights
        cornerSpeedFactor: 0.35, // Much slower in tight corners
        maxLateralAccel: 9.0     // High lateral acceleration for sharp turns
      }
    )
  }, [])

  // Generate starting positions along the start/finish line
  const startPositions = useMemo(() => {
    const waypoints = waypointSystem.getWaypoints()
    const startFinishWaypoint = waypoints.find(wp => wp.type === 'start_finish')
    
    if (!startFinishWaypoint) {
      // Fallback to 2x2 grid formation at track center line
      const width = 28 * 2 // outerRadius * 2
      const straightLength = width * 0.8 // 44.8m
      const curveRadius = width * 0.2 // 11.2m
      const trackWidth = 16
      const racingLineRadius = (curveRadius + (curveRadius - trackWidth/2)) / 2  // Track center
      
      const positions: [number, number, number][] = []
      const carsPerRow = 2
      const rowSpacing = 4.0
      const carSpacing = 3.0
      
      for (let i = 0; i < numCars; i++) {
        const row = Math.floor(i / carsPerRow)
        const col = i % carsPerRow
        positions.push([
          (col - 0.5) * carSpacing,  // Side-to-side
          0.5,
          -racingLineRadius - (row * rowSpacing)  // Back from start line
        ])
      }
      return positions
    }

    // Create 2x2 grid starting positions at waypoint center line
    const positions: [number, number, number][] = []
    const carsPerRow = 2
    const rowSpacing = 4.0     // 4m between rows  
    const carSpacing = 3.0     // 3m between cars in same row

    for (let i = 0; i < numCars; i++) {
      const row = Math.floor(i / carsPerRow)
      const col = i % carsPerRow
      
      // Start from waypoint position (already at track center)
      const basePos = startFinishWaypoint.position.clone()
      
      // Move backwards along track direction for starting grid formation
      const backwardOffset = startFinishWaypoint.direction.clone()
        .multiplyScalar(-rowSpacing * row)
      
      // Side-to-side positioning - tighter formation for 2x2 grid
      const sideOffset = startFinishWaypoint.normalLeft.clone()
        .multiplyScalar((col - 0.5) * carSpacing)
      
      const finalPos = basePos.clone().add(backwardOffset).add(sideOffset)
      positions.push([finalPos.x, 0.5, finalPos.z])
    }

    return positions
  }, [waypointSystem, numCars])

  // Car colors for visual distinction
  const carColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#8844ff']

  // Debug info display
  const debugInfo = useMemo(() => {
    const waypoints = waypointSystem.getWaypoints()
    const totalDistance = waypoints.reduce((sum, wp) => sum + wp.distanceToNext, 0)
    const avgSpeed = waypoints.reduce((sum, wp) => sum + wp.targetSpeed, 0) / waypoints.length
    
    return {
      totalWaypoints: waypoints.length,
      totalDistance: totalDistance.toFixed(1),
      avgSpeed: avgSpeed.toFixed(1),
      straightWaypoints: waypoints.filter(wp => wp.type === 'straight').length,
      cornerWaypoints: waypoints.filter(wp => wp.type === 'corner').length,
      startFinishWaypoints: waypoints.filter(wp => wp.type === 'start_finish').length
    }
  }, [waypointSystem])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Debug UI */}
      {isDebugMode && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 100,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <h3>Waypoint System Debug</h3>
          <p>Total Waypoints: {debugInfo.totalWaypoints}</p>
          <p>Track Distance: {debugInfo.totalDistance}m</p>
          <p>Average Speed: {debugInfo.avgSpeed} m/s</p>
          <p>Straight: {debugInfo.straightWaypoints} | Corner: {debugInfo.cornerWaypoints}</p>
          <p>Start/Finish: {debugInfo.startFinishWaypoints}</p>
          
          <div style={{ marginTop: '10px' }}>
            <label>
              <input 
                type="checkbox" 
                checked={showWaypoints} 
                onChange={() => {}} 
                disabled
              />
              Show Waypoints
            </label>
            <br />
            <label>
              <input 
                type="checkbox" 
                checked={showSpeeds} 
                onChange={() => {}} 
                disabled
              />
              Show Speed Indicators
            </label>
            <br />
            <label>
              <input 
                type="checkbox" 
                checked={showDirections} 
                onChange={() => {}} 
                disabled
              />
              Show Direction Arrows
            </label>
            <br />
            <label>
              <input 
                type="checkbox" 
                checked={showNormals} 
                onChange={() => {}} 
                disabled
              />
              Show Lane Normals
            </label>
          </div>
          
          <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
            <p>🟢 Start/Finish | 🔵 Straight | 🟡🔴 Corner (speed-based)</p>
            <p>⚪ White line: Racing line</p>
            <p>🔴 Red oval: Outer barrier | 🔵 Blue oval: Inner barrier</p>
            <p>🏁 Checkered flag: Start/Finish line marker</p>
            <p>🎮 WASD: Drive red car | Space: Brake | Mouse: Camera</p>
          </div>
        </div>
      )}

      {/* Toggle debug button */}
      <button
        onClick={() => setIsDebugMode(!isDebugMode)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 100,
          padding: '10px',
          background: 'rgba(255,255,255,0.9)',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {isDebugMode ? 'Hide Debug' : 'Show Debug'}
      </button>

      <Canvas camera={{ position: [0, 45, 45], fov: 65 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />

        <Physics gravity={[0, -9.81, 0]} debug={true}>
          {/* Track - much wider for better racing */}
          <Track 
            innerRadius={12}         // Keep same
            outerRadius={28}         // Increased from 20 to 28
            trackWidth={16}          // Doubled from 8 to 16
            height={0.2}
          />

          {/* Circular track barriers following oval shape */}
          <CircularTrackBarriers
            innerRadius={12}
            outerRadius={28}
            barrierHeight={2.5}      // 2.5m high barriers
            barrierThickness={1.0}   // 1m thick barriers
            segments={80}            // 80 segments for smooth curves
          />

          {/* Test cars positioned at starting grid */}
          {startPositions.slice(0, numCars).map((position, index) => (
            <PhysicsCar
              key={`car-${index}`}
              position={position}
              rotation={[0, Math.PI, 0]} // Face forward along track
              color={carColors[index % carColors.length]}
              name={`Car ${index + 1}`}
              autoControl={index > 0} // First car is player controlled, others are AI
              // 기본값(느린 속도/부드러운 조향)을 사용하도록 고성능 오버라이드 제거
            />
          ))}

          {/* Waypoint visualization */}
          <WaypointVisualizer
            waypointSystem={waypointSystem}
            visible={showWaypoints}
            showSpeeds={showSpeeds}
            showDirections={showDirections}
            showNormals={showNormals}
          />

          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            target={[0, 0, 0]}
          />
        </Physics>
      </Canvas>
    </div>
  )
}

export default TestTrackWithWaypoints
