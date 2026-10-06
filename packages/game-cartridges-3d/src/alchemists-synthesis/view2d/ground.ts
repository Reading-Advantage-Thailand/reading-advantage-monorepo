/**
 * The drawn alchemy lab of the 2D view (no baked background): a canvas texture of the projected
 * wooden floor, the back wall with shelves and a fireplace, and the four jar pedestals.
 * `PROJECTION` is the same 2D camera as the forge sprites (45 degrees, 64 px per meter). Pure
 * drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { LAYOUT } from '../view/layout.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.alchemists-synthesis';

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

  ctx.fillStyle = '#1c1426';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);

  // The back wall, then the floor in front of it.
  fillPoly(ctx, [P(ROOM.minX, 0, ROOM.backZ), P(ROOM.maxX, 0, ROOM.backZ), P(ROOM.maxX, ROOM.wall, ROOM.backZ), P(ROOM.minX, ROOM.wall, ROOM.backZ)], '#b9a68a');
  fillPoly(ctx, [P(ROOM.minX, 0, ROOM.backZ), P(ROOM.maxX, 0, ROOM.backZ), P(ROOM.maxX, 0, ROOM.frontZ), P(ROOM.minX, 0, ROOM.frontZ)], '#7a5232');
  // Floor planks: lines across the room.
  ctx.strokeStyle = '#5a3a24';
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
  // The fireplace in the middle of the wall, with a fire.
  fillPoly(ctx, [P(-0.8, 0, ROOM.backZ), P(0.8, 0, ROOM.backZ), P(0.8, 1.5, ROOM.backZ), P(-0.8, 1.5, ROOM.backZ)], '#6f6a66');
  fillPoly(ctx, [P(-0.5, 0, ROOM.backZ), P(0.5, 0, ROOM.backZ), P(0.5, 0.9, ROOM.backZ), P(-0.5, 0.9, ROOM.backZ)], '#2a1410');
  ctx.fillStyle = '#ff8a3c';
  const fire = P(0, 0.25, ROOM.backZ);
  ctx.beginPath();
  ctx.ellipse(fire.x, fire.y, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.ellipse(fire.x, fire.y + 2, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shelves of bottles on both sides of the fireplace.
  for (const sx of [-2.4, 2.4]) {
    for (const y of [0.55, 1.05]) {
      const a = P(sx - 0.6, y, ROOM.backZ);
      const b = P(sx + 0.6, y, ROOM.backZ);
      ctx.strokeStyle = '#4a2e1c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      for (const dx of [-0.4, -0.05, 0.3]) {
        const p = P(sx + dx, y, ROOM.backZ);
        ctx.fillStyle = dx < 0 ? '#5fd1b0' : '#c084fc';
        ctx.fillRect(p.x - 3, p.y - 13, 7, 13);
      }
    }
  }
  // The four jar pedestals: a round stand under each ingredient.
  for (const [x, , z] of LAYOUT.jars) {
    const base = P(x, 0, z);
    const top = P(x, LAYOUT.pedestal, z);
    const rx = 0.5 * PROJECTION.ppm;
    const ry = rx * Math.sin((PROJECTION.elevation * Math.PI) / 180);
    ctx.fillStyle = '#5a3a24';
    ctx.fillRect(base.x - rx, top.y, rx * 2, base.y - top.y);
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5232';
    ctx.beginPath();
    ctx.ellipse(top.x, top.y, rx * 1.08, ry * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
  return key;
}
