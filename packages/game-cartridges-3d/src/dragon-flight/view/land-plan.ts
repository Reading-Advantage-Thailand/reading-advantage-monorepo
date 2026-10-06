/**
 * The plan of the land under the flight, shared by the 3D view (land.ts) and the 2D view
 * (../view2d): chunks of forest and village in a fixed pattern, the models each kind places,
 * and the seeded random that places them (no three.js here).
 */

/** Chunk length along the path, in meters. */
export const CHUNK = 30;

/** Forest chunks, then village chunks, then forest again (chunk index modulo the pattern). */
export const PATTERN = ['forest', 'forest', 'forest', 'village', 'village', 'forest', 'forest', 'village'] as const;

export type Kind = (typeof PATTERN)[number];

/** The kind of chunk `index` (0 is the first chunk ahead of the start). */
export const kindOf = (index: number): Kind => PATTERN[((index % PATTERN.length) + PATTERN.length) % PATTERN.length]!;

/** Models a chunk of each kind places, with their counts. */
export const FOREST: [string, number][] = [['oak-tree', 5], ['pine-tree', 6], ['ancient-oak', 1], ['bush', 4], ['fern', 3], ['boulder', 2], ['rock-cluster', 2], ['wildflowers', 3]];
export const VILLAGE: [string, number][] = [['cottage', 3], ['barn', 1], ['well', 1], ['hay-bale', 3], ['fence', 4], ['oak-tree', 3], ['bush', 3], ['wildflowers', 4], ['farm-field', 2]];

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
