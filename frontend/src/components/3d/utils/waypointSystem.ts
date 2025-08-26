import { Vector3 } from 'three'

// Waypoint data structure
export interface Waypoint {
  id: number
  position: Vector3
  targetSpeed: number  // m/s - optimal speed for this section
  radius: number       // radius of curvature (Infinity for straights)
  type: 'straight' | 'corner' | 'start_finish'
  curvature: number    // 1/radius (0 for straights)
  direction: Vector3   // normalized direction vector
  normalLeft: Vector3  // left side normal (for lane offsets)
  normalRight: Vector3 // right side normal (for lane offsets)
  distanceToNext: number // distance to next waypoint
  sectionProgress: number // 0-1 progress through current section
}

// Track configuration matching Track.tsx
export interface TrackConfig {
  outerRadius: number    // default: 12
  innerRadius: number    // default: 8  
  trackWidth: number     // default: 4
  straightLength: number // calculated: outerRadius * 2 * 0.6
  curveRadius: number    // calculated: outerRadius * 2 * 0.4
}

// Waypoint generation configuration
export interface WaypointConfig {
  straightSpacing: number    // spacing between waypoints on straights (default: 2m)
  cornerSpacing: number      // spacing between waypoints on corners (default: 1m)
  speedLimit: number         // max speed limit (default: 12 m/s)
  cornerSpeedFactor: number  // speed reduction in corners (default: 0.6)
  maxLateralAccel: number    // max lateral acceleration for corners (default: 7 m/s²)
}

export class TrackWaypointSystem {
  private waypoints: Waypoint[] = []
  private trackConfig: TrackConfig
  private waypointConfig: WaypointConfig

  constructor(
    trackConfig: Partial<TrackConfig> = {},
    waypointConfig: Partial<WaypointConfig> = {}
  ) {
    // Default track config matching Track.tsx
    this.trackConfig = {
      outerRadius: 12,
      innerRadius: 8,
      trackWidth: 4,
      ...trackConfig,
      straightLength: 0, // Will be calculated
      curveRadius: 0     // Will be calculated
    }

    // Calculate derived values for Indy500 style
    const width = this.trackConfig.outerRadius * 2
    this.trackConfig.straightLength = width * 0.8  // Longer straights
    this.trackConfig.curveRadius = width * 0.2     // Tighter corners

    // Default waypoint config for Indy500 style
    this.waypointConfig = {
      straightSpacing: 4.0,      // Wider spacing on long straights
      cornerSpacing: 0.8,        // Tighter spacing on sharp corners  
      speedLimit: 16,            // Higher speed on straights
      cornerSpeedFactor: 0.4,    // Much slower in tight corners
      maxLateralAccel: 8.0,      // Higher for sharp turns
      ...waypointConfig
    }

    this.generateWaypoints()
  }

  private generateWaypoints(): void {
    const waypoints: Waypoint[] = []
    let waypointId = 0

    const { straightLength, curveRadius } = this.trackConfig
    const { straightSpacing, cornerSpacing } = this.waypointConfig

    // Calculate track center line position
    // Track.tsx: outer boundary at curveRadius, inner boundary at curveRadius - trackWidth/2
    // Track center (racing line) should be halfway between outer and inner boundaries
    const trackOuterRadius = curveRadius
    const trackInnerRadius = curveRadius - this.trackConfig.trackWidth/2
    const racingLineRadius = (trackOuterRadius + trackInnerRadius) / 2  // Center of driveable area

    // Generate waypoints for each section of the oval
    
    // 1. Bottom straight section (left to right) - at track center line
    const bottomStraightStart = new Vector3(-straightLength/2, 0, -racingLineRadius)
    const bottomStraightEnd = new Vector3(straightLength/2, 0, -racingLineRadius)
    const bottomStraightWaypoints = this.generateStraightWaypoints(
      waypointId, bottomStraightStart, bottomStraightEnd, straightSpacing, 'straight'
    )
    waypoints.push(...bottomStraightWaypoints)
    waypointId += bottomStraightWaypoints.length

    // 2. Right semicircle (bottom to top) - at track center line
    const rightCurveCenter = new Vector3(straightLength/2, 0, 0)
    const rightCurveWaypoints = this.generateCurveWaypoints(
      waypointId, rightCurveCenter, racingLineRadius, -Math.PI/2, Math.PI/2, cornerSpacing, 'corner'
    )
    waypoints.push(...rightCurveWaypoints)
    waypointId += rightCurveWaypoints.length

    // 3. Top straight section (right to left) - at track center line
    const topStraightStart = new Vector3(straightLength/2, 0, racingLineRadius)
    const topStraightEnd = new Vector3(-straightLength/2, 0, racingLineRadius)
    const topStraightWaypoints = this.generateStraightWaypoints(
      waypointId, topStraightStart, topStraightEnd, straightSpacing, 'straight'
    )
    waypoints.push(...topStraightWaypoints)
    waypointId += topStraightWaypoints.length

    // 4. Left semicircle (top to bottom) - includes start/finish, at track center line
    const leftCurveCenter = new Vector3(-straightLength/2, 0, 0)
    const leftCurveWaypoints = this.generateCurveWaypoints(
      waypointId, leftCurveCenter, racingLineRadius, Math.PI/2, 3*Math.PI/2, cornerSpacing, 'corner'
    )
    waypoints.push(...leftCurveWaypoints)

    // Mark start/finish waypoint (crossing the finish line) - at track center line
    const startFinishIndex = waypoints.findIndex(wp => 
      Math.abs(wp.position.x) < 2 && Math.abs(wp.position.z - (-racingLineRadius)) < 1
    )
    if (startFinishIndex >= 0) {
      waypoints[startFinishIndex].type = 'start_finish'
    }

    // Calculate distances to next waypoint and optimize speeds
    this.calculateWaypointDistances(waypoints)
    this.optimizeWaypointSpeeds(waypoints)

    this.waypoints = waypoints
  }

