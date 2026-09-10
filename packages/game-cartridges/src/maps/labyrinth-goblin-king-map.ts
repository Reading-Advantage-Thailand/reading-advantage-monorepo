import {
  isStandardPlayMapPointReachable,
  type StandardPlayMap,
  type StandardPlayMapClearing,
  type StandardPlayMapFeature,
  type StandardPlayMapPoint,
  type StandardPlayMapRect,
  type StandardPlayMapTerrainLayer,
  validateStandardPlayMap,
} from "./standard-play-map.js";

/** A point in the fixed Labyrinth of the Goblin King simulation. */
export type LabyrinthGoblinKingPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Labyrinth of the Goblin King. */
export type LabyrinthGoblinKingRect = StandardPlayMapRect;

/** One crypt wall or accent in the Labyrinth of the Goblin King. */
export type LabyrinthGoblinKingFeature = StandardPlayMapFeature;

/** One entrance or exit clearing in the Labyrinth of the Goblin King. */
export type LabyrinthGoblinKingClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors in the Labyrinth of the Goblin King. */
export type LabyrinthGoblinKingTerrainLayer = StandardPlayMapTerrainLayer;

/** The complete authored layout consumed by Labyrinth of the Goblin King rules and rendering. */
export type LabyrinthGoblinKingMap = StandardPlayMap;

/** Fixed maze columns, rows, and tile size mirrored from the game grid. */
const GRID = Object.freeze({ columns: 11, rows: 15, tileSize: 32 });
const WORLD_WIDTH = GRID.columns * GRID.tileSize;
const WORLD_HEIGHT = GRID.rows * GRID.tileSize;

/** Opening cell at the maze entrance. */
const ENTRANCE = Object.freeze({ column: 0, row: 1 });
/** Opening cell at the maze exit. */
const EXIT = Object.freeze({ column: GRID.columns - 1, row: GRID.rows - 2 });

const point = (x: number, y: number): LabyrinthGoblinKingPoint => Object.freeze({ x, y });

const rect = (x: number, y: number, width: number, height: number): LabyrinthGoblinKingRect =>
  Object.freeze({ x, y, width, height });

const feature = (
  id: string,
  kind: LabyrinthGoblinKingFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: LabyrinthGoblinKingRect,
  rotation?: number,
  repeat?: LabyrinthGoblinKingFeature["repeat"],
): LabyrinthGoblinKingFeature => Object.freeze({
  id,
  kind,
  assetKey,
  position: point(x, y),
  displayWidth,
  displayHeight,
  depth,
  ...(solid ? { solid } : {}),
  ...(rotation === undefined ? {} : { rotation }),
  ...(repeat === undefined ? {} : { repeat }),
});

/**
 * Reports whether a maze cell is a wall under the game rule.
 * @param column Cell column index.
 * @param row Cell row index.
 * @returns Whether the cell is a wall.
 */
function isWallCell(column: number, row: number): boolean {
  if ((column === ENTRANCE.column && row === ENTRANCE.row)
    || (column === EXIT.column && row === EXIT.row)) return false;
  return row === 0 || row === GRID.rows - 1 || column === 0 || column === GRID.columns - 1
    || (row % 2 === 0 && column % 2 === 0);
}

const wallFeatures: LabyrinthGoblinKingFeature[] = [];
const wallSolids: LabyrinthGoblinKingRect[] = [];
for (let row = 0; row < GRID.rows; row += 1) {
  for (let column = 0; column < GRID.columns; column += 1) {
    if (!isWallCell(column, row)) continue;
    const x = column * GRID.tileSize;
    const y = row * GRID.tileSize;
    const solid = rect(x, y, GRID.tileSize, GRID.tileSize);
    wallSolids.push(solid);
    wallFeatures.push(feature(
      `wall-${column}-${row}`,
      "mausoleum",
      "prop:mausoleum",
      x + GRID.tileSize / 2,
      y + GRID.tileSize / 2,
      GRID.tileSize,
      GRID.tileSize,
      10,
      solid,
    ));
  }
}

const GRAVE_ACCENTS = Object.freeze([
  feature("grave-nw", "grave", "prop:grave-c", 112, 176, 24, 40, 12),
  feature("grave-ne", "grave", "prop:grave-c", 240, 176, 24, 40, 12),
  feature("grave-sw", "grave", "prop:grave-c", 112, 304, 24, 40, 12),
  feature("grave-se", "grave", "prop:grave-c", 240, 304, 24, 40, 12),
]);

const RUIN_ACCENTS = Object.freeze([
  feature("ruin-north", "ruins", "prop:ruins", 176, 112, 48, 48, 13),
  feature("ruin-south", "ruins", "prop:ruins", 176, 368, 48, 48, 13),
]);

/** The authored 352 by 480 crypt-maze layout for Labyrinth of the Goblin King. */
export const LABYRINTH_GOBLIN_KING_MAP: LabyrinthGoblinKingMap = Object.freeze({
  id: "labyrinth-goblin-king",
  world: Object.freeze({ width: WORLD_WIDTH, height: WORLD_HEIGHT }),
  playerSpawn: point(
    ENTRANCE.column * GRID.tileSize + GRID.tileSize / 2,
    ENTRANCE.row * GRID.tileSize + GRID.tileSize / 2,
  ),
  enemySpawns: Object.freeze([point(176, 240)]),
  clearings: Object.freeze([
    Object.freeze({ id: "entrance", center: point(16, 48), radius: 16 }),
    Object.freeze({ id: "exit", center: point(336, 432), radius: 16 }),
  ]),
  paths: Object.freeze([]),
  terrain: Object.freeze([
    Object.freeze({ id: "crypt-floor", assetKey: "wizard-floor", depth: -40 }),
  ]),
  decor: Object.freeze([
    feature("crypt-floor-fill", "crypt-floor", "wizard-floor", WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, -22, undefined, undefined, "xy"),
    feature("entrance-gate", "gate", "prop:gate", 16, 48, 32, 32, 11),
    ...wallFeatures,
    ...GRAVE_ACCENTS,
    ...RUIN_ACCENTS,
  ]),
  solids: Object.freeze([...wallSolids]),
});

validateStandardPlayMap(LABYRINTH_GOBLIN_KING_MAP);

/**
 * Checks grid reachability between two Labyrinth of the Goblin King points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The maze layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function labyrinthGoblinKingReachable(
  start: LabyrinthGoblinKingPoint,
  end: LabyrinthGoblinKingPoint,
  map: LabyrinthGoblinKingMap = LABYRINTH_GOBLIN_KING_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
