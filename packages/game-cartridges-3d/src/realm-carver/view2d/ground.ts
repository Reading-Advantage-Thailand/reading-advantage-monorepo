/**
 * The drawn ground of the 2D view (no baked background): a canvas texture of the lawn around the
 * board, and a redrawn layer of the board cells (wild forest floor, claimed land, the gold trail).
 * `PROJECTION` is the same 2D camera as the forge sprites (45 degrees, 64 px per meter).
 * Pure drawing from fixed numbers: no randomness.
 */
import type * as Phaser from 'phaser';
import { project, textureKeyOf, type Projection2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { BOARD_SIZE, type CellState } from '../core/index.js';
import { CELL_M, worldOf } from '../view/geometry.js';

/** The file id of the drawn ground (it has no file in the pack: the texture is made at start). */
export const GROUND_FILE = 'background.realm-carver';

export const PROJECTION: Projection2D = { elevation: 45, ppm: 64, uMin: -7, vMax: 6, width: 896, height: 688 };

const FOREST = [0x3f7a45, 0x46844c] as const;
const LAND = [0x9be07f, 0x90d673] as const;
const EDGE = 0x74c460;
const TRAIL = 0xffd84a;

/** Makes the lawn texture once per scene and returns its key (the key `Arena2D` loads). */
export function makeGround(scene: Phaser.Scene, edition: RuntimeEdition): string {
  const key = textureKeyOf(edition, GROUND_FILE);
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, PROJECTION.width, PROJECTION.height);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(0, 0, PROJECTION.width, PROJECTION.height);
  const P = (x: number, z: number) => project(PROJECTION, x, 0, z);
  // A lighter lawn, then a dark rim under the board.
  const half = (BOARD_SIZE * CELL_M) / 2;
  const poly = (pad: number, color: string): void => {
    const pts = [P(-half - pad, -half - pad), P(half + pad, -half - pad), P(half + pad, half + pad), P(-half - pad, half + pad)];
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  poly(1.6, '#7ab95b');
  poly(0.25, '#3a5a2c');
  tex.refresh();
  return key;
}

/** The board layer: one projected diamond per cell, redrawn when the grid changes. */
export class BoardLayer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private signature = '';

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.graphics = scene.add.graphics().setDepth(-1e9 + 1);
    parent.add(this.graphics);
  }

  draw(grid: readonly (readonly CellState[])[]): void {
    const signature = grid.map((row) => row.map((c) => c[0]).join('')).join('/');
    if (signature === this.signature) return;
    this.signature = signature;
    const g = this.graphics;
    g.clear();
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const state = grid[row]![col]!;
        const border = col === 0 || row === 0 || col === BOARD_SIZE - 1 || row === BOARD_SIZE - 1;
        const parity = (col + row) % 2;
        const color = state === 'trail' ? TRAIL : state === 'claimed' ? (border ? EDGE : LAND[parity]!) : FOREST[parity]!;
        const at = worldOf({ col, row });
        const h = CELL_M / 2;
        const a = project(PROJECTION, at.x - h, 0, at.z - h);
        const b = project(PROJECTION, at.x + h, 0, at.z - h);
        const c = project(PROJECTION, at.x + h, 0, at.z + h);
        const d = project(PROJECTION, at.x - h, 0, at.z + h);
        g.fillStyle(color, 1).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y).fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
