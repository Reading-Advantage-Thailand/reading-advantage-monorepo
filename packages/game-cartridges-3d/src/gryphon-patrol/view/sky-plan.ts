/**
 * The plan of the sky and the land under it, shared by the 3D view (sky.ts) and the 2D view
 * (../view2d): the props along the ground, the sizes of the actors, and the seeded random that
 * places them (no three.js here). The core's x runs 0..24 across the sky; the view centers it.
 */

/** Props along the ground below the patrol: name, count, and the depth band (0 near, 1 far). */
export const GROUND_PROPS: [string, number][] = [
  ['oak-tree', 9], ['pine-tree', 10], ['ancient-oak', 2], ['bush', 8], ['boulder', 3], ['rock-cluster', 3],
  ['cottage', 2], ['well', 1], ['hay-bale', 3], ['wildflowers', 6], ['fern', 4], ['barn', 1],
];

/** Sizes in meters of the actors as the views show them (larger than life so they read from afar). */
export const SIZES = { gryphon: 3.6, bat: 2.4, rider: 1.5 } as const;


/** Colors of the bat banners by slot (violet, cyan, gold, rose). */
export const BAT_COLORS = [0x9b6bff, 0x3ec6ff, 0xffc83e, 0xff7fb0] as const;

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

/** One prop placed on the ground: name, x across (core meters, centered on the sky), depth 0..1, scale, flip. */
export interface Placed {
  name: string;
  x: number;
  depth: number;
  scale: number;
  turn: number;
}

/** The ground props of the whole patrol, in a fixed seeded layout (the same in 3D and 2D). */
export function groundLayout(): Placed[] {
  const r = rng(4242);
  const list: Placed[] = [];
  for (const [name, count] of GROUND_PROPS) {
    for (let i = 0; i < count; i++) list.push({ name, x: -17 + r() * 34, depth: r(), scale: 0.9 + r() * 0.5, turn: r() * Math.PI * 2 });
  }
  return list.sort((a, b) => b.depth - a.depth);
}
