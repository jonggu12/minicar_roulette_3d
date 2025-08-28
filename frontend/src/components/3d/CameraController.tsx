import React, { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'

export enum CameraView {
  OVERVIEW = 'overview',
  FOLLOW = 'follow'
}

interface CameraControllerProps {
  currentView: CameraView
  playerCarRef?: React.RefObject<RapierRigidBody | null>
  onViewChange?: (view: CameraView) => void
}

export const CameraController: React.FC<CameraControllerProps> = ({ 
  currentView, 
  playerCarRef,
  onViewChange 
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const orbitControlsRef = useRef<any>(null)
  const { set } = useThree()
  // FOLLOW 뷰 줌 파라미터
  const followZoom = useRef({
    distance: 8,         // 현재 거리 (스무딩 반영)
    targetDistance: 8,   // 목표 거리 (휠 입력)
    min: 4,              // 최소 거리 (가까이)
    max: 18,             // 최대 거리 (멀리)
    baseHeight: 3.2,     // 기본 높이
    heightSlope: 0.12,   // 거리 증가에 따른 높이 증가 비율
  })

  // V 키 입력 처리
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'v') {
        const nextView = currentView === CameraView.OVERVIEW 
          ? CameraView.FOLLOW 
          : CameraView.OVERVIEW
        
        if (onViewChange) {
          onViewChange(nextView)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [currentView, onViewChange])

  // OrbitControls 활성화/비활성화
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = currentView === CameraView.OVERVIEW
    }
  }, [currentView])

  // FOLLOW 뷰에서 마우스 휠로 줌 인/아웃
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (currentView !== CameraView.FOLLOW) return
      // 페이지 스크롤 방지
      e.preventDefault()
      // deltaY > 0: 줌 아웃(거리 증가), deltaY < 0: 줌 인(거리 감소)
      const step = e.deltaY * 0.02
      const z = followZoom.current
      z.targetDistance = THREE.MathUtils.clamp(z.targetDistance + step, z.min, z.max)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel as any)
  }, [currentView])

  // 카메라 위치 및 회전 업데이트
  useFrame(() => {
    if (!cameraRef.current) return

    const camera = cameraRef.current

    // FOLLOW 모드에서만 수동 카메라 제어
    if (currentView === CameraView.FOLLOW && playerCarRef?.current) {
      // 플레이어 차량 후방 추적 카메라 (3인칭 레이싱 게임 스타일)
      const playerCar = playerCarRef.current
      const carTranslation = playerCar.translation()
      const carRotation = playerCar.rotation()
      
      // RapierRigidBody의 위치와 회전 사용
      const carPosition = new THREE.Vector3(carTranslation.x, carTranslation.y, carTranslation.z)
      const carQuaternion = new THREE.Quaternion(carRotation.x, carRotation.y, carRotation.z, carRotation.w)
      
      // FOLLOW 뷰 줌 스무딩
      const z = followZoom.current
      z.distance = THREE.MathUtils.lerp(z.distance, z.targetDistance, 0.15)
      const camHeight = z.baseHeight + (z.distance - 8) * z.heightSlope
      // 3인칭 레이싱 게임 스타일: 차량 뒤쪽(로컬 -X)에서 약간 위로 배치
      // 차량의 로컬 전방은 +X이므로 뒤쪽은 -X 방향으로 오프셋을 준다.
      const offset = new THREE.Vector3(-z.distance, camHeight, 0)
      
      // 차량의 회전을 적용하여 오프셋 계산
      offset.applyQuaternion(carQuaternion)
      const cameraPosition = carPosition.clone().add(offset)
      
      // 부드러운 카메라 추적
      const lerpFactor = 0.08
      camera.position.lerp(cameraPosition, lerpFactor)
      
      // 카메라가 차량의 약간 앞을 바라보도록(시야 확보)
      const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(carQuaternion)
      const lookAtPosition = carPosition.clone().add(forward.multiplyScalar(3))
      lookAtPosition.y += 1 // 차량 중앙보다 약간 위

      camera.lookAt(lookAtPosition)
    }
  })

  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current })
    }
  }, [set])

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 45, 45]}
        fov={65}
      />
      
      {/* OrbitControls는 OVERVIEW 모드에서만 활성화 */}
      <OrbitControls
        ref={orbitControlsRef}
        enabled={currentView === CameraView.OVERVIEW}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={[0, 0, 0]}
      />
    </>
  )
}

export default CameraController
