/**
 * The authored mazes of Labyrinth of the Goblin King and the grid helpers every rule uses.
 * A maze is ASCII art parsed at load: cells at odd rows and columns, wall slots between them,
 * `#` a wall, a space an opening, `S` the start cell, `D` a den cell, and `G` the gate slot in
 * the outer wall next to the gate cell. Every cell is floor; only the edges carry walls.
 */
import type { Cell, CellWalls, Dir, Maze, Mover, WallEdge } from './types.js';

export const MAZE_COLS = 9;
export const MAZE_ROWS = 7;

const LABYRINTH_1 = `
###################
#S      #       # #
# ##### # ##### # #
# #   #   #   #   #
# # # ##### # ### #
#   #     # #   #D#
##### ### # ### # #
#D  #   #   #   # #
# # # ### ##### # #
# #   #     #     #
# ##### ### # ### #
#   #   # #   #   #
# # # ### ##### # #
# #     #      D# #
#######G###########
`;

const LABYRINTH_2 = `
###################
#     #     #    D#
# ### # ### # ### #
# #   #   #   #   #
# # ### # # ### # #
#   #   # #   # # #
### # ### ### # # #
#S    #  D  #   # G
### # ##### ### # #
#   #     # #   # #
# # ### # # ### # #
# #   # #   #   # #
# ### # ### # # # #
#     #     #    D#
###################
`;

const LABYRINTH_3 = `
###################
#D  #     #       #
# # # ### # ##### #
# #   #D#   #   # #
# ##### # ### # # #
#     #   #   # # #
# ### ### # ### # #
#   #   #   #   # #
# # # # ##### ### #
# #   #     #    D#
# ##### ### # ### #
#   #     #   # # #
### # ##### ### # #
#S      #         #
#########G#########
`;

const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const oppositeOf = (dir: Dir): Dir => opposite[dir];

const STEP: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export const sameCell = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;

export const neighborOf = (cell: Cell, dir: Dir): Cell => ({
  col: cell.col + STEP[dir].col,
  row: cell.row + STEP[dir].row,
});

export const cellIndex = (maze: Pick<Maze, 'cols'>, cell: Cell): number => cell.row * maze.cols + cell.col;

export const inBounds = (maze: Pick<Maze, 'cols' | 'rows'>, cell: Cell): boolean =>
  cell.col >= 0 && cell.col < maze.cols && cell.row >= 0 && cell.row < maze.rows;

export const wallsAt = (maze: Maze, cell: Cell): CellWalls => maze.walls[cellIndex(maze, cell)]!;

/** True when a mover at `cell` can step to `dir` (no wall, and the next cell is inside). */
export function canMove(maze: Maze, cell: Cell, dir: Dir): boolean {
  return inBounds(maze, cell) && !wallsAt(maze, cell)[dir] && inBounds(maze, neighborOf(cell, dir));
}

export const exitsOf = (maze: Maze, cell: Cell): Dir[] =>
  (['up', 'down', 'left', 'right'] as const).filter((dir) => canMove(maze, cell, dir));

/** A crossing has 3 or more exits: where the hero may turn, and where a bump sends the hero back to. */
export const isCrossing = (maze: Maze, cell: Cell): boolean => exitsOf(maze, cell).length >= 3;

export const manhattan = (a: Cell, b: Cell): number => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);

/** Every cell of the maze, row by row. */
export function cellsOf(maze: Pick<Maze, 'cols' | 'rows'>): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < maze.rows; row++) for (let col = 0; col < maze.cols; col++) cells.push({ col, row });
  return cells;
}

/** Walking distance (in cells) from `from` to every cell, indexed like `walls`; Infinity when unreachable. */
export function distancesFrom(maze: Maze, from: Cell): number[] {
  const dist = new Array<number>(maze.cols * maze.rows).fill(Number.POSITIVE_INFINITY);
  dist[cellIndex(maze, from)] = 0;
  const queue: Cell[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head]!;
    const d = dist[cellIndex(maze, cell)]!;
    for (const dir of exitsOf(maze, cell)) {
      const nextCell = neighborOf(cell, dir);
      const i = cellIndex(maze, nextCell);
      if (dist[i]! <= d + 1) continue;
      dist[i] = d + 1;
      queue.push(nextCell);
    }
  }
  return dist;
}

