/**
 * The plan of the land under the flight, shared by the 3D view (land.ts) and the 2D view
 * (../view2d): chunks of forest, meadow, and village in a fixed pattern, the models each kind
 * places, the sizes of the actors, and the seeded random that places them (no three.js here).
 * The flight runs along -Z; the lanes sit at x = -3.6, 0, 3.6 (core `laneX`).
 */

/** Chunk length along the flight, in meters. */
export const CHUNK = 30;

/** The kinds of chunk (chunk index modulo the pattern). */
export const PATTERN = ['forest', 'meadow', 'village', 'forest', 'forest', 'meadow'] as const;

export type Kind = (typeof PATTERN)[number];

/** The kind of chunk `index` (0 is the first chunk ahead of the start). */
export const kindOf = (index: number): Kind => PATTERN[((index % PATTERN.length) + PATTERN.length) % PATTERN.length]!;

/** Models a chunk of each kind places, with their counts. */
export const PROPS: Record<Kind, [string, number][]> = {
  forest: [['oak-tree', 6], ['pine-tree', 7], ['bush', 4], ['fern', 3], ['boulder', 2], ['rock-cluster', 1]],
  meadow: [['oak-tree', 2], ['bush', 3], ['wildflowers', 8], ['fern', 3], ['boulder', 2], ['pine-tree', 2]],
  village: [['cottage', 3], ['well', 1], ['hay-bale', 4], ['wildflowers', 5], ['oak-tree', 3], ['bush', 2]],
};

/** Sizes in meters of the actors as the views show them (larger than life so they read from afar). */
export const SIZES = { griffin: 3.6, bat: 2.2, rider: 1.5 } as const;

/** The height of the flight above the ground, in meters. */
export const FLIGHT_HEIGHT = 3.4;


/** Colors of the gates by lane (violet, cyan, gold). */
export const GATE_COLORS = [0x9b6bff, 0x3ec6ff, 0xffc83e] as const;

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

/** One prop placed on the land: name, x across, z along the flight (negative ahead), scale, turn. */
export interface Placed {
  name: string;
  x: number;
  z: number;
  scale: number;
  turn: number;
}

/** The props of chunk `index`, in a fixed seeded layout (the same in 3D and 2D). Props keep beside the lanes (|x| over 6 m). */
export function chunkLayout(index: number): Placed[] {
  const r = rng(index * 7919 + 31);
  const list: Placed[] = [];
  for (const [name, count] of PROPS[kindOf(index)]) {
    for (let i = 0; i < count; i++) {
      const big = /tree|cottage/.test(name);
      const side = r() < 0.5 ? -1 : 1;
      list.push({ name, x: side * ((big ? 7.5 : 6.2) + r() * (big ? 14 : 12)), z: -index * CHUNK - r() * CHUNK, scale: 0.85 + r() * 0.35, turn: r() * Math.PI * 2 });
    }
  }
  return list;
}
