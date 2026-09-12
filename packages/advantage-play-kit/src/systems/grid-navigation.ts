import type { GameplayBounds, GameplayVector } from "./gameplay-primitives.js";

/** Deterministic grid navigation configuration. */
export interface GridNavigatorConfig {
  /** World bounds covered by the navigation grid. */
  readonly bounds: GameplayBounds;
  /** Square cell size in world units. */
  readonly cellSize: number;
  /** Required body clearance from solids and world edges. */
  readonly clearance: number;
  /** Static solid rectangles blocked by the grid. */
  readonly obstacles: readonly GameplayBounds[];
}

/** Cached deterministic path service for many actors sharing one target. */
export interface GridNavigator {
  /** Finds a bounded cardinal path between two world points. */
  findPath(start: GameplayVector, target: GameplayVector): readonly GameplayVector[];
  /** Returns the next reachable waypoint toward a target. */
  nextWaypoint(start: GameplayVector, target: GameplayVector): GameplayVector | undefined;
  /** Returns whether a body center has configured clearance. */
  isPassable(point: GameplayVector): boolean;
  /** Number of target fields built for diagnostics and tests. */
  readonly fieldBuildCount: number;
}

interface GridCell {
  readonly column: number;
  readonly row: number;
}

const CARDINAL_OFFSETS: readonly GridCell[] = Object.freeze([
  Object.freeze({ column: 0, row: -1 }),
  Object.freeze({ column: 1, row: 0 }),
  Object.freeze({ column: 0, row: 1 }),
  Object.freeze({ column: -1, row: 0 }),
]);
const MAX_NAVIGATION_CELLS = 262_144;

function finiteBounds(bounds: GameplayBounds): boolean {
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    && bounds.width > 0
    && bounds.height > 0;
}

/**
 * Creates one cached breadth-first navigation field for static rectangle obstacles.
 * @param config Grid size, clearance, bounds, and obstacles.
 * @returns A deterministic navigator that caches the latest target field.
 * @throws When the grid configuration contains invalid values.
 */
