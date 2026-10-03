/** The pure parts of the Labyrinth views: world geometry, steering, the manifest, and the briefing. */
import { describe, expect, it } from 'vitest';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { CELL_M, MAZES, canMove, wallEdgesOf, type Dir } from '../../src/labyrinth/core/index.js';
import { briefing } from '../../src/labyrinth/briefing.js';
import { FILES_2D, MAZE_IDS, backgroundOf, manifest } from '../../src/labyrinth/manifest.js';
import strings from '../../src/labyrinth/strings.en.js';
import { dirOfStick, edgePoint, edgeYaw, fitCamera, heldTurn, inwardYaw, piecesOf, worldOf, worldOfCell } from '../../src/labyrinth/view/geometry.js';
import { PROJECTIONS } from '../../src/labyrinth/view2d/projections.gen.js';
import { STORY } from './helpers.js';

describe('geometry', () => {
  it('centers the maze on the origin, a cell apart by CELL_M', () => {
    for (const maze of MAZES) {
      const a = worldOfCell(maze, { col: 0, row: 0 });
      const b = worldOfCell(maze, { col: maze.cols - 1, row: maze.rows - 1 });
      expect(a.x).toBeCloseTo(-b.x);
      expect(a.z).toBeCloseTo(-b.z);
      expect(worldOfCell(maze, { col: 1, row: 0 }).x - a.x).toBeCloseTo(CELL_M);
      expect(worldOfCell(maze, { col: 0, row: 1 }).z - a.z).toBeCloseTo(CELL_M);
    }
  });

  it('puts a position between cells between their world points', () => {
    const maze = MAZES[0]!;
    const mid = worldOf(maze, { x: 0.5, y: 0 });
    expect(mid.x).toBeCloseTo((worldOfCell(maze, { col: 0, row: 0 }).x + worldOfCell(maze, { col: 1, row: 0 }).x) / 2);
  });

  it('places one wall piece per wall edge, and none in an opening', () => {
    for (const maze of MAZES) {
      const pieces = piecesOf(maze);
      expect(pieces.walls).toHaveLength(wallEdgesOf(maze).length);
      expect(pieces.floors).toHaveLength(maze.cols * maze.rows);
      for (const cell of [maze.gate]) {
        const gate = edgePoint(maze, cell, maze.gateSide);
        expect(pieces.walls.some((w) => Math.hypot(w.x - gate.x, w.z - gate.z) < 0.01)).toBe(false);
      }
    }
  });

  it('puts every wall on a cell edge between a closed side and its opposite', () => {
    const maze = MAZES[1]!;
    for (const edge of wallEdgesOf(maze)) {
      const side: Dir = edge.side;
      expect(canMove(maze, edge.cell, side)).toBe(false);
    }
  });

  it('turns walls along X for up and down edges and along Z for the others', () => {
    expect(edgeYaw('up')).toBe(0);
    expect(edgeYaw('down')).toBe(0);
    expect(edgeYaw('left')).toBe(90);
    expect(edgeYaw('right')).toBe(90);
    expect(inwardYaw('up')).toBe(0);
    expect(inwardYaw('down')).toBe(180);
  });

  it('puts a pillar at every wall end', () => {
    for (const maze of MAZES) {
      const { walls, pillars } = piecesOf(maze);
      const near = (x: number, z: number): boolean => pillars.some((p) => Math.hypot(p.x - x, p.z - z) < 0.01);
      for (const w of walls) {
        const along = w.yaw === 0 ? { x: CELL_M / 2, z: 0 } : { x: 0, z: CELL_M / 2 };
        expect(near(w.x - along.x, w.z - along.z)).toBe(true);
        expect(near(w.x + along.x, w.z + along.z)).toBe(true);
      }
    }
  });
});

describe('steering', () => {
  it('ignores a small stick', () => {
    expect(dirOfStick(0.1, -0.2)).toBeNull();
  });
  it('maps the stronger axis, screen y down', () => {
    expect(dirOfStick(0, -1)).toBe('up');
    expect(dirOfStick(0, 1)).toBe('down');
    expect(dirOfStick(-1, 0.2)).toBe('left');
    expect(dirOfStick(0.9, -0.3)).toBe('right');
    expect(dirOfStick(0.7, 0.7)).toBe('down');
  });
});

describe('held stick', () => {
  it('owes a turn only when the hero neither walks nor has queued that way', () => {
    expect(heldTurn(null, { dir: 'right', queued: null })).toBeNull();
    expect(heldTurn('up', { dir: 'right', queued: null })).toEqual({ type: 'turn', dir: 'up' });
    expect(heldTurn('up', { dir: 'right', queued: 'up' })).toBeNull();
    expect(heldTurn('up', { dir: 'up', queued: null })).toBeNull();
  });
});

describe('camera fit', () => {
  /** The maze corners on screen must stay inside the view (a pinhole camera looking at the target). */
  function corners(aspect: number, elevation: number): { x: number; y: number }[] {
    const maze = MAZES[0]!;
    const fov = 50;
    const fit = fitCamera(maze, aspect, fov, elevation);
    const el = (elevation * Math.PI) / 180;
    const cam = { x: fit.target.x + fit.offset[0], y: fit.offset[1], z: fit.target.z + fit.offset[2] };
    // The view direction runs from the camera to the target; up is perpendicular, in the YZ plane.
    const dir = { x: 0, y: -Math.sin(el), z: -Math.cos(el) };
    const up = { x: 0, y: Math.cos(el), z: -Math.sin(el) };
    const tan = Math.tan((fov * Math.PI) / 360);
    const out: { x: number; y: number }[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const h of [0, 1.2]) {
          const p = { x: sx * maze.cols, y: h, z: sz * maze.rows };
          const v = { x: p.x - cam.x, y: p.y - cam.y, z: p.z - cam.z };
          const depth = v.x * dir.x + v.y * dir.y + v.z * dir.z;
          out.push({ x: v.x / depth / (tan * aspect), y: (v.y * up.y + v.z * up.z) / depth / tan });
        }
      }
    }
    return out;
  }

  for (const [aspect, elevation] of [[16 / 9, 66], [390 / 844, 70], [1, 66]] as const) {
    it(`shows every corner of the maze at aspect ${aspect.toFixed(2)}`, () => {
      for (const c of corners(aspect, elevation)) {
        expect(Math.abs(c.x)).toBeLessThanOrEqual(1);
        expect(c.y).toBeLessThanOrEqual(1);
        expect(c.y).toBeGreaterThanOrEqual(-1);
      }
    });
  }
});

describe('cartridge text and files', () => {
  it('has a baked background and a projection for every maze', () => {
    expect(MAZE_IDS).toEqual(MAZES.map((m) => m.id));
    for (const id of MAZE_IDS) {
      expect(FILES_2D).toContain(backgroundOf(id));
      expect(PROJECTIONS[id]).toBeDefined();
    }
  });

  it('has a valid manifest for both renderers', () => {
    expect(manifest.id).toBe('labyrinth');
    expect(manifest.renderers).toEqual(['three', 'phaser']);
    expect(manifest.simulation).toBe('realtime');
  });

  it('builds a briefing from the catalog', () => {
    const i18n = createI18n([strings]).scope('labyrinth');
    const b = briefing(i18n, STORY);
    expect(b.instructions).toHaveLength(3);
    expect(b.title).toBe(strings.labyrinth.title);
    expect(b.controls.length).toBeGreaterThan(0);
  });
});
