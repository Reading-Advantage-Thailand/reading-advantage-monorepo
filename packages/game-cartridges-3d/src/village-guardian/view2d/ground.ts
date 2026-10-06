/**
 * The drawn village ground of the 2D view (no baked background): a canvas texture of the
 * projected green with a path to the barn, a fence line, and a simple barn across the far end.
 * `PROJECTION` is the same 2D camera as the forge sprites (45 degrees, 64 px per meter).
 * Pure drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { BARN_DOOR, GREEN, GUARDIAN_START } from '../core/index.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.village-guardian';

export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -7.2, vMax: 5.6, width: 922, height: 640 };

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
  const corner = (x: number, z: number) => P(x, 0, z);

  // The grass: everywhere, then a lighter lawn over the green.
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);
  const pad = 0.9;
  fillPoly(ctx, [corner(GREEN.minX - pad, GREEN.minZ - pad), corner(GREEN.maxX + pad, GREEN.minZ - pad), corner(GREEN.maxX + pad, GREEN.maxZ + pad), corner(GREEN.minX - pad, GREEN.maxZ + pad)], '#5d9a46');
  fillPoly(ctx, [corner(GREEN.minX, GREEN.minZ), corner(GREEN.maxX, GREEN.minZ), corner(GREEN.maxX, GREEN.maxZ), corner(GREEN.minX, GREEN.maxZ)], '#86c25f');
  // Mown stripes.
  for (let x = GREEN.minX; x < GREEN.maxX; x += 2.2) {
    const x2 = Math.min(GREEN.maxX, x + 1.1);
    fillPoly(ctx, [corner(x, GREEN.minZ), corner(x2, GREEN.minZ), corner(x2, GREEN.maxZ), corner(x, GREEN.maxZ)], '#7bb856');
  }
  // The dirt path from the start to the barn door.
  fillPoly(ctx, [corner(-0.7, GUARDIAN_START.z + 1.4), corner(0.7, GUARDIAN_START.z + 1.4), corner(0.55, BARN_DOOR.z), corner(-0.55, BARN_DOOR.z)], '#c9a46b');
  // Flower dots at fixed spots.
  const dots: [number, number, string][] = [[-4.6, 3.6, '#fff4a8'], [4.5, 2.4, '#ffd1e8'], [-3.4, -2.2, '#ffd1e8'], [3.8, -2.8, '#fff4a8'], [-4.9, 0.4, '#ffffff'], [4.9, -0.6, '#ffffff'], [2.6, 3.9, '#ffd1e8'], [-2.4, 3.2, '#fff4a8']];
  for (const [x, z, c] of dots) {
    const p = corner(x, z);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // The fence line around the green (posts every meter), open on the near side.
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const a = corner(GREEN.minX, GREEN.maxZ);
  const b = corner(GREEN.minX, GREEN.minZ - 0.3);
  const c = corner(GREEN.maxX, GREEN.minZ - 0.3);
  const d = corner(GREEN.maxX, GREEN.maxZ);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.stroke();
  // The barn across the far end: red front wall, dark roof, a tall door that glows when open.
  const w = 2.6;
  const zf = GREEN.minZ - 0.3;
  const wall = [P(-w, 0, zf), P(w, 0, zf), P(w, 2.4, zf), P(-w, 2.4, zf)];
  fillPoly(ctx, wall, '#b5382f');
  fillPoly(ctx, [P(-w - 0.3, 2.4, zf), P(w + 0.3, 2.4, zf), P(0, 3.9, zf), P(0, 3.9, zf)], '#6b2e25');
  fillPoly(ctx, [P(-w - 0.3, 2.4, zf), P(w + 0.3, 2.4, zf), P(w, 3.1, zf), P(-w, 3.1, zf)], '#6b2e25');
  fillPoly(ctx, [P(-0.9, 0, zf + 0.01), P(0.9, 0, zf + 0.01), P(0.9, 1.8, zf + 0.01), P(-0.9, 1.8, zf + 0.01)], '#4a2018');
  ctx.strokeStyle = '#f3e6d0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const l0 = P(-0.9, 0, zf + 0.01);
  const l1 = P(0.9, 1.8, zf + 0.01);
  const r0 = P(0.9, 0, zf + 0.01);
  const r1 = P(-0.9, 1.8, zf + 0.01);
  ctx.moveTo(l0.x, l0.y);
  ctx.lineTo(l1.x, l1.y);
  ctx.moveTo(r0.x, r0.y);
  ctx.lineTo(r1.x, r1.y);
  ctx.stroke();
  tex.refresh();
  return key;
}
