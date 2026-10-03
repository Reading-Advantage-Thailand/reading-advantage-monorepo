/**
 * The drawn library of the 2D view (no baked background): four floors seen from the 2D camera,
 * the far floor at the top. Each floor is a band of the ground (`laneZ`) with a plaster wall
 * behind it, shelves, a window, and a green pad at both ends. The doors are drawn by the view
 * (they change with the room). `PROJECTION` is the same 2D camera as the forge sprites
 * (45 degrees, 64 px per meter). Pure drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { FLOOR_COUNT, HALF_WIDTH, TUNING } from '../core/index.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.haunted-library';

export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -6.6, vMax: 5.7, width: 848, height: 592 };

/** The ground z where the hero stands on a floor: floor 0 is nearest the camera. */
export const laneZ = (floor: number): number => 4 - 3.2 * floor;
/** The z of the wall behind a floor, where its doors stand. */
export const wallZ = (floor: number): number => laneZ(floor) - 0.6;
/** The height of the wall and of a door's top, in meters. */
export const WALL_HEIGHT = 1.7;
export const DOOR_HEIGHT = 1.45;
export const DOOR_HALF_WIDTH = 0.6;

type Ctx = CanvasRenderingContext2D;

const fillPoly = (ctx: Ctx, pts: { x: number; y: number }[], color: string): void => {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
};

/** Makes the ground texture once per scene and returns its key (the key `Arena2D` loads). */
export function makeGround(scene: Phaser.Scene, edition: RuntimeEdition): string {
  const key = textureKeyOf(edition, GROUND_FILE);
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, PROJECTION.width, PROJECTION.height);
  if (!tex) return key;
  const ctx = tex.getContext();
  const P = (x: number, y: number, z: number) => project(PROJECTION, x, y, z);
  const W = HALF_WIDTH + 0.4;

  ctx.fillStyle = '#171226';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);

  // Far floor first, so a nearer floor draws over the edge of the one behind it.
  for (let f = FLOOR_COUNT - 1; f >= 0; f--) {
    const zb = wallZ(f);
    const zf = laneZ(f) + 0.8;
    // The plaster wall, a wainscot, a window on every second floor, and shelves.
    fillPoly(ctx, [P(-W, 0, zb), P(W, 0, zb), P(W, WALL_HEIGHT, zb), P(-W, WALL_HEIGHT, zb)], '#e6d6b8');
    fillPoly(ctx, [P(-W, 0, zb), P(W, 0, zb), P(W, 0.5, zb), P(-W, 0.5, zb)], '#6b4a35');
    if (f % 2 === 0) fillPoly(ctx, [P(-0.5, 0.75, zb), P(0.5, 0.75, zb), P(0.5, 1.5, zb), P(-0.5, 1.5, zb)], '#7aa7d9');
    for (const x of [-3.9, 3.9]) {
      fillPoly(ctx, [P(x - 0.8, 0, zb), P(x + 0.8, 0, zb), P(x + 0.8, 1.45, zb), P(x - 0.8, 1.45, zb)], '#5a3a26');
      const books = ['#c0453a', '#3f6fb5', '#d4a62a', '#3f9a5a', '#8a55b8'];
      for (let r = 0; r < 3; r++) {
        for (let b = 0; b < 6; b++) {
          const bx = x - 0.7 + b * 0.235;
          const by = 0.12 + r * 0.45;
          fillPoly(ctx, [P(bx, by, zb + 0.01), P(bx + 0.18, by, zb + 0.01), P(bx + 0.18, by + 0.34, zb + 0.01), P(bx, by + 0.34, zb + 0.01)], books[(b + r + f) % books.length]!);
        }
      }
    }
    // The wooden floor with plank lines, and its front edge.
    fillPoly(ctx, [P(-W, 0, zb), P(W, 0, zb), P(W, 0, zf), P(-W, 0, zf)], '#a8723f');
    ctx.strokeStyle = '#7d5230';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let z = zb + 0.35; z < zf; z += 0.35) {
      const a = P(-W, 0, z);
      const b = P(W, 0, z);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    fillPoly(ctx, [P(-W, 0, zf), P(W, 0, zf), P(W, -0.25, zf), P(-W, -0.25, zf)], '#5c3d24');
    // The pads at both ends (not on the top floor), with a bright arrow.
    if (f < FLOOR_COUNT - 1) {
      for (const side of [-1, 1]) {
        const x0 = side * TUNING.padX;
        const x1 = side * HALF_WIDTH;
        const z0 = laneZ(f) - 0.5;
        const z1 = laneZ(f) + 0.7;
        fillPoly(ctx, [P(x0, 0.01, z0), P(x1, 0.01, z0), P(x1, 0.01, z1), P(x0, 0.01, z1)], '#2fbf71');
        const cx = (x0 + x1) / 2;
        const cz = laneZ(f) + 0.1;
        fillPoly(ctx, [P(cx, 0.02, cz - 0.4), P(cx + 0.28, 0.02, cz + 0.1), P(cx - 0.28, 0.02, cz + 0.1)], '#d8ffe8');
      }
    }
  }
  tex.refresh();
  return key;
}