/**
 * The wall edges of the maze, each shared edge once: every cell's `up` and `left` wall, plus
 * `down` on the last row and `right` on the last column. The view places one wall model per edge.
 */
export function wallEdgesOf(maze: Maze): WallEdge[] {
  const edges: WallEdge[] = [];
  for (const cell of cellsOf(maze)) {
    const walls = wallsAt(maze, cell);
    if (walls.up) edges.push({ cell, side: 'up' });
    if (walls.left) edges.push({ cell, side: 'left' });
    if (walls.down && cell.row === maze.rows - 1) edges.push({ cell, side: 'down' });
    if (walls.right && cell.col === maze.cols - 1) edges.push({ cell, side: 'right' });
  }
  return edges;
}

/** The number of independent loops: open edges minus cells plus one (for a connected maze). */
export function loopsOf(maze: Maze): number {
  let openEdges = 0;
  for (const cell of cellsOf(maze)) {
    if (canMove(maze, cell, 'right')) openEdges += 1;
    if (canMove(maze, cell, 'down')) openEdges += 1;
  }
  return openEdges - maze.cols * maze.rows + 1;
}

/** The position of a mover in cell units (the view multiplies by `CELL_M`). */
export function positionOf(mover: Mover): { x: number; y: number } {
  if (!mover.next) return { x: mover.cell.col, y: mover.cell.row };
  return {
    x: mover.cell.col + (mover.next.col - mover.cell.col) * mover.progress,
    y: mover.cell.row + (mover.next.row - mover.cell.row) * mover.progress,
  };
}

// ---------------------------------------------------------------- parsing

/** Parses the ASCII art of a maze; throws on a malformed picture. */
export function parseMaze(id: string, art: string): Maze {
  const lines = art
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  const rows = (lines.length - 1) / 2;
  const cols = (lines[0]!.length - 1) / 2;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1)
    throw new Error(`maze ${id}: the picture must be (2 * cols + 1) by (2 * rows + 1) characters`);
  if (lines.some((line) => line.length !== 2 * cols + 1))
    throw new Error(`maze ${id}: every line must be ${2 * cols + 1} characters`);
  const at = (x: number, y: number): string => lines[y]![x]!;
  const walls: CellWalls[] = [];
  let start: Cell | null = null;
  let gate: { cell: Cell; side: Dir } | null = null;
  const dens: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = 2 * col + 1;
      const y = 2 * row + 1;
      const mark = at(x, y);
      if (mark === 'S') start = { col, row };
      else if (mark === 'D') dens.push({ col, row });
      else if (mark !== ' ') throw new Error(`maze ${id}: cell (${col}, ${row}) holds '${mark}'`);
      const slot = (sx: number, sy: number, side: Dir): boolean => {
        const c = at(sx, sy);
        if (c === 'G') {
          if (gate) throw new Error(`maze ${id}: two gates`);
          gate = { cell: { col, row }, side };
          return false;
        }
        return c === '#';
      };
      walls.push({
        up: slot(x, y - 1, 'up'),
        down: slot(x, y + 1, 'down'),
        left: slot(x - 1, y, 'left'),
        right: slot(x + 1, y, 'right'),
      });
    }
  }
  if (!start) throw new Error(`maze ${id}: no start cell 'S'`);
  if (!gate) throw new Error(`maze ${id}: no gate slot 'G' in the outer wall`);
  const found: { cell: Cell; side: Dir } = gate;
  const border = neighborOf(found.cell, found.side);
  if (inBounds({ cols, rows }, border)) throw new Error(`maze ${id}: the gate must be in the outer wall`);
  if (dens.length === 0) throw new Error(`maze ${id}: no den cell 'D'`);
  return { id, rows, cols, walls, start, dens, gate: found.cell, gateSide: found.side };
}

/** The three authored mazes, in id order. */
export const MAZES: readonly Maze[] = [
  parseMaze('labyrinth-1', LABYRINTH_1),
  parseMaze('labyrinth-2', LABYRINTH_2),
  parseMaze('labyrinth-3', LABYRINTH_3),
];

export function mazeById(id: string): Maze {
  const maze = MAZES.find((m) => m.id === id);
  if (!maze) throw new Error(`no maze '${id}'`);
  return maze;
}

/** A deep copy of a maze (the state carries its own). */
export const cloneMaze = (maze: Maze): Maze => structuredClone(maze);
