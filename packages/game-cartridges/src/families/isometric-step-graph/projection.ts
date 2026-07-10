import type { StepGraphCoordinate } from "./step-graph";

/** Isometric projection dimensions supplied by a Phaser scene. */
export interface IsometricProjectionOptions {
  /** Horizontal screen coordinate of the graph origin. */
  originX: number;
  /** Vertical screen coordinate of the graph origin. */
  originY: number;
  /** Full projected tile width. */
  tileWidth: number;
  /** Full projected tile height. */
  tileHeight: number;
  /** Vertical screen offset for one elevation tier. */
  elevationHeight: number;
}

/** Projected position and deterministic display depth. */
export interface IsometricScreenPoint {
  /** Horizontal screen coordinate. */
  x: number;
  /** Vertical screen coordinate. */
  y: number;
  /** Phaser display-list depth derived from screen position and elevation. */
  depth: number;
}

/**
 * Projects an integer grid position into stable isometric screen coordinates.
 * @param coordinate Logical graph coordinate.
 * @param options Projection origin and tile dimensions.
 * @returns Screen coordinates and a stable depth-sorting value.
 */
export function projectIsometricPoint(
  coordinate: StepGraphCoordinate,
  options: IsometricProjectionOptions,
): IsometricScreenPoint {
  const x =
    options.originX +
    ((coordinate.gridX - coordinate.gridY) * options.tileWidth) / 2;
  const y =
    options.originY +
    ((coordinate.gridX + coordinate.gridY) * options.tileHeight) / 2 -
    coordinate.elevation * options.elevationHeight;
  return {
    x,
    y,
    depth: Math.round(y * 1_000 + coordinate.elevation),
  };
}
