import React, { useState } from 'react'

export type MapType = 'oval' | 'square' | 'slope'

export interface MapConfig {
  id: MapType
  name: string
  description: string
  preview?: string
}

const mapConfigs: MapConfig[] = [
  {
    id: 'oval',
    name: '오벌 트랙 (인디500)',
    description: '고속 타원형 레이싱 트랙\n웨이포인트 시스템 포함'
  },
  {
    id: 'square',
    name: '정사각형 테스트 맵',
    description: '넓은 정사각형 공간\n자유 주행 및 물리 테스트용'
  }
  ,{
    id: 'slope',
    name: '경사/착지 테스트 맵',
    description: '경사 정렬 · 소프트 랜딩 검증\nR로 리스폰, 옵션 토글 제공'
  }
]

interface MapSelectorProps {
  selectedMap: MapType
  onMapChange: (mapType: MapType) => void
  className?: string
}

const MapSelector: React.FC<MapSelectorProps> = ({
  selectedMap,
  onMapChange,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={`map-selector ${className}`} style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      minWidth: isCollapsed ? '60px' : '280px',
      transition: 'all 0.3s ease-in-out'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {!isCollapsed && (
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600'
          }}>
            🗺️ 맵 선택
          </h3>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px'
          }}
        >
          {isCollapsed ? '📍' : '◀️'}
        </button>
      </div>

      {/* Map Options */}
      {!isCollapsed && (
        <div style={{ padding: '8px' }}>
          {mapConfigs.map((mapConfig) => (
            <div
              key={mapConfig.id}
              onClick={() => onMapChange(mapConfig.id)}
              style={{
                padding: '12px',
                margin: '4px 0',
                borderRadius: '6px',
                cursor: 'pointer',
                border: selectedMap === mapConfig.id 
                  ? '2px solid #4CAF50' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedMap === mapConfig.id 
                  ? 'rgba(76, 175, 80, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (selectedMap !== mapConfig.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedMap !== mapConfig.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '500',
                  color: selectedMap === mapConfig.id ? '#4CAF50' : 'white'
                }}>
                  {mapConfig.name}
                </h4>
                {selectedMap === mapConfig.id && (
                  <span style={{
                    fontSize: '12px',
                    color: '#4CAF50'
                  }}>
                    ✓
                  </span>
                )}
              </div>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.4',
                whiteSpace: 'pre-line'
              }}>
                {mapConfig.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Current Map Display */}
      {!isCollapsed && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '4px'
          }}>
            현재 맵:
          </div>
          <div style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#4CAF50'
          }}>
            {mapConfigs.find(m => m.id === selectedMap)?.name || 'Unknown'}
          </div>
        </div>
      )}

      {/* Controls Info */}
      {!isCollapsed && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
          lineHeight: '1.3'
        }}>
          🎮 <strong>조작법:</strong><br/>
          WASD: 차량 조작<br/>
          스페이스: 브레이크<br/>
          마우스: 카메라 조작
        </div>
      )}
    </div>
  )
}

export default MapSelector
