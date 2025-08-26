import React from 'react'
import TestTrackWithWaypoints from './components/3d/TestTrackWithWaypoints'

export default function App() {
  return (
    <TestTrackWithWaypoints 
      showWaypoints={true}
      showSpeeds={true}
      showDirections={false}
      showNormals={false}
      numCars={4}
    />
  )
}