  private generateStraightWaypoints(
    startId: number,
    start: Vector3,
    end: Vector3,
    spacing: number,
    type: Waypoint['type']
  ): Waypoint[] {
    const waypoints: Waypoint[] = []
    const direction = end.clone().sub(start).normalize()
    const distance = start.distanceTo(end)
    const numWaypoints = Math.ceil(distance / spacing)

    for (let i = 0; i < numWaypoints; i++) {
      const progress = i / Math.max(1, numWaypoints - 1)
      const position = start.clone().lerp(end, progress)
      
      // Calculate perpendicular normals for lane offsets
      const normalLeft = new Vector3(-direction.z, 0, direction.x).normalize()
      const normalRight = normalLeft.clone().multiplyScalar(-1)

      const waypoint: Waypoint = {
        id: startId + i,
        position,
        targetSpeed: this.waypointConfig.speedLimit,
        radius: Infinity,
        type,
        curvature: 0,
        direction: direction.clone(),
        normalLeft,
        normalRight,
        distanceToNext: 0, // Will be calculated later
        sectionProgress: progress
      }

      waypoints.push(waypoint)
    }

    return waypoints
  }

  private generateCurveWaypoints(
    startId: number,
    center: Vector3,
    radius: number,
    startAngle: number,
    endAngle: number,
    spacing: number,
    type: Waypoint['type']
  ): Waypoint[] {
    const waypoints: Waypoint[] = []
    
    // Calculate arc length and number of waypoints
    const arcLength = Math.abs(endAngle - startAngle) * radius
    const numWaypoints = Math.ceil(arcLength / spacing)
    
    for (let i = 0; i < numWaypoints; i++) {
      const progress = i / Math.max(1, numWaypoints - 1)
      const angle = startAngle + (endAngle - startAngle) * progress
      
      // Position on circle
      const position = new Vector3(
        center.x + radius * Math.cos(angle),
        0,
        center.z + radius * Math.sin(angle)
      )

      // Tangent direction (perpendicular to radius)
      const direction = new Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize()

      // Calculate curvature and target speed
      const curvature = 1 / radius
      const maxSpeed = Math.sqrt(this.waypointConfig.maxLateralAccel / curvature)
      const targetSpeed = Math.min(maxSpeed, this.waypointConfig.speedLimit * this.waypointConfig.cornerSpeedFactor)

      // Lane offset normals (left points inward, right points outward for this curve)
      const toCenter = center.clone().sub(position).normalize()
      const normalLeft = toCenter.clone()
      const normalRight = toCenter.clone().multiplyScalar(-1)

      const waypoint: Waypoint = {
        id: startId + i,
        position,
        targetSpeed,
        radius,
        type,
        curvature,
        direction,
        normalLeft,
        normalRight,
        distanceToNext: 0, // Will be calculated later
        sectionProgress: progress
      }

      waypoints.push(waypoint)
    }

    return waypoints
  }

  private calculateWaypointDistances(waypoints: Waypoint[]): void {
    for (let i = 0; i < waypoints.length; i++) {
      const current = waypoints[i]
      const next = waypoints[(i + 1) % waypoints.length] // Wrap to first waypoint
      current.distanceToNext = current.position.distanceTo(next.position)
    }
  }

  private optimizeWaypointSpeeds(waypoints: Waypoint[]): void {
    // Forward pass: reduce speeds approaching corners
    for (let i = 0; i < waypoints.length; i++) {
      const current = waypoints[i]
      const lookAhead = 5 // Look ahead 5 waypoints
      
      let minUpcomingSpeed = current.targetSpeed
      for (let j = 1; j <= lookAhead; j++) {
        const upcoming = waypoints[(i + j) % waypoints.length]
        minUpcomingSpeed = Math.min(minUpcomingSpeed, upcoming.targetSpeed)
      }
      
      // Gradual speed reduction approaching slower sections
      const speedReduction = (current.targetSpeed - minUpcomingSpeed) * 0.3
      current.targetSpeed = Math.max(minUpcomingSpeed, current.targetSpeed - speedReduction)
    }

    // Backward pass: ensure smooth acceleration out of corners
    for (let i = waypoints.length - 1; i >= 0; i--) {
      const current = waypoints[i]
      const lookBehind = 3 // Look behind 3 waypoints
      
      let maxRecentSpeed = current.targetSpeed
      for (let j = 1; j <= lookBehind; j++) {
        const recent = waypoints[(i - j + waypoints.length) % waypoints.length]
        maxRecentSpeed = Math.max(maxRecentSpeed, recent.targetSpeed)
      }
      
      // Gradual speed increase after slow sections
      const speedIncrease = (maxRecentSpeed - current.targetSpeed) * 0.2
      current.targetSpeed = Math.min(this.waypointConfig.speedLimit, current.targetSpeed + speedIncrease)
    }
  }

