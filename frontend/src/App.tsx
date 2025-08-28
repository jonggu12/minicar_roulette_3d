import React, { useState } from 'react'
import TestTrackWithWaypoints from './components/3d/TestTrackWithWaypoints'
import SquareTestMap from './components/3d/SquareTestMap'
import MapSelector, { MapType } from './components/ui/MapSelector'

export default function App() {
  const [selectedMap, setSelectedMap] = useState<MapType>('oval')

  const handleMapChange = (mapType: MapType) => {
    setSelectedMap(mapType)
  }

  const renderCurrentMap = () => {
    switch (selectedMap) {
      case 'oval':
        return (
          <TestTrackWithWaypoints 
            showWaypoints={true}
            showSpeeds={true}
            showDirections={false}
            showNormals={false}
            numCars={1}  // AI 차량들 비활성화 - 플레이어 차량만
          />
        )
      case 'square':
        return (
          <SquareTestMap 
            numCars={1}  // 플레이어 차량 1대만
          />
        )
      default:
        return null
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 맵 선택 UI */}
      <MapSelector 
        selectedMap={selectedMap}
        onMapChange={handleMapChange}
      />
      
      {/* 선택된 맵 렌더링 */}
      {renderCurrentMap()}
    </div>
  )
}