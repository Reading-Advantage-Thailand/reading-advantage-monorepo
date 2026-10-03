/** The authored mazes are valid: 9 x 7, connected, with loops, dens away from the start, and a gate on the border. */
import { describe, expect, it } from 'vitest';
import {
  MAZES,
  MAZE_COLS,
  MAZE_ROWS,
  canMove,
  cellIndex,
  cellsOf,
  distancesFrom,
  exitsOf,
  inBounds,
  isCrossing,
  loopsOf,
  mazeById,
  neighborOf,
  oppositeOf,
  parseMaze,
  positionOf,
  sameCell,
  wallEdgesOf,
  wallsAt,
  type Dir,
} from '../../src/labyrinth/core/index.js';

describe('mazes', () => {
  it('there are three mazes of 9 x 7 cells with distinct ids', () => {
    expect(MAZES.map((m) => m.id)).toEqual(['labyrinth-1', 'labyrinth-2', 'labyrinth-3']);
    for (const m of MAZES) {
      expect(m.cols).toBe(MAZE_COLS);
      expect(m.rows).toBe(MAZE_ROWS);
      expect(m.walls).toHaveLength(63);
      expect(mazeById(m.id)).toBe(m);
    }
    expect(() => mazeById('labyrinth-9')).toThrow();
  });

  it.each(MAZES.map((m) => [m.id] as const))('%s is connected, has loops, dens away from the start, a gate on the border', (id) => {
    const m = mazeById(id);
    const dist = distancesFrom(m, m.start);
    expect(cellsOf(m).every((c) => Number.isFinite(dist[cellIndex(m, c)]))).toBe(true);
    expect(loopsOf(m)).toBeGreaterThanOrEqual(3);
    expect(m.dens.length).toBeGreaterThanOrEqual(2);
    expect(m.dens.length).toBeLessThanOrEqual(3);
    for (const den of m.dens) {
      expect(inBounds(m, den)).toBe(true);
      expect(sameCell(den, m.start)).toBe(false);
      expect(dist[cellIndex(m, den)]!).toBeGreaterThanOrEqual(8);
    }
    expect(new Set(m.dens.map((d) => `${d.col},${d.row}`)).size).toBe(m.dens.length);
    expect(inBounds(m, m.gate)).toBe(true);
    expect(inBounds(m, neighborOf(m.gate, m.gateSide))).toBe(false);
    expect(wallsAt(m, m.gate)[m.gateSide]).toBe(false);
    expect(canMove(m, m.gate, m.gateSide)).toBe(false);
    expect(cellsOf(m).filter((c) => isCrossing(m, c)).length).toBeGreaterThanOrEqual(6);
  });

  it('walls agree on both sides of every edge, and the outer wall closes the maze except at the gate', () => {
    for (const m of MAZES) {
      for (const cell of cellsOf(m)) {
        for (const dir of ['up', 'down', 'left', 'right'] as Dir[]) {
          const other = neighborOf(cell, dir);
          if (inBounds(m, other)) expect(wallsAt(m, cell)[dir]).toBe(wallsAt(m, other)[oppositeOf(dir)]);
          else expect(wallsAt(m, cell)[dir]).toBe(!(sameCell(cell, m.gate) && dir === m.gateSide));
        }
      }
    }
  });

  it('wallEdgesOf lists every wall once', () => {
    for (const m of MAZES) {
      const edges = wallEdgesOf(m);
      let expected = 0;
      for (const cell of cellsOf(m)) {
        const w = wallsAt(m, cell);
        if (w.up) expected += 1;
        if (w.left) expected += 1;
        if (w.down && cell.row === m.rows - 1) expected += 1;
        if (w.right && cell.col === m.cols - 1) expected += 1;
      }
      expect(edges).toHaveLength(expected);
      expect(edges.every((e) => wallsAt(m, e.cell)[e.side])).toBe(true);
      // Each shared edge appears once: two cells never both list the same wall.
      const keys = new Set(
        edges.map((e) => {
          const c = e.side === 'down' || e.side === 'right' ? neighborOf(e.cell, e.side) : e.cell;
          const side = e.side === 'down' ? 'up' : e.side === 'right' ? 'left' : e.side;
          return `${c.col},${c.row},${side}`;
        }),
      );
      expect(keys.size).toBe(edges.length);
    }
  });

  it('maze 1 has the corridor the rules tests walk', () => {
    const m = mazeById('labyrinth-1');
    expect(m.start).toEqual({ col: 0, row: 0 });
    expect(exitsOf(m, { col: 0, row: 0 })).toEqual(['down', 'right']);
    expect(exitsOf(m, { col: 1, row: 0 })).toEqual(['left', 'right']);
    expect(exitsOf(m, { col: 2, row: 0 })).toEqual(['left', 'right']);
    expect(exitsOf(m, { col: 3, row: 0 })).toEqual(['down', 'left']);
    expect(isCrossing(m, { col: 2, row: 2 })).toBe(true);
    expect(exitsOf(m, { col: 4, row: 5 })).toEqual(['down']);
  });

  it('parseMaze rejects a malformed picture', () => {
    // A maze needs a start 'S', a den 'D', and one gate slot 'G' in the outer wall.
    const ok = ['#####', '#S DG', '#####'].join('\n');
    expect(parseMaze('t', ok)).toMatchObject({ cols: 2, rows: 1, start: { col: 0, row: 0 }, gate: { col: 1, row: 0 }, gateSide: 'right' });
    expect(() => parseMaze('t', ['#####', '#   G', '#####'].join('\n'))).toThrow(/start/);
    expect(() => parseMaze('t', ['#####', '#S  #', '#####'].join('\n'))).toThrow(/gate/);
    expect(() => parseMaze('t', ['#####', '#SG G', '#####'].join('\n'))).toThrow(/gate/);
    expect(() => parseMaze('t', ['#####', '#S  G', '####'].join('\n'))).toThrow(/characters/);
    expect(() => parseMaze('t', ['#####', '#S X#', '#####'].join('\n'))).toThrow(/holds/);
  });

  it('positionOf interpolates between a cell and its next cell', () => {
    expect(positionOf({ cell: { col: 2, row: 3 }, next: null, progress: 0, dir: null })).toEqual({ x: 2, y: 3 });
    expect(positionOf({ cell: { col: 2, row: 3 }, next: { col: 2, row: 2 }, progress: 0.25, dir: 'up' })).toEqual({ x: 2, y: 2.75 });
    expect(positionOf({ cell: { col: 2, row: 3 }, next: { col: 3, row: 3 }, progress: 0.5, dir: 'right' })).toEqual({ x: 2.5, y: 3 });
  });
});
