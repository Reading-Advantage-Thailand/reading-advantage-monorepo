/**
 * The plan of the land beside the spell road, shared by the 3D view (land.ts) and the 2D view
 * (../view2d): chunks of forest and meadow in a fixed pattern, the models each kind places, and
 * the seeded random that places them (no three.js here).
 */

/** Chunk length along the road, in meters. */
export const CHUNK = 30;

/** Forest chunks and meadow chunks (chunk index modulo the pattern). */
export const PATTERN = ['forest', 'forest', 'meadow', 'forest', 'meadow', 'meadow'] as const;

export type Kind = (typeof PATTERN)[number];

/** The kind of chunk `index` (0 is the first chunk ahead of the start). */
export const kindOf = (index: number): Kind => PATTERN[((index % PATTERN.length) + PATTERN.length) % PATTERN.length]!;

/** Models a chunk of each kind places, with their counts. */
export const FOREST: [string, number][] = [['oak-tree', 5], ['pine-tree', 6], ['ancient-oak', 1], ['bush', 4], ['fern', 3], ['boulder', 2], ['rock-cluster', 1], ['wildflowers', 2]];
export const MEADOW: [string, number][] = [['oak-tree', 2], ['bush', 3], ['wildflowers', 7], ['fern', 3], ['boulder', 2], ['rock-cluster', 2], ['pine-tree', 2]];

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

/** Lane x positions in meters for 2 or 3 lanes (narrow enough for a portrait phone). */
export const laneX = (count: number, i: number): number => (count === 2 ? [-1.6, 1.6] : [-3.0, 0, 3.0])[i] ?? 0;

/** Orb colors by lane: violet, cyan, gold. */
export const ORB_COLORS = [0x9b6bff, 0x3ec6ff, 0xffc83e] as const;
