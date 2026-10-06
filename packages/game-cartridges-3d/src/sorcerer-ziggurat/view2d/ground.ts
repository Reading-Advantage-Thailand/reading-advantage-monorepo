/**
 * The drawn night plain and stone foot of the 2D view (no baked background): a canvas texture of
 * the projected ground with fixed stars. `PROJECTION` is the same 2D camera as the forge sprites
 * (45 degrees, 64 px per meter). The ziggurat itself (the cubes and the summit) is drawn live by
 * the view. Pure drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Lane } from '../core/index.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.sorcerer-ziggurat';

/** Meters: lane columns, cube width, climb and depth of one tier, and the z of the foot. */
export const LANE_X: Readonly<Record<Lane, number>> = { left: -2, forward: 0, right: 2 };
export const CUBE_WIDTH = 1.7;
export const STEP_Y = 0.8;
export const STEP_Z = 2;
export const FOOT_Z = 2;

/** The world point of the top centre of a cube (tier 0 is the foot). */
export function tierPoint(tier: number, lane: Lane): { x: number; y: number; z: number } {
  if (tier <= 0) return { x: 0, y: 0, z: FOOT_Z };
  return { x: LANE_X[lane], y: tier * STEP_Y, z: FOOT_Z - tier * STEP_Z };
}

/** The ground is tall: the summit of the longest ritual (8 words) is 9 tiers up. */
export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -4, vMax: 19, width: 512, height: 1440 };

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
  const P = (x: number, z: number) => project(PROJECTION, x, 0, z);

  // The night sky with fixed stars, down to the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, PROJECTION.height);
  sky.addColorStop(0, '#0d0b24');
  sky.addColorStop(1, '#1d1740');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % PROJECTION.width;
    const y = (i * 61.8) % (PROJECTION.height * 0.8);
    ctx.fillStyle = i % 5 === 0 ? '#ffe9a8' : '#c9d4ff';
    ctx.fillRect(x, y, 2 + (i % 3 === 0 ? 1 : 0), 2 + (i % 3 === 0 ? 1 : 0));
  }
  // The plain: dark earth around the foot, then the stone platform of the foot.
  fillPoly(ctx, [P(-4, FOOT_Z - 3), P(4, FOOT_Z - 3), P(4, FOOT_Z + 3), P(-4, FOOT_Z + 3)], '#241c3d');
  fillPoly(ctx, [P(-3.4, FOOT_Z - 1.2), P(3.4, FOOT_Z - 1.2), P(3.4, FOOT_Z + 2.4), P(-3.4, FOOT_Z + 2.4)], '#4a3d6e');
  ctx.strokeStyle = '#6f5ca0';
  ctx.lineWidth = 2;
  for (const x of [-1.7, 0, 1.7]) {
    const a = P(x, FOOT_Z - 1.2);
    const b = P(x, FOOT_Z + 2.4);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // The rune ring around the foot (an ellipse in projection).
  ctx.strokeStyle = '#8f7bff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k <= 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const p = P(Math.cos(a) * 3, FOOT_Z + 0.6 + Math.sin(a) * 1.6);
    if (k === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  // Pillars at the corners, and two braziers.
  for (const [x, z] of [[-3.2, FOOT_Z - 1], [3.2, FOOT_Z - 1], [-3.2, FOOT_Z + 2.2], [3.2, FOOT_Z + 2.2]] as const) {
    const base = project(PROJECTION, x, 0, z);
    const top = project(PROJECTION, x, 1.6, z);
    ctx.fillStyle = '#6b5a86';
    ctx.fillRect(base.x - 9, top.y, 18, base.y - top.y);
    ctx.fillStyle = '#8a76ab';
    ctx.fillRect(base.x - 12, top.y - 5, 24, 8);
  }
  for (const x of [-2.6, 2.6]) {
    const p = project(PROJECTION, x, 0.5, FOOT_Z + 0.6);
    ctx.fillStyle = '#4b4562';
    ctx.fillRect(p.x - 10, p.y, 20, 18);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
  return key;
}
