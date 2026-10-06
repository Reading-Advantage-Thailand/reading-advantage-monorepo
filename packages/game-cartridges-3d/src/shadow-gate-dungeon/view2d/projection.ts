/**
 * The 2D camera of the baked dungeon background (`background.dungeon-liberator`). Shadow Gate
 * Dungeon uses the same room as Dungeon Liberator: the same 11 m x 9 m floor and the gate at
 * (0, -4.5). These numbers are copied from that game's generated projection, so they stay fixed
 * until the background is baked again.
 */
import type { Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d/projection';

export const BACKGROUND_FILE = 'background.dungeon-liberator';
export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -6.6, vMax: 5.6563165231403385, width: 845, height: 615 };
