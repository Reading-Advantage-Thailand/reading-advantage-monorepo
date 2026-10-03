/**
 * Where things stand in the alchemy lab, and the look values both views share (meters and hex
 * colors, no three.js): the 3D view and the 2D view read positions from here, so the sprites
 * line up with the 3D lab. The bench is narrow on purpose: a portrait phone sees the cauldron
 * and all four jars at once.
 */
import type { Shot } from '@reading-advantage/advantage-play-kit-3d/stage';

type V3 = [number, number, number];

export const LAYOUT = {
  cauldron: [0, 0, -1.4] as V3,
  /** The four jar pedestals, in bench order (a 2 x 2 grid in front of the cauldron). */
  jars: [[-1.3, 0, 0.7], [1.3, 0, 0.7], [-1.3, 0, 2.3], [1.3, 0, 2.3]] as V3[],
  /** Height of the pedestal top, where an ingredient stands. */
  pedestal: 0.5,
  alchemist: [-2.3, 0, -1.2] as V3,
  shots: {
    portrait: { pos: [0, 7.4, 5.8], look: [0, 0.2, 0.2], fov: 56 } as Shot,
    landscape: { pos: [0, 4.8, 6.0], look: [0, 0.3, 0.3], fov: 40 } as Shot,
  },
};

/** Ingredient scale so each reads at about 0.35 m on its pedestal. */
export const INGREDIENT_SCALE: Record<string, number> = { bottle: 2.0, mushroom: 1.7, apple: 2.6, pumpkin: 1.05, 'crystal-cluster': 0.85, bread: 1.8 };

/** The glow colors by state (3D halo and 2D tags). */
export const GLOW = { idle: 0xffb454, aimed: 0xffd84a, dim: 0x66667a, right: 0x7dffb0 } as const;

/** The brew color of the cauldron as it fills (first formula to last). */
export const BREW_FROM = 0x2dd4bf;
export const BREW_TO = 0xc084fc;
