/**
 * Where the board stands in the world, for both views. Pure: no three.js, no Phaser. The board is
 * centered on the origin; one cell is `CELL_M` meters; `col` grows to +X and `row` grows to +Z
 * (toward the camera), so `up` on the board is away from the camera.
 */
import { BOARD_SIZE, type Cell } from '../core/index.js';

export const CELL_M = 1;

export interface Ground {
  x: number;
  z: number;
}

/** The world point of the middle of a cell (or of a gliding position in cell units). */
export function worldOf(pos: { col: number; row: number }): Ground {
  return { x: (pos.col - (BOARD_SIZE - 1) / 2) * CELL_M, z: (pos.row - (BOARD_SIZE - 1) / 2) * CELL_M };
}

export const worldOfCell = (cell: Cell): Ground => worldOf(cell);

/** Half the board size in meters. */
export const HALF_M = (BOARD_SIZE * CELL_M) / 2;

export interface CameraFit {
  /** Camera offset from the target, in meters. */
  offset: [number, number, number];
  /** The ground point the camera looks at (z is shifted so the board sits below the top HUD). */
  target: Ground;
}

/**
 * A fixed camera that shows the whole board. `aspect` is width over height of the view, `fov` the
 * vertical field of view in degrees, `elevation` the angle of the view above the ground in
 * degrees, and `topShare` the share of the screen height the top HUD covers.
 */
export function fitCamera(aspect: number, fov: number, elevation: number, topShare = 0.16, height = 0.8): CameraFit {
  const w = HALF_M + 0.8;
  const el = (elevation * Math.PI) / 180;
  const tanV = Math.tan((fov * Math.PI) / 360);
  const tanH = tanV * aspect;
  const free = 1 - topShare;
  const needV = (w * Math.sin(el) + height * Math.cos(el)) / (tanV * free) + w * Math.cos(el);
  const needH = w / tanH + w * Math.cos(el);
  const d = Math.max(needV, needH, 8);
  const shift = ((topShare / 2) * 2 * d * tanV) / Math.sin(el);
  return { offset: [0, d * Math.sin(el), d * Math.cos(el)], target: { x: 0, z: -shift } };
}
