/**
 * The drawn well of the 2D view (no baked background): a canvas texture of the projected ground
 * at night with the pit, its stone ring, the eight lane lines, a village well in the middle,
 * rocks, crystals, and candles. `PROJECTION` is the same 2D camera as the forge sprites (45
 * degrees, 64 px per meter). Pure drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { ARCHER_RADIUS, BOTTOM_RADIUS, LANES, RIM_RADIUS, laneAngle } from '../core/index.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.abyssal-well';

export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -8.2, vMax: 8.2, width: 1056, height: 860 };

type Ctx = CanvasRenderingContext2D;

/** Makes the ground texture once per scene and returns its key (the key `Arena2D` loads). */
export function makeGround(scene: Phaser.Scene, edition: RuntimeEdition): string {
  const key = textureKeyOf(edition, GROUND_FILE);
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, PROJECTION.width, PROJECTION.height);
  if (!tex) return key;
  const ctx: Ctx = tex.getContext();
  const P = (x: number, z: number, y = 0) => project(PROJECTION, x, y, z);

  /** A circle of the ground (an ellipse on screen) as a path. */
  const circle = (r: number, cx = 0, cz = 0): void => {
    ctx.beginPath();
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const p = P(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  };

  // The night sky, then stars at fixed spots.
  ctx.fillStyle = '#090d1c';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);
  for (let i = 0; i < 80; i++) {
    const x = (i * 137.5) % PROJECTION.width;
    const y = (i * 61.8) % (PROJECTION.height * 0.3);
    ctx.fillStyle = i % 5 === 0 ? '#ffe9a8' : '#c9d4ff';
    ctx.fillRect(x, y, 2 + (i % 3 === 0 ? 1 : 0), 2 + (i % 3 === 0 ? 1 : 0));
  }
  // Dark earth, then the lighter clearing around the well.
  const left = P(-8.2, 7.4);
  const right = P(8.2, 7.4);
  const farL = P(-8.2, -7.6);
  const farR = P(8.2, -7.6);
  ctx.fillStyle = '#1f1a33';
  ctx.beginPath();
  ctx.moveTo(farL.x, farL.y);
  ctx.lineTo(farR.x, farR.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#332a52';
  circle(ARCHER_RADIUS + 1.6);
  ctx.fill();
  // The archer's circle: a faint ring.
  ctx.strokeStyle = '#6f8fd8';
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  circle(ARCHER_RADIUS);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The pit and its stone ring.
  ctx.fillStyle = '#05060d';
  circle(RIM_RADIUS + 0.35);
  ctx.fill();
  ctx.strokeStyle = '#7a7688';
  ctx.lineWidth = 9;
  circle(RIM_RADIUS + 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#57536a';
  ctx.lineWidth = 3;
  circle(RIM_RADIUS + 0.78);
  ctx.stroke();
  // The eight lane lines and a step mark at each depth.
  for (let lane = 0; lane < LANES; lane++) {
    const a = laneAngle(lane);
    const from = P(Math.sin(a) * BOTTOM_RADIUS, Math.cos(a) * BOTTOM_RADIUS);
    const to = P(Math.sin(a) * RIM_RADIUS, Math.cos(a) * RIM_RADIUS);
    ctx.strokeStyle = '#3a4e86';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.fillStyle = '#5c78c4';
    for (let d = 0; d <= 4; d++) {
      const r = BOTTOM_RADIUS + (d / 4) * (RIM_RADIUS - BOTTOM_RADIUS);
      const p = P(Math.sin(a) * r, Math.cos(a) * r);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The village well in the middle: a stone cylinder.
  const top = P(0, 0, 0.9);
  const base = P(0, 0, 0);
  ctx.fillStyle = '#8b8795';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, 54, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(top.x - 54, top.y, 108, base.y - top.y);
  ctx.fillStyle = '#a9a5b4';
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, 54, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#05060d';
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, 38, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rocks around the far half, crystals, and candles by the archer.
  ctx.fillStyle = '#4b4562';
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * 0.95 + (k / 6) * Math.PI * 1.9;
    const p = P(Math.sin(a) * 8.1, -Math.abs(Math.cos(a)) * 8.1 - 0.4);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, z] of [[-7.2, -2.6], [7.2, -3], [-4.2, -7], [4.5, -7.2]] as const) {
    const p = P(x, z);
    ctx.fillStyle = '#6fb2ff55';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 16, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8ec6ff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 44);
    ctx.lineTo(p.x - 12, p.y);
    ctx.lineTo(p.x + 12, p.y);
    ctx.closePath();
    ctx.fill();
  }
  for (let k = 0; k < 6; k++) {
    const a = ((k - 2.5) / 5) * Math.PI * 0.8;
    const p = P(Math.sin(a) * (ARCHER_RADIUS + 1.7), Math.cos(a) * (ARCHER_RADIUS + 1.7));
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
