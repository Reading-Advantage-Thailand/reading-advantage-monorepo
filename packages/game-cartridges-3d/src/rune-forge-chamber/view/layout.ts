/**
 * Where things stand in the rune forge, and the look values both views share (meters and hex
 * colors, no three.js): the 3D view and the 2D view read positions from here, so the sprites
 * line up with the 3D forge. The orbit itself (`ORBIT`) belongs to the rules core.
 */
import type { Shot } from '@reading-advantage/advantage-play-kit-3d/stage';
import { ORBIT } from '../core/index.js';

type V3 = [number, number, number];

export const LAYOUT = {
  /** The anvil (a workbench with a hammer) in the middle of the orbit. */
  anvil: [ORBIT.cx, 0, ORBIT.cz] as V3,
  /** Height of the anvil top, where the blade lies. */
  anvilTop: 0.86,
  /** Height of the rune centres over the floor. */
  runeY: 1.25,
  smith: [-2.5, 0, 1.5] as V3,
  shots: {
    portrait: { pos: [0, 7.6, 5.6], look: [0, 0.2, -0.2], fov: 56 } as Shot,
    landscape: { pos: [0, 5.0, 6.0], look: [0, 0.4, -0.2], fov: 42 } as Shot,
  },
};

/** The glow colors by state (3D halo and 2D tags). */
export const GLOW = { idle: 0x8fd0ff, aimed: 0xffd84a, dim: 0x66667a, hit: 0xff9a3c } as const;

/** The blade color as it heats (cold steel to glowing orange). */
export const BLADE_FROM = 0x8a96a8;
export const BLADE_TO = 0xff8a3c;
