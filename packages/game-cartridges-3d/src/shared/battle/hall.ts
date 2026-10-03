/**
 * Where the battle happens (no three.js here): the party's and the monsters' spots in the great
 * hall of the Sunken Vault, the 3D camera framings, and the map pieces cut away from the view.
 * The 3D battle stage (stage3d.ts) and the 2D battle stage (stage2d.ts) read it.
 */
import type { CutBox, Shot, V3 } from '@reading-advantage/advantage-play-kit-3d/stage';
import type { HeroId } from './types.js';

/** The height of the vault floor. */
export const FLOOR_Y = 0.09;

/**
 * A battle stage: where the party and the monsters stand, the two camera framings (portrait
 * phones and landscape screens), and the boxes of map pieces cut away so walls never block the view.
 */
export interface StageDef {
  party: Record<HeroId, V3>;
  /** Monster spots in order; the dragon uses `boss`. */
  enemies: V3[];
  boss: V3;
  portrait: Shot;
  landscape: Shot;
  cutaway: CutBox[];
}

/** The great hall: the party stands south of the pillars and faces north. */
export const HALL: StageDef = {
  party: { knight: [0, FLOOR_Y, 4.0], wizard: [-1.05, FLOOR_Y, 4.75], cleric: [1.05, FLOOR_Y, 4.75] },
  enemies: [[-0.85, FLOOR_Y, 0.9], [0.85, FLOOR_Y, 0.9], [0, FLOOR_Y, 0.4]],
  boss: [0, FLOOR_Y, 0.2],
  portrait: { pos: [3.3, 2.9, 8.4], look: [-0.25, 0.8, 2.4], fov: 50 },
  landscape: { pos: [3.4, 2.7, 8.6], look: [-0.2, 0.85, 2.4], fov: 46 },
  // The south wall (between the camera and the fight), and the hall's pillars and cage.
  cutaway: [[-4.6, 5.4, 4.6, 12], [-1.6, 1.6, 1.6, 2.4]],
};
