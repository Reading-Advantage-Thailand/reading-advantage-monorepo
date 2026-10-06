/**
 * The drawn spell circle of the 2D view (no baked background): a canvas texture of the projected
 * floor at night with a rune ring and fixed stars. `PROJECTION` is the same 2D camera as the forge
 * sprites (45 degrees, 64 px per meter). Pure drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { FLOOR, MAGE_START } from '../core/index.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.astral-mage';

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

  // The night sky, then stars at fixed spots.
  ctx.fillStyle = '#0b1030';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);
  for (let i = 0; i < 70; i++) {
    const x = (i * 137.5) % PROJECTION.width;
    const y = (i * 61.8) % (PROJECTION.height * 0.35);
    ctx.fillStyle = i % 5 === 0 ? '#ffe9a8' : '#c9d4ff';
    ctx.fillRect(x, y, 2 + (i % 3 === 0 ? 1 : 0), 2 + (i % 3 === 0 ? 1 : 0));
  }
  // The ground: dark earth everywhere, then the floor of the crystals, a little lighter.
  const pad = 2.6;
  fillPoly(ctx, [corner(FLOOR.minX - pad, FLOOR.minZ - pad), corner(FLOOR.maxX + pad, FLOOR.minZ - pad), corner(FLOOR.maxX + pad, MAGE_START.z + 1.6), corner(FLOOR.minX - pad, MAGE_START.z + 1.6)], '#2a2140');
  fillPoly(ctx, [corner(FLOOR.minX - 0.8, FLOOR.minZ - 0.8), corner(FLOOR.maxX + 0.8, FLOOR.minZ - 0.8), corner(FLOOR.maxX + 0.8, MAGE_START.z + 0.9), corner(FLOOR.minX - 0.8, MAGE_START.z + 0.9)], '#3b2f5a');
  // The rune ring around the middle of the floor (an ellipse in projection), twice.
  const mid = { x: 0, z: (FLOOR.minZ + FLOOR.maxZ) / 2 };
  for (const [r, color, width] of [[4.7, '#8f7bff', 4], [3.2, '#5d4bb8', 2]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k <= 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      const p = corner(mid.x + Math.cos(a) * r * 1.05, mid.z + Math.sin(a) * r * 0.75);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // Rune marks on the ring at fixed angles.
  ctx.fillStyle = '#c9b8ff';
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const p = corner(mid.x + Math.cos(a) * 4.7 * 1.05, mid.z + Math.sin(a) * 4.7 * 0.75);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Stones along the far edge and candles by the mage.
  ctx.fillStyle = '#4b4562';
  for (const x of [-6.4, -3.2, 0.4, 3.6, 6.5]) {
    const p = corner(x, FLOOR.minZ - 0.9);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const x of [-4.2, 4.2]) {
    const p = corner(x, MAGE_START.z + 0.2);
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
