import * as THREE from 'three'
import { WaypointLike } from './purePursuit'

type Turn = 'left' | 'right'

export class TurnWaypointSystem {
  private waypoints: WaypointLike[] = []

  constructor(
    public start: THREE.Vector3,            // e.g., (-40,0,0)
    public approachEndX = -18,              // x where straight approach ends
    public radius = 12,                     // corner radius
    public spacing = 2.0,                   // sampling spacing
    public speedLimit = 12,                 // straight top speed
    public maxLatAccel = 7.0,               // m/s^2 for corner speed
    public turn: Turn = 'right',            // turn direction (vehicle facing +X)
    public endAbs = 40                      // absolute |Z| of exit end
  ) {
    this.generate()
  }

  private pushWaypoint(list: WaypointLike[], p: THREE.Vector3, v: number) {
    list.push({ position: p.clone(), targetSpeed: v, distanceToNext: 0 })
  }

  private generate() {
    const wps: WaypointLike[] = []
    const start = this.start.clone()
    const R = this.radius
    const x0 = this.approachEndX
    // 1) Straight approach: from start.x to x0 at z=0
    const straightLen = Math.abs(x0 - start.x)
    const nS = Math.max(2, Math.ceil(straightLen / this.spacing))
    for (let i = 0; i < nS; i++) {
      const t = i / (nS - 1)
      const x = THREE.MathUtils.lerp(start.x, x0, t)
      const p = new THREE.Vector3(x, 0, 0)
      this.pushWaypoint(wps, p, this.speedLimit)
    }

    // 2) Quarter-circle arc
    // Vehicle faces +X. Define right-turn as turning toward +Z, left-turn toward -Z.
    // right: C = (x0, +R), phi: -pi/2 -> 0, end at (x0+R, +R)
    // left:  C = (x0, -R), phi: +pi/2 -> 0, end at (x0+R, -R)
    const center = new THREE.Vector3(x0, 0, this.turn === 'right' ? +R : -R)
    const phiStart = this.turn === 'right' ? -Math.PI / 2 : Math.PI / 2
    const phiEnd = 0
    const arcLen = Math.abs(phiEnd - phiStart) * R
    const nA = Math.max(4, Math.ceil(arcLen / Math.max(0.6, this.spacing * 0.6)))
    const ayMax = this.maxLatAccel
    for (let i = 1; i <= nA; i++) {
      const t = i / nA
      const phi = THREE.MathUtils.lerp(phiStart, phiEnd, t)
      const x = center.x + R * Math.cos(phi)
      const z = center.z + R * Math.sin(phi)
      const p = new THREE.Vector3(x, 0, z)
      // curvature kappa = 1/R -> vCorner = sqrt(ayMax / kappa)
      const vCorner = Math.min(this.speedLimit, Math.sqrt(ayMax / (1 / R)))
      this.pushWaypoint(wps, p, vCorner)
    }

    // 3) Exit straight: along ±Z from end of arc to ±endAbs (inside map bounds)
    const endArc = wps[wps.length - 1].position
    const zEnd = this.turn === 'right' ? +this.endAbs : -this.endAbs
    const exitLen = Math.abs(zEnd - endArc.z)
    const nE = Math.max(2, Math.ceil(exitLen / this.spacing))
    for (let i = 1; i <= nE; i++) { // continue from after arc end
      const t = i / nE
      const z = THREE.MathUtils.lerp(endArc.z, zEnd, t)
      const p = new THREE.Vector3(endArc.x, 0, z)
      this.pushWaypoint(wps, p, this.speedLimit)
    }

    // Distances
    for (let i = 0; i < wps.length; i++) {
      const next = wps[i + 1]
      if (next) wps[i].distanceToNext = wps[i].position.distanceTo(next.position)
      else wps[i].distanceToNext = 0
    }

    this.waypoints = wps
  }

  public getWaypoints(): WaypointLike[] { return this.waypoints }
  public getWaypointsInRange(position: THREE.Vector3, range: number): WaypointLike[] {
    return this.waypoints.filter(wp => position.distanceTo(wp.position) <= range)
  }
}
