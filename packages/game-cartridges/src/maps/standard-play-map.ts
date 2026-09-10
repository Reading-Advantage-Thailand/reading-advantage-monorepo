/**
 * Shared typed contract for authored top-down Advantage play maps.
 *
 * A play map is data, not pixels. The same object drives rendering, collision,
 * spawn placement, and reachability tests for every top-down cartridge.
 */

/** A point in a fixed play-map simulation. */
export interface StandardPlayMapPoint {
  /** Horizontal world coordinate. */
  readonly x: number;
  /** Vertical world coordinate. */
  readonly y: number;
}

/** An axis-aligned solid footprint in a play map. */
export interface StandardPlayMapRect extends StandardPlayMapPoint {
  /** Footprint width in world pixels. */
  readonly width: number;
  /** Footprint height in world pixels. */
  readonly height: number;
}

/** One straight or broken walkable path. */
export interface StandardPlayMapPath {
  /** Stable path identifier. */
  readonly id: string;
  /** Ordered centerline points. */
  readonly points: readonly StandardPlayMapPoint[];
  /** Path width in world pixels. */
  readonly width: number;
}

/** One stable interaction clearing, such as an answer spot. */
export interface StandardPlayMapClearing {
  /** Stable clearing identifier. */
  readonly id: string;
  /** Clearing center. */
  readonly center: StandardPlayMapPoint;
  /** Clearing radius in world pixels. */
  readonly radius: number;
}

/** One terrain layer rendered below actors. */
export interface StandardPlayMapTerrainLayer {
  /** Stable layer identifier. */
  readonly id: string;
  /** Semantic asset key resolved through the runtime edition. */
  readonly assetKey: string;
  /** Render depth; lower values draw first. */
  readonly depth: number;
}

/** One authored map prop with a semantic asset. */
export interface StandardPlayMapFeature {
  /** Stable feature identifier. */
  readonly id: string;
  /** Authoring category used by tests and renderers. */
  readonly kind: string;
  /** Semantic asset key resolved through the runtime edition. */
  readonly assetKey: string;
  /** Feature origin in world pixels. */
  readonly position: StandardPlayMapPoint;
  /** Rendered width in world pixels. */
  readonly displayWidth: number;
  /** Rendered height in world pixels. */
  readonly displayHeight: number;
  /** Render depth; lower values draw first. */
  readonly depth: number;
  /** Repeat axis for tiled features such as fences. */
  readonly repeat?: "x" | "y";
  /** Rotation in degrees. */
  readonly rotation?: number;
  /** Optional solid footprint owned by this feature. */
  readonly solid?: StandardPlayMapRect;
}

/** The complete authored layout consumed by rules, rendering, and tests. */
export interface StandardPlayMap {
  /** Stable map identifier. */
  readonly id: string;
  /** World size in world pixels. */
  readonly world: Readonly<{ width: number; height: number }>;
  /** Player start point. */
  readonly playerSpawn: StandardPlayMapPoint;
  /** Enemy or hazard spawn points. */
  readonly enemySpawns: readonly StandardPlayMapPoint[];
  /** Interaction clearings, such as answer spots. */
  readonly clearings: readonly StandardPlayMapClearing[];
  /** Walkable path centerlines. */
  readonly paths: readonly StandardPlayMapPath[];
  /** Terrain layers rendered below actors. */
  readonly terrain: readonly StandardPlayMapTerrainLayer[];
  /** Authored props and landmarks. */
  readonly decor: readonly StandardPlayMapFeature[];
  /** Collision footprints. */
  readonly solids: readonly StandardPlayMapRect[];
}

/** Reachability tuning for grid search across a play map. */
export interface StandardPlayMapReachabilityOptions {
  /** Grid step in world pixels. Defaults to 12. */
  readonly step?: number;
  /** Actor collision radius. Defaults to 12. */
  readonly radius?: number;
}

/** Error thrown when a play map fails structural validation. */
export class StandardPlayMapValidationError extends Error {
  /** Dotted path of the failing field. */
  readonly field: string;

  /**
   * Creates a validation error for one field.
   * @param field Dotted path of the failing field.
   * @param message Human-readable reason.
   */
  constructor(field: string, message: string) {
    super(`Invalid standard play map field "${field}": ${message}`);
    this.name = "StandardPlayMapValidationError";
    this.field = field;
  }
}

/**
 * Checks that a number is finite.
 * @param value Candidate number.
 * @returns Whether the value is finite.
 */