export function createGridNavigator(config: GridNavigatorConfig): GridNavigator {
  if (!finiteBounds(config.bounds)
    || !Number.isFinite(config.cellSize)
    || config.cellSize <= 0
    || !Number.isFinite(config.clearance)
    || config.clearance < 0
    || !config.obstacles.every(finiteBounds)) {
    throw new Error("Grid navigator requires valid bounds, cells, clearance, and obstacles");
  }
  const columns = Math.max(1, Math.floor(config.bounds.width / config.cellSize));
  const rows = Math.max(1, Math.floor(config.bounds.height / config.cellSize));
  const cellCount = columns * rows;
  if (!Number.isSafeInteger(cellCount) || cellCount > MAX_NAVIGATION_CELLS) {
    throw new Error(`Grid navigator cannot exceed ${MAX_NAVIGATION_CELLS} cells`);
  }
  const blocked = new Uint8Array(cellCount);
  let cachedTarget = -1;
  let cachedDistances = new Int32Array(cellCount).fill(-1);
  let fieldBuildCount = 0;

  const indexOf = (cell: GridCell): number => cell.row * columns + cell.column;
  const validCell = (cell: GridCell): boolean => cell.column >= 0
    && cell.row >= 0
    && cell.column < columns
    && cell.row < rows;
  const pointFor = (cell: GridCell): GameplayVector => Object.freeze({
    x: config.bounds.x + (cell.column + 0.5) * config.cellSize,
    y: config.bounds.y + (cell.row + 0.5) * config.cellSize,
  });
  const cellFor = (point: GameplayVector): GridCell => Object.freeze({
    column: Math.min(columns - 1, Math.max(0, Math.floor((point.x - config.bounds.x) / config.cellSize))),
    row: Math.min(rows - 1, Math.max(0, Math.floor((point.y - config.bounds.y) / config.cellSize))),
  });
  const passablePoint = (point: GameplayVector): boolean => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
    if (point.x < config.bounds.x + config.clearance
      || point.y < config.bounds.y + config.clearance
      || point.x > config.bounds.x + config.bounds.width - config.clearance
      || point.y > config.bounds.y + config.bounds.height - config.clearance) return false;
    return !config.obstacles.some((solid) => point.x > solid.x - config.clearance
      && point.x < solid.x + solid.width + config.clearance
      && point.y > solid.y - config.clearance
      && point.y < solid.y + solid.height + config.clearance);
  };
  const passableSegment = (start: GameplayVector, end: GameplayVector): boolean => {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / (config.cellSize / 4)));
    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      if (!passablePoint({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      })) return false;
    }
    return true;
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = { column, row };
      if (!passablePoint(pointFor(cell))) blocked[indexOf(cell)] = 1;
    }
  }

  const nearestPassable = (source: GridCell): GridCell | undefined => {
    if (!blocked[indexOf(source)]) return source;
    const queue: GridCell[] = [source];
    const visited = new Uint8Array(cellCount);
    visited[indexOf(source)] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      for (const offset of CARDINAL_OFFSETS) {
        const next = { column: current.column + offset.column, row: current.row + offset.row };
        if (!validCell(next)) continue;
        const index = indexOf(next);
        if (visited[index]) continue;
        if (!blocked[index]) return next;
        visited[index] = 1;
        queue.push(next);
      }
    }
    return undefined;
  };

  const ensureField = (target: GridCell): void => {
    const targetIndex = indexOf(target);
    if (targetIndex === cachedTarget) return;
    cachedTarget = targetIndex;
    cachedDistances = new Int32Array(cellCount).fill(-1);
    cachedDistances[targetIndex] = 0;
    const queue: GridCell[] = [target];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      const distance = cachedDistances[indexOf(current)]!;
      for (const offset of CARDINAL_OFFSETS) {
        const next = { column: current.column + offset.column, row: current.row + offset.row };
        if (!validCell(next)) continue;
        const index = indexOf(next);
        if (blocked[index] || cachedDistances[index] >= 0) continue;
        cachedDistances[index] = distance + 1;
        queue.push(next);
      }
    }
    fieldBuildCount += 1;
  };

  const findPath = (start: GameplayVector, target: GameplayVector): readonly GameplayVector[] => {
    const startCell = nearestPassable(cellFor(start));
    const targetCell = nearestPassable(cellFor(target));
    if (!startCell || !targetCell) return Object.freeze([]);
    ensureField(targetCell);
    if (cachedDistances[indexOf(startCell)] < 0) return Object.freeze([]);
    const cells: GridCell[] = [startCell];
    let current = startCell;
    for (let step = 0; step < cellCount && indexOf(current) !== indexOf(targetCell); step += 1) {
      const distance = cachedDistances[indexOf(current)]!;
      const next = CARDINAL_OFFSETS
        .map((offset) => ({ column: current.column + offset.column, row: current.row + offset.row }))
        .find((candidate) => validCell(candidate)
          && !blocked[indexOf(candidate)]
          && cachedDistances[indexOf(candidate)] === distance - 1);
      if (!next) return Object.freeze([]);
      cells.push(next);
      current = next;
    }
    return Object.freeze(cells.map(pointFor));
  };

  return Object.freeze({
    findPath,
    nextWaypoint(start: GameplayVector, target: GameplayVector): GameplayVector | undefined {
      const rawStart = cellFor(start);
      const startCell = nearestPassable(rawStart);
      const targetCell = nearestPassable(cellFor(target));
      if (!startCell || !targetCell) return undefined;
      ensureField(targetCell);
      const distance = cachedDistances[indexOf(startCell)]!;
      if (distance < 0) return undefined;
      if (!passablePoint(start)) return pointFor(startCell);
      if (distance === 0) return passableSegment(start, target) ? target : pointFor(startCell);
      const next = CARDINAL_OFFSETS
        .map((offset) => ({ column: startCell.column + offset.column, row: startCell.row + offset.row }))
        .find((candidate) => validCell(candidate)
          && !blocked[indexOf(candidate)]
          && cachedDistances[indexOf(candidate)] === distance - 1);
      if (!next) return undefined;
      const nextPoint = pointFor(next);
      return passableSegment(start, nextPoint) ? nextPoint : pointFor(startCell);
    },
    isPassable: passablePoint,
    get fieldBuildCount(): number {
      return fieldBuildCount;
    },
  });
}
