import * as THREE from 'three'
import { WaypointLike } from './purePursuit'

export class StraightWaypointSystem {
  private waypoints: WaypointLike[] = []

  constructor(
    public start: THREE.Vector3,
    public end: THREE.Vector3,
    public spacing = 2.0,
    public speedLimit = 12
  ) {
    this.generate()
  }

  private generate() {
    const dir = this.end.clone().sub(this.start)
    const dist = dir.length()
    if (dist < 1e-3) return
    const n = Math.max(2, Math.ceil(dist / this.spacing))
    const waypoints: WaypointLike[] = []
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const p = this.start.clone().lerp(this.end, t)
      waypoints.push({ position: p, targetSpeed: this.speedLimit, distanceToNext: 0 })
    }
    // distanceToNext 채우기
    for (let i = 0; i < waypoints.length; i++) {
      const next = waypoints[(i + 1) % waypoints.length]
      if (i === waypoints.length - 1) {
        // 마지막 → 자기 자신으로 0(루프 아님)
        waypoints[i].distanceToNext = 0
      } else {
        waypoints[i].distanceToNext = waypoints[i].position.distanceTo(next.position)
      }
    }
    this.waypoints = waypoints
  }

  public getWaypoints(): WaypointLike[] {
    return this.waypoints
  }

  public getWaypointsInRange(position: THREE.Vector3, range: number): WaypointLike[] {
    return this.waypoints.filter(wp => position.distanceTo(wp.position) <= range)
  }
}

