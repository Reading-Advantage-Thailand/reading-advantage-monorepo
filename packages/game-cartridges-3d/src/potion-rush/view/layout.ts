/**
 * Where things stand in the potion shop, and the look values both views share (meters and hex
 * colors, no three.js): the 3D view and the 3D set (shop.ts) and the 2D view (../view2d) read
 * positions from here, so the baked 2D background and the 2D sprites line up with the 3D shop.
 */
import type { Shot } from '@reading-advantage/advantage-play-kit-3d/stage';

type V3 = [number, number, number];

/** Where things stand; the view and the HUD read positions from here. */
export const LAYOUT = {
  /** Customers stand in the open in front of their cauldron (nothing hides them). */
  slots: [[-1.15, 0, -2.0], [0, 0, -2.0], [1.15, 0, -2.0]] as V3[],
  cauldrons: [[-1.15, 0, -0.9], [0, 0, -0.9], [1.15, 0, -0.9]] as V3[],
  /** The conveyor near the thumbs: position 1 is the right end (x = +2.3), position 0 the left end. */
  belt: { from: 2.3, to: -2.3, z: 1.8, y: 0.52 },
  /** Customers enter here (the door) and walk to their spot. */
  door: [3.9, 0, -3.0] as V3,
  /** Customers who wait sit here (at the side tables). */
  seats: [[-3.3, 0, -1.9], [-3.9, 0, -1.2], [3.4, 0, -1.3], [-2.9, 0, -1.1]] as V3[],
  alchemist: [-1.45, 0, 0.55] as V3,
  shots: {
    // A portrait phone is tall and narrow: a steep view spreads the three rows over its height.
    portrait: { pos: [0, 7.2, 4.6], look: [0, 0.2, -1.2], fov: 56 } as Shot,
    landscape: { pos: [0, 4.4, 5.0], look: [0, 0.35, -0.5], fov: 38 } as Shot,
  },
};

/** The x of a belt position (0 to 1). */
export const beltX = (p: number): number => LAYOUT.belt.to + (LAYOUT.belt.from - LAYOUT.belt.to) * p;

/** Ingredient scale so each reads at about 0.25 m on the conveyor. */
export const INGREDIENT_SCALE: Record<string, number> = { bottle: 1.4, mushroom: 1.2, apple: 1.9, pumpkin: 0.75, 'crystal-cluster': 0.6, bread: 1.3 };

/** Each order's brew color (cauldron i). */
export const BREW = [0x8b5cf6, 0x22c55e, 0xf97316];
