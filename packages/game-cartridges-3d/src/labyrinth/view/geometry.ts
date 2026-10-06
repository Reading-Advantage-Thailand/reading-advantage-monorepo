/**
 * Where the maze stands in the world, for both views and the 2D bake. Pure: no three.js, no
 * Phaser. The maze is centered on the origin; one cell is `CELL_M` meters; `col` grows to +X and
 * `row` grows to +Z (toward the camera), so `up` on the map is away from the camera.
 */
import { CELL_M, wallEdgesOf, type Cell, type Dir, type Hero, type LabyrinthCommand, type Maze } from '../core/index.js';

export interface Ground {
  x: number;
  z: number;
}

/** The world point of a position in cell units (`positionOf` of a mover, or a whole cell). */
export function worldOf(maze: Pick<Maze, 'cols' | 'rows'>, pos: { x: number; y: number }): Ground {
  return { x: (pos.x - (maze.cols - 1) / 2) * CELL_M, z: (pos.y - (maze.rows - 1) / 2) * CELL_M };
}

export const worldOfCell = (maze: Pick<Maze, 'cols' | 'rows'>, cell: Cell): Ground => worldOf(maze, { x: cell.col, y: cell.row });

/** Half the maze size in meters (the ground bounds of the 2D bake add a margin to these). */
export const halfSize = (maze: Pick<Maze, 'cols' | 'rows'>): Ground => ({ x: (maze.cols * CELL_M) / 2, z: (maze.rows * CELL_M) / 2 });

export interface Piece extends Ground {
  /** Degrees about +Y. */
  yaw: number;
}

export interface MazePieces {
  floors: Piece[];
  /** One wall model per wall edge: a wall between two cells (or on the border). */
  walls: Piece[];
  /** One pillar at every grid vertex a wall touches, so wall ends never show a gap. */
  pillars: Piece[];
}

/** The yaw of a wall piece on a cell edge: along X for `up` and `down`, along Z for the others. */
export const edgeYaw = (side: Dir): number => (side === 'up' || side === 'down' ? 0 : 90);

/** The yaw that turns a piece's front (+Z) toward the inside of the maze, for a border edge. */
export const inwardYaw = (side: Dir): number => ({ up: 0, down: 180, left: 90, right: -90 })[side];

/** The world point of the middle of a cell edge. */
export function edgePoint(maze: Pick<Maze, 'cols' | 'rows'>, cell: Cell, side: Dir): Ground {
  const c = worldOfCell(maze, cell);
  const h = CELL_M / 2;
  return { up: { x: c.x, z: c.z - h }, down: { x: c.x, z: c.z + h }, left: { x: c.x - h, z: c.z }, right: { x: c.x + h, z: c.z } }[side];
}

/** The floor, wall, and pillar placements of a maze. */
export function piecesOf(maze: Maze): MazePieces {
  const floors: Piece[] = [];
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) floors.push({ ...worldOfCell(maze, { col, row }), yaw: 0 });
  }
  const edges = wallEdgesOf(maze);
  const walls = edges.map((e) => ({ ...edgePoint(maze, e.cell, e.side), yaw: edgeYaw(e.side) }));
  const vertices = new Set<string>();
  const addVertex = (i: number, j: number): void => void vertices.add(`${i},${j}`);
  for (const { cell, side } of edges) {
    if (side === 'up') (addVertex(cell.col, cell.row), addVertex(cell.col + 1, cell.row));
    else if (side === 'down') (addVertex(cell.col, cell.row + 1), addVertex(cell.col + 1, cell.row + 1));
    else if (side === 'left') (addVertex(cell.col, cell.row), addVertex(cell.col, cell.row + 1));
    else (addVertex(cell.col + 1, cell.row), addVertex(cell.col + 1, cell.row + 1));
  }
  // The gate edge is open in the walls, but its arch needs the two posts too.
  const g = maze.gate;
  const gate: [number, number][] = {
    up: [[g.col, g.row], [g.col + 1, g.row]],
    down: [[g.col, g.row + 1], [g.col + 1, g.row + 1]],
    left: [[g.col, g.row], [g.col, g.row + 1]],
    right: [[g.col + 1, g.row], [g.col + 1, g.row + 1]],
  }[maze.gateSide] as [number, number][];
  for (const [i, j] of gate) addVertex(i, j);
  const pillars = [...vertices].map((key) => {
    const [i, j] = key.split(',').map(Number) as [number, number];
    return { x: (i - maze.cols / 2) * CELL_M, z: (j - maze.rows / 2) * CELL_M, yaw: 0 };
  });
  return { floors, walls, pillars };
}

/**
 * The turn a stick or key pad asks for, or null inside the dead zone. The stick is in screen
 * terms (x right, y down); the stronger axis wins, and the vertical axis wins a tie.
 */
export function dirOfStick(x: number, y: number, deadZone = 0.35): Dir | null {
  if (Math.hypot(x, y) < deadZone) return null;
  if (Math.abs(y) >= Math.abs(x)) return y < 0 ? 'up' : 'down';
  return x < 0 ? 'left' : 'right';
}

/**
 * The turn command a held stick still owes the core: the stick points one way, the hero neither
 * walks nor has queued that way (a bump clears the queue, for example). Null when nothing is owed.
 */
export function heldTurn(held: Dir | null, hero: Pick<Hero, 'dir' | 'queued'>): LabyrinthCommand | null {
  if (!held || hero.queued === held || hero.dir === held) return null;
  return { type: 'turn', dir: held };
}

export interface CameraFit {
  /** Camera offset from the target, in meters. */
  offset: [number, number, number];
  /** The ground point the camera looks at (z is shifted so the maze sits below the top HUD). */
  target: Ground;
}

/**
 * A fixed camera that shows the whole maze (the student must see every corridor to plan a way).
 * `aspect` is width over height of the view, `fov` the vertical field of view in degrees,
 * `elevation` the angle of the view above the ground in degrees, and `topShare` the share of
 * the screen height the top HUD covers.
 */
export function fitCamera(maze: Pick<Maze, 'cols' | 'rows'>, aspect: number, fov: number, elevation: number, topShare = 0.16, wallHeight = 1.2): CameraFit {
  const half = halfSize(maze);
  const wx = half.x + 0.8;
  const wz = half.z + 0.8;
  const el = (elevation * Math.PI) / 180;
  const tanV = Math.tan((fov * Math.PI) / 360);
  const tanH = tanV * aspect;
  const free = 1 - topShare;
  // The far edge of the walls and the near edge of the floor, seen at the camera's tilt.
  const needV = (wz * Math.sin(el) + wallHeight * Math.cos(el)) / (tanV * free) + wz * Math.cos(el);
  const needH = wx / tanH + wz * Math.cos(el); // the near edge is closer, so it looks wider
  const d = Math.max(needV, needH, 8);
  const shift = (topShare / 2) * 2 * d * tanV / Math.sin(el);
  return { offset: [0, d * Math.sin(el), d * Math.cos(el)], target: { x: 0, z: -shift } };
}
