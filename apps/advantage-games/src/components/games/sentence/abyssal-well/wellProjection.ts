import { ABYSSAL_WELL_CONFIG } from '@/lib/games/abyssalWellConfig'

/**
 * 3D projection constants for the well tube (world units).
 *
 * The tube runs along the Z axis: the rim (player position, logic depth 1)
 * sits at z = 0 in front of the camera; the far end (spawn point, logic
 * depth 0) sits at z = -length. Lanes are angular positions on the tube
 * wall, matching the logic module's lane indices.
 */
export const WELL = {
  radius: 2.2,
  length: 24,
  lanes: ABYSSAL_WELL_CONFIG.lanes,
}

/**
 * Maps a logic-state (lane, depth) pair onto the tube wall.
 * Pure math, mirrored 1:1 from the logic module's lane semantics
 * (lane wraps modulo WELL.lanes; lane 0 starts at the top, -90°).
 */
export function wellPosition(lane: number, depth: number): [number, number, number] {
  const normalizedLane = ((lane % WELL.lanes) + WELL.lanes) % WELL.lanes
  const angle = (normalizedLane / WELL.lanes) * Math.PI * 2 - Math.PI / 2

  const x = Math.cos(angle) * WELL.radius
  const y = Math.sin(angle) * WELL.radius
  const z = -(1 - depth) * WELL.length

  return [x, y, z]
}
