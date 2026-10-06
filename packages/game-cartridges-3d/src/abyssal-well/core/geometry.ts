/**
 * The geometry of the well, in meters on the ground plane (`x` to the right, `z` toward the
 * camera). The well is centered at the origin; lane 0 points toward the camera and the lanes
 * run clockwise seen from above. The archer stands outside the rim. Both views and the tests
 * use these numbers; the rules themselves never read them.
 */
import { LANES, RIM_DEPTH } from './types.js';

/** Radius of the bottom step, of the rim step, and of the archer's circle. */
export const BOTTOM_RADIUS = 1.3;
export const RIM_RADIUS = 4.5;
export const ARCHER_RADIUS = 5.5;

/** The angle of a lane in radians (lane 0 is 0). */
export const laneAngle = (lane: number): number => (lane / LANES) * Math.PI * 2;

/** The point of a lane at a (fractional) depth. */
export function lanePoint(lane: number, depth: number): { x: number; z: number } {
  const r = BOTTOM_RADIUS + (Math.max(0, Math.min(RIM_DEPTH, depth)) / RIM_DEPTH) * (RIM_RADIUS - BOTTOM_RADIUS);
  const a = laneAngle(lane);
  return { x: Math.sin(a) * r, z: Math.cos(a) * r };
}

/** Where the archer stands at an angle (radians). */
export function archerPoint(angle: number): { x: number; z: number } {
  return { x: Math.sin(angle) * ARCHER_RADIUS, z: Math.cos(angle) * ARCHER_RADIUS };
}

/** The heading in degrees (0 faces +Z) of someone who looks along the direction (dx, dz). */
export const headingOfDirection = (dx: number, dz: number): number => (Math.atan2(dx, dz) * 180) / Math.PI;

/** The shortest signed difference between two angles in radians. */
export function angleDelta(from: number, to: number): number {
  const full = Math.PI * 2;
  return ((((to - from) % full) + full * 1.5) % full) - full / 2;
}
