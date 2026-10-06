/**
 * The drawn tower of the 2D view (no baked background): a stone wall seen straight from the
 * front, a ledge for every row, pillars at the sides, the gate arch at the top, and the arch of
 * a window. `PROJECTION` is a front camera (elevation 0) at the same 64 pixels per meter as the
 * forge sprites, so a sprite at height y meters stands y * 64 pixels above its foot line. Pure
 * drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import type { Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';

export const PPM = 64;
/** Front camera: world (x, y) is the pixel (x * PPM, -y * PPM); `z` only orders the drawing. */
export const PROJECTION: Projection2D = { elevation: 0, ppm: PPM, uMin: 0, vMax: 0, width: 0, height: 0 };

/** Same grid as the 3D tower: meters between columns and rows. */
export const COLUMN_WIDTH = 1.7;
export const ROW_HEIGHT = 1.5;
export const columnX = (col: number): number => (col - 1.5) * COLUMN_WIDTH;
export const rowY = (row: number): number => row * ROW_HEIGHT;

/** The half width of the wall in meters (the pillars stand just outside). */
export const HALF_WALL = 4.2;

/** Draws the wall, the ledges, the pillars, and the gate arch for a tower whose top is at `summitRow`. */
export function drawTower(g: Phaser.GameObjects.Graphics, summitRow: number): void {
  g.clear();
  const top = rowY(summitRow) + 6;
  const left = -HALF_WALL * PPM;
  const width = 2 * HALF_WALL * PPM;
  // The wall.
  g.fillStyle(0x59546b, 1).fillRect(left, -top * PPM, width, (top + 4) * PPM);
  // Stone courses: a line every 0.5 m, with offset joints.
  g.lineStyle(2, 0x45415a, 1);
  const courses = Math.ceil((top + 4) / 0.5);
  for (let k = 0; k < courses; k++) {
    const y = -top * PPM + k * 0.5 * PPM;
    g.lineBetween(left, y, left + width, y);
    const offset = (k % 2) * 0.7 * PPM;
    for (let x = left + offset; x < left + width; x += 1.4 * PPM) g.lineBetween(x, y, x, y + 0.5 * PPM);
  }
  // A ledge for every row: the climber stands on it.
  for (let r = 0; r <= summitRow; r++) {
    const y = -rowY(r) * PPM;
    g.fillStyle(0x000000, 0.25).fillRect(left + 8, y + 10, width - 16, 8);
    g.fillStyle(0x8a8098, 1).fillRect(left + 8, y - 2, width - 16, 12);
    g.fillStyle(0xb2a8c2, 1).fillRect(left + 8, y - 2, width - 16, 3);
  }
  // Pillars along both sides.
  for (const side of [-1, 1]) {
    const px = side * (HALF_WALL + 0.35) * PPM;
    g.fillStyle(0x6d667e, 1).fillRect(px - 0.35 * PPM, -top * PPM, 0.7 * PPM, (top + 4) * PPM);
    g.fillStyle(0x8d86a0, 1).fillRect(px - 0.35 * PPM, -top * PPM, 0.14 * PPM, (top + 4) * PPM);
    for (let r = 0; r <= summitRow; r += 2) g.fillStyle(0x4c465d, 1).fillRect(px - 0.42 * PPM, -rowY(r) * PPM - 6, 0.84 * PPM, 12);
  }
  // The dark ground below the foot.
  g.fillStyle(0x1a1e28, 1).fillRect(left - 400, 8, width + 800, 600);
}

/** Draws one stone window arch with its sill at (0, 0); `color` is the glass. */
export function drawWindow(g: Phaser.GameObjects.Graphics, glass: number, alpha = 1): void {
  g.clear();
  const w = 1.2 * PPM;
  const h = 1.15 * PPM;
  g.fillStyle(0x3a3548, 1).fillRoundedRect(-w / 2 - 6, -h - w / 2 - 6, w + 12, h + w / 2 + 6, { tl: w / 2 + 6, tr: w / 2 + 6, bl: 0, br: 0 });
  g.fillStyle(glass, alpha).fillRoundedRect(-w / 2, -h - w / 2, w, h + w / 2, { tl: w / 2, tr: w / 2, bl: 0, br: 0 });
  g.lineStyle(3, 0x2a2536, 1).lineBetween(0, -h - w / 2, 0, 0).lineBetween(-w / 2, -h * 0.55, w / 2, -h * 0.55);
}
