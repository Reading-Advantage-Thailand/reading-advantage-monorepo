/**
 * The drawn hall of the 2D view (no baked background): a canvas texture of the library at
 * night, seen from the 2D camera: a plaster back wall with shelves and a window, a floor of
 * wood planks, a rune ring in the middle, and candles at the front corners. `PROJECTION` is the
 * same 2D camera as the forge sprites (45 degrees, 64 px per meter). Pure drawing from fixed
 * numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { HALL, HERO_START } from '../core/index.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.enchanted-library';

export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -7.2, vMax: 5.6, width: 922, height: 640 };

type Ctx = CanvasRenderingContext2D;
type Pt = { x: number; y: number };

const fillPoly = (ctx: Ctx, pts: Pt[], color: string): void => {
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
  const P = (x: number, y: number, z: number): Pt => project(PROJECTION, x, y, z);
  const wallZ = HALL.minZ - 0.6;
  const wallH = 2.4;
  const x0 = HALL.minX - 0.6;
  const x1 = HALL.maxX + 0.6;

  ctx.fillStyle = '#171226';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);
  // The back wall: plaster, with a dark skirting, a window, and shelves of books.
  fillPoly(ctx, [P(x0, 0, wallZ), P(x1, 0, wallZ), P(x1, wallH, wallZ), P(x0, wallH, wallZ)], '#4a3d63');
  fillPoly(ctx, [P(x0, 0, wallZ), P(x1, 0, wallZ), P(x1, 0.25, wallZ), P(x0, 0.25, wallZ)], '#2a1f33');
  fillPoly(ctx, [P(-0.9, 0.9, wallZ + 0.01), P(0.9, 0.9, wallZ + 0.01), P(0.9, 2.1, wallZ + 0.01), P(-0.9, 2.1, wallZ + 0.01)], '#1b2a5c');
  fillPoly(ctx, [P(-0.05, 0.9, wallZ + 0.02), P(0.05, 0.9, wallZ + 0.02), P(0.05, 2.1, wallZ + 0.02), P(-0.05, 2.1, wallZ + 0.02)], '#c9b8ff');
  const spines = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'];
  for (const [sx0, sx1] of [[-5.4, -1.6], [1.6, 5.4]] as const) {
    fillPoly(ctx, [P(sx0, 0.25, wallZ + 0.05), P(sx1, 0.25, wallZ + 0.05), P(sx1, 2.2, wallZ + 0.05), P(sx0, 2.2, wallZ + 0.05)], '#3a2615');
    for (const [r, y] of [[0, 0.35], [1, 0.95], [2, 1.55]] as const) {
      fillPoly(ctx, [P(sx0, y + 0.55, wallZ + 0.06), P(sx1, y + 0.55, wallZ + 0.06), P(sx1, y + 0.6, wallZ + 0.06), P(sx0, y + 0.6, wallZ + 0.06)], '#5a3d22');
      for (let k = 0; k < 14; k++) {
        const bx = sx0 + 0.1 + k * ((sx1 - sx0 - 0.2) / 14);
        const bh = 0.38 + ((k * 7 + r * 3) % 4) * 0.04;
        fillPoly(ctx, [P(bx, y, wallZ + 0.07), P(bx + 0.2, y, wallZ + 0.07), P(bx + 0.2, y + bh, wallZ + 0.07), P(bx, y + bh, wallZ + 0.07)], spines[(k + r) % spines.length]!);
      }
    }
  }
  // The floor: a dark border, then planks (bands across the hall) with seams.
  const pad = 0.6;
  fillPoly(ctx, [P(x0, 0, wallZ), P(x1, 0, wallZ), P(x1, 0, HALL.maxZ + pad), P(x0, 0, HALL.maxZ + pad)], '#2a1f33');
  const floorCorners = [P(HALL.minX - 0.3, 0, HALL.minZ - 0.3), P(HALL.maxX + 0.3, 0, HALL.minZ - 0.3), P(HALL.maxX + 0.3, 0, HALL.maxZ + 0.3), P(HALL.minX - 0.3, 0, HALL.maxZ + 0.3)];
  fillPoly(ctx, floorCorners, '#6b4a2f');
  const plank = 0.8;
  for (let z = HALL.minZ - 0.3, i = 0; z < HALL.maxZ + 0.3; z += plank, i++) {
    const zz = Math.min(z + plank, HALL.maxZ + 0.3);
    if (i % 2 === 0) fillPoly(ctx, [P(HALL.minX - 0.3, 0, z), P(HALL.maxX + 0.3, 0, z), P(HALL.maxX + 0.3, 0, zz), P(HALL.minX - 0.3, 0, zz)], '#7a5536');
    ctx.strokeStyle = '#4a3322';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const a = P(HALL.minX - 0.3, 0, z);
    const b = P(HALL.maxX + 0.3, 0, z);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // The rune ring around the starting place, twice, with marks at fixed angles.
  for (const [r, color, width] of [[1.6, '#ffd98a', 4], [1.15, '#b98a3a', 2]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const p = P(HERO_START.x + Math.cos(a) * r, 0, HERO_START.z + Math.sin(a) * r);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd98a';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const p = P(HERO_START.x + Math.cos(a) * 1.6, 0, HERO_START.z + Math.sin(a) * 1.6);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Candles at the front corners.
  for (const x of [HALL.minX - 0.1, HALL.maxX + 0.1]) {
    const p = P(x, 0, HALL.maxZ + 0.1);
    ctx.fillStyle = '#f3e6d0';
    ctx.fillRect(p.x - 4, p.y - 14, 8, 14);
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
  return key;
}
