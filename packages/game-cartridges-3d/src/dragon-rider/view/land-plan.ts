/**
 * The plan of the highland under the ride, shared by the 3D view (land.ts) and the 2D view
 * (../view2d): chunks of props placed by a seeded random (no three.js here).
 */

/** Chunk length along the path, in meters. */
export const CHUNK = 30;

/** Models a chunk places, with their counts: pines and rocks, with few bushes. */
export const HIGHLAND: [string, number][] = [['pine-tree', 7], ['rock-cluster', 3], ['boulder', 3], ['oak-tree', 2], ['bush', 4]];

/** A small seeded random (view only). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gate x positions (the same in both views), in meters. */
export const GATE_X = [-1.8, 1.8] as const;
