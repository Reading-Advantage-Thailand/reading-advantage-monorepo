/**
 * The drawn rune forge of the 2D view (no baked background): a canvas texture of the projected
 * wooden floor, the back wall with a furnace and shelves, and the anvil with a blade lying on it.
 * `PROJECTION` is the same 2D camera as the forge sprites (45 degrees, 64 px per meter). Pure
 * drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { LAYOUT } from '../view/layout.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.rune-forge-chamber';

export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -4.2, vMax: 4.75, width: 538, height: 480 };

/** The room in meters: floor from `x` -4 to 4 and `z` -3.6 to 3.4, back wall 3 m high. */
const ROOM = { minX: -4, maxX: 4, backZ: -3.6, frontZ: 3.4, wall: 3 } as const;

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

  ctx.fillStyle = '#1a1520';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);

  // The back wall, then the floor in front of it.
  fillPoly(ctx, [P(ROOM.minX, 0, ROOM.backZ), P(ROOM.maxX, 0, ROOM.backZ), P(ROOM.maxX, ROOM.wall, ROOM.backZ), P(ROOM.minX, ROOM.wall, ROOM.backZ)], '#a89a8a');
  fillPoly(ctx, [P(ROOM.minX, 0, ROOM.backZ), P(ROOM.maxX, 0, ROOM.backZ), P(ROOM.maxX, 0, ROOM.frontZ), P(ROOM.minX, 0, ROOM.frontZ)], '#6e4a2e');
  ctx.strokeStyle = '#4f331f';
  ctx.lineWidth = 1.5;
  for (let z = ROOM.backZ; z <= ROOM.frontZ; z += 0.5) {
    const a = P(ROOM.minX, 0, z);
    const b = P(ROOM.maxX, 0, z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Wall beams and two windows.
  ctx.strokeStyle = '#6b4a2c';
  ctx.lineWidth = 4;
  for (let x = ROOM.minX; x <= ROOM.maxX; x += 2) {
    const a = P(x, 0, ROOM.backZ);
    const b = P(x, ROOM.wall, ROOM.backZ);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const x of [-3, 3]) {
    fillPoly(ctx, [P(x - 0.45, 1.5, ROOM.backZ), P(x + 0.45, 1.5, ROOM.backZ), P(x + 0.45, 2.6, ROOM.backZ), P(x - 0.45, 2.6, ROOM.backZ)], '#2a3a66');
  }
  // The furnace in the middle of the wall, with a fire.
  fillPoly(ctx, [P(-0.95, 0, ROOM.backZ), P(0.95, 0, ROOM.backZ), P(0.95, 1.7, ROOM.backZ), P(-0.95, 1.7, ROOM.backZ)], '#6f6a66');
  fillPoly(ctx, [P(-0.6, 0, ROOM.backZ), P(0.6, 0, ROOM.backZ), P(0.6, 1.0, ROOM.backZ), P(-0.6, 1.0, ROOM.backZ)], '#2a1410');
  ctx.fillStyle = '#ff8a3c';
  const fire = P(0, 0.3, ROOM.backZ);
  ctx.beginPath();
  ctx.ellipse(fire.x, fire.y, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.ellipse(fire.x, fire.y + 2, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shelves on both sides of the furnace.
  for (const sx of [-2.5, 2.5]) {
    for (const y of [0.55, 1.05]) {
      const a = P(sx - 0.6, y, ROOM.backZ);
      const b = P(sx + 0.6, y, ROOM.backZ);
      ctx.strokeStyle = '#4a2e1c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  // The anvil: a dark block on a stump, with the blade bar on top.
  const [ax, , az] = LAYOUT.anvil;
  const W = 0.62;
  const D = 0.3;
  const top = LAYOUT.anvilTop;
  fillPoly(ctx, [P(ax - 0.3, 0, az - 0.2), P(ax + 0.3, 0, az - 0.2), P(ax + 0.3, 0, az + 0.2), P(ax - 0.3, 0, az + 0.2)], '#3a2418');
  fillPoly(ctx, [P(ax - W, 0, az + D), P(ax + W, 0, az + D), P(ax + W, top, az + D), P(ax - W, top, az + D)], '#5a3a24');
  fillPoly(ctx, [P(ax - W, top, az - D), P(ax + W, top, az - D), P(ax + W, top, az + D), P(ax - W, top, az + D)], '#7a5232');
  fillPoly(ctx, [P(ax - 0.65, top + 0.01, az - 0.1), P(ax + 0.65, top + 0.01, az - 0.1), P(ax + 0.65, top + 0.01, az + 0.1), P(ax - 0.65, top + 0.01, az + 0.1)], '#8a96a8');
  tex.refresh();
  return key;
}