  // Public API methods
  public getWaypoints(): Waypoint[] {
    return this.waypoints
  }

  public getWaypoint(id: number): Waypoint | undefined {
    return this.waypoints.find(wp => wp.id === id)
  }

  public findNearestWaypoint(position: Vector3): Waypoint | null {
    if (this.waypoints.length === 0) return null

    let nearest = this.waypoints[0]
    let minDistance = position.distanceTo(nearest.position)

    for (const waypoint of this.waypoints) {
      const distance = position.distanceTo(waypoint.position)
      if (distance < minDistance) {
        minDistance = distance
        nearest = waypoint
      }
    }

    return nearest
  }

  public getNextWaypoint(currentId: number): Waypoint | null {
    const currentIndex = this.waypoints.findIndex(wp => wp.id === currentId)
    if (currentIndex === -1) return null
    
    const nextIndex = (currentIndex + 1) % this.waypoints.length
    return this.waypoints[nextIndex]
  }

  public getPreviousWaypoint(currentId: number): Waypoint | null {
    const currentIndex = this.waypoints.findIndex(wp => wp.id === currentId)
    if (currentIndex === -1) return null
    
    const prevIndex = (currentIndex - 1 + this.waypoints.length) % this.waypoints.length
    return this.waypoints[prevIndex]
  }

  // Get waypoints within a certain distance
  public getWaypointsInRange(position: Vector3, range: number): Waypoint[] {
    return this.waypoints.filter(wp => position.distanceTo(wp.position) <= range)
  }

  // Calculate progress around track (0-1)
  public getTrackProgress(position: Vector3): number {
    const nearest = this.findNearestWaypoint(position)
    if (!nearest) return 0

    const waypointIndex = this.waypoints.findIndex(wp => wp.id === nearest.id)
    const baseProgress = waypointIndex / this.waypoints.length
    
    // Interpolate between waypoints for more precise progress
    const next = this.getNextWaypoint(nearest.id)
    if (next) {
      const segmentLength = nearest.distanceToNext
      if (segmentLength > 0) {
        const distanceToNext = position.distanceTo(next.position)
        const segmentProgress = 1 - (distanceToNext / segmentLength)
        return baseProgress + (segmentProgress / this.waypoints.length)
      }
    }

    return baseProgress
  }

  // Generate visualization data for debugging
  public getVisualizationData() {
    return {
      waypoints: this.waypoints.map(wp => ({
        position: wp.position.toArray(),
        targetSpeed: wp.targetSpeed,
        type: wp.type,
        curvature: wp.curvature
      })),
      trackConfig: this.trackConfig,
      waypointConfig: this.waypointConfig
    }
  }
}

// Utility functions for AI integration
export class WaypointFollower {
  private waypointSystem: TrackWaypointSystem
  private currentWaypointId: number = 0
  private laneOffset: number = 0 // -1 to 1 (left to right)

  constructor(waypointSystem: TrackWaypointSystem) {
    this.waypointSystem = waypointSystem
  }

  public setLaneOffset(offset: number): void {
    this.laneOffset = Math.max(-1, Math.min(1, offset))
  }

  public getCurrentTarget(position: Vector3): Vector3 | null {
    const waypoint = this.waypointSystem.getWaypoint(this.currentWaypointId)
    if (!waypoint) return null

    // Apply lane offset
    const offsetVector = this.laneOffset > 0 
      ? waypoint.normalRight.clone().multiplyScalar(Math.abs(this.laneOffset) * 1.5)
      : waypoint.normalLeft.clone().multiplyScalar(Math.abs(this.laneOffset) * 1.5)

    return waypoint.position.clone().add(offsetVector)
  }

  public updateWaypoint(position: Vector3): void {
    const current = this.waypointSystem.getWaypoint(this.currentWaypointId)
    if (!current) return

    const distanceToCurrentWaypoint = position.distanceTo(current.position)
    const waypointReachDistance = 3.0 // Distance to consider waypoint "reached"

    if (distanceToCurrentWaypoint < waypointReachDistance) {
      const next = this.waypointSystem.getNextWaypoint(this.currentWaypointId)
      if (next) {
        this.currentWaypointId = next.id
      }
    }
  }

  public getCurrentWaypoint(): Waypoint | null {
    return this.waypointSystem.getWaypoint(this.currentWaypointId)
  }

  public getTargetSpeed(): number {
    const waypoint = this.getCurrentWaypoint()
    return waypoint ? waypoint.targetSpeed : 8.0 // Default speed
  }
}