function isFiniteNumber(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Checks that a point is finite.
 * @param point Candidate point.
 * @returns Whether both coordinates are finite.
 */
function isFinitePoint(point: StandardPlayMapPoint): boolean {
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

/**
 * Validates one play map and throws on the first structural fault.
 * @param map Candidate play map.
 * @throws When a field is missing, non-finite, or out of range.
 */
export function validateStandardPlayMap(map: StandardPlayMap): void {
  if (typeof map.id !== "string" || map.id.length === 0) {
    throw new StandardPlayMapValidationError("id", "must be a nonempty string");
  }
  if (!isFiniteNumber(map.world?.width) || map.world.width <= 0
    || !isFiniteNumber(map.world?.height) || map.world.height <= 0) {
    throw new StandardPlayMapValidationError("world", "width and height must be positive finite numbers");
  }
  const inside = (point: StandardPlayMapPoint): boolean =>
    isFinitePoint(point) && point.x >= 0 && point.y >= 0
    && point.x <= map.world.width && point.y <= map.world.height;
  if (!inside(map.playerSpawn)) {
    throw new StandardPlayMapValidationError("playerSpawn", "must be a finite point inside the world");
  }
  map.enemySpawns.forEach((spawn, index) => {
    if (!inside(spawn)) {
      throw new StandardPlayMapValidationError(`enemySpawns[${index}]`, "must be a finite point inside the world");
    }
  });
  map.clearings.forEach((clearing, index) => {
    if (typeof clearing.id !== "string" || clearing.id.length === 0) {
      throw new StandardPlayMapValidationError(`clearings[${index}].id`, "must be a nonempty string");
    }
    if (!inside(clearing.center)) {
      throw new StandardPlayMapValidationError(`clearings[${index}].center`, "must be a finite point inside the world");
    }
    if (!isFiniteNumber(clearing.radius) || clearing.radius <= 0) {
      throw new StandardPlayMapValidationError(`clearings[${index}].radius`, "must be a positive finite number");
    }
  });
  map.paths.forEach((path, index) => {
    if (!Array.isArray(path.points) || path.points.length < 2 || !path.points.every(isFinitePoint)) {
      throw new StandardPlayMapValidationError(`paths[${index}].points`, "must contain at least two finite points");
    }
    if (!isFiniteNumber(path.width) || path.width <= 0) {
      throw new StandardPlayMapValidationError(`paths[${index}].width`, "must be a positive finite number");
    }
  });
  map.terrain.forEach((layer, index) => {
    if (typeof layer.assetKey !== "string" || layer.assetKey.length === 0) {
      throw new StandardPlayMapValidationError(`terrain[${index}].assetKey`, "must be a nonempty string");
    }
    if (!isFiniteNumber(layer.depth)) {
      throw new StandardPlayMapValidationError(`terrain[${index}].depth`, "must be a finite number");
    }
  });
  map.decor.forEach((feature, index) => {
    if (typeof feature.assetKey !== "string" || feature.assetKey.length === 0) {
      throw new StandardPlayMapValidationError(`decor[${index}].assetKey`, "must be a nonempty string");
    }
    if (!isFinitePoint(feature.position)) {
      throw new StandardPlayMapValidationError(`decor[${index}].position`, "must be a finite point");
    }
    if (!isFiniteNumber(feature.displayWidth) || feature.displayWidth <= 0
      || !isFiniteNumber(feature.displayHeight) || feature.displayHeight <= 0) {
      throw new StandardPlayMapValidationError(`decor[${index}]`, "displayWidth and displayHeight must be positive finite numbers");
    }
    if (!isFiniteNumber(feature.depth)) {
      throw new StandardPlayMapValidationError(`decor[${index}].depth`, "must be a finite number");
    }
  });
  map.solids.forEach((solid, index) => {
    if (!isFiniteNumber(solid.x) || !isFiniteNumber(solid.y)
      || !isFiniteNumber(solid.width) || solid.width <= 0
      || !isFiniteNumber(solid.height) || solid.height <= 0) {
      throw new StandardPlayMapValidationError(`solids[${index}]`, "must be a finite rectangle with positive size");
    }
  });
}

/**
 * Checks whether a circular actor overlaps any solid footprint.
 * @param point Actor center.
 * @param radius Actor collision radius.
 * @param solids Solid footprints to test.
 * @returns Whether the actor overlaps a solid.
 */
export function isStandardPlayMapPointInsideSolid(
  point: StandardPlayMapPoint,
  radius: number,
  solids: readonly StandardPlayMapRect[],
): boolean {
  return solids.some((solid) => point.x + radius > solid.x
    && point.x - radius < solid.x + solid.width
    && point.y + radius > solid.y
    && point.y - radius < solid.y + solid.height);
}

/**
 * Checks grid reachability between two play-map points.
 * @param start Starting point.
 * @param end Destination point.
 * @param map Play map to traverse.
 * @param options Optional grid step and actor radius.
 * @returns Whether a collision-free route exists.
 */
export function isStandardPlayMapPointReachable(
  start: StandardPlayMapPoint,
  end: StandardPlayMapPoint,
  map: StandardPlayMap,
  options: StandardPlayMapReachabilityOptions = {},
): boolean {
  const step = options.step ?? 12;
  const radius = options.radius ?? 12;
  const key = (x: number, y: number): string => `${x}:${y}`;
  const snap = (value: StandardPlayMapPoint): readonly [number, number] => [
    Math.round(value.x / step),
    Math.round(value.y / step),
  ];
  const [startX, startY] = snap(start);
  const [endX, endY] = snap(end);
  const queue: Array<readonly [number, number]> = [[startX, startY]];
  const visited = new Set([key(startX, startY)]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor]!;
    if (x === endX && y === endY) return true;
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      const worldPoint: StandardPlayMapPoint = { x: nextX * step, y: nextY * step };
      if (worldPoint.x < radius || worldPoint.x > map.world.width - radius
        || worldPoint.y < radius || worldPoint.y > map.world.height - radius
        || isStandardPlayMapPointInsideSolid(worldPoint, radius, map.solids)) continue;
      const nextKey = key(nextX, nextY);
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      queue.push([nextX, nextY]);
    }
  }
  return false;
}
