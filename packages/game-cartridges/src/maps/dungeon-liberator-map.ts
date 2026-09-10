import {
  isStandardPlayMapPointReachable,
  validateStandardPlayMap,
  type StandardPlayMap,
  type StandardPlayMapClearing,
  type StandardPlayMapFeature,
  type StandardPlayMapPath,
  type StandardPlayMapPoint,
  type StandardPlayMapRect,
  type StandardPlayMapTerrainLayer,
} from "./standard-play-map.js";

/** A point in the fixed Dungeon Liberator cell block. */
export type DungeonLiberatorPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Dungeon Liberator cell block. */
export type DungeonLiberatorRect = StandardPlayMapRect;

/** One escort corridor through the cell block. */
export type DungeonLiberatorPath = StandardPlayMapPath;

/** One stable liberation clearing in the cell block. */
export type DungeonLiberatorClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type DungeonLiberatorTerrainLayer = StandardPlayMapTerrainLayer;

/** One cell block prop with a reviewed semantic asset. */
export type DungeonLiberatorFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Dungeon Liberator rules and rendering. */
export type DungeonLiberatorMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): DungeonLiberatorRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): DungeonLiberatorPoint => Object.freeze({ x, y });

const feature = (
  id: string,
  kind: DungeonLiberatorFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: DungeonLiberatorRect,
  rotation?: number,
  repeat?: DungeonLiberatorFeature["repeat"],
): DungeonLiberatorFeature => Object.freeze({
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

/** Outer wall footprints with offset entrance and exit openings. */
const BORDER_SEGMENTS = Object.freeze([
  rect(0, 0, 760, 24),
  rect(856, 0, 104, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 64, 24),
  rect(184, 516, 776, 24),
]);

/** Wall segments enclosing the four offset cell blocks. */
const CELL_WALL_SEGMENTS = Object.freeze([
  rect(48, 72, 208, 24),
  rect(48, 192, 208, 24),
  rect(48, 72, 24, 144),
  rect(48, 320, 208, 24),
  rect(48, 440, 208, 24),
  rect(48, 320, 24, 144),
  rect(560, 56, 176, 24),
  rect(560, 152, 176, 24),
  rect(736, 56, 24, 120),
  rect(520, 320, 216, 24),
  rect(520, 440, 216, 24),
  rect(736, 320, 24, 144),
]);

/** Barred cell fronts with door gaps at their centers. */
const CELL_BAR_SEGMENTS = Object.freeze([
  rect(256, 72, 24, 48),
  rect(256, 168, 24, 48),
  rect(256, 320, 24, 48),
  rect(256, 416, 24, 48),
  rect(560, 56, 24, 48),
  rect(560, 136, 24, 40),
  rect(520, 320, 24, 48),
  rect(520, 416, 24, 48),
]);

/** Builds one tiled wall feature from an axis-aligned segment. */
const wallFeature = (
  id: string,
  kind: DungeonLiberatorFeature["kind"],
  assetKey: string,
  segment: DungeonLiberatorRect,
): DungeonLiberatorFeature => {
  const horizontal = segment.width >= segment.height;
  return feature(
    id,
    kind,
    assetKey,
    segment.x + segment.width / 2,
    segment.y + segment.height / 2,
    horizontal ? segment.width : segment.height,
    horizontal ? segment.height : segment.width,
    10,
    segment,
    horizontal ? undefined : 90,
    "x",
  );
};

const solids: DungeonLiberatorRect[] = [];
const wallDecor: DungeonLiberatorFeature[] = [];
[...BORDER_SEGMENTS, ...CELL_WALL_SEGMENTS].forEach((segment, index) => {
  solids.push(segment);
  wallDecor.push(wallFeature(`wall-${index}`, "wall", "prop:mausoleum", segment));
});
CELL_BAR_SEGMENTS.forEach((segment, index) => {
  solids.push(segment);
  wallDecor.push(wallFeature(`cell-bars-${index}`, "cell-bars", "prop:cell-bars", segment));
});

/** The authored 960 by 540 cell block and escort route layout for Dungeon Liberator. */
export const DUNGEON_LIBERATOR_MAP: DungeonLiberatorMap = Object.freeze({
  id: "dungeon-liberator",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(120, 480),
  enemySpawns: Object.freeze([point(420, 240), point(680, 392)]),
  clearings: Object.freeze([
    Object.freeze({ id: "cell-west-north", center: point(160, 144), radius: 40 }),
    Object.freeze({ id: "cell-west-south", center: point(160, 392), radius: 40 }),
    Object.freeze({ id: "cell-east-north", center: point(660, 116), radius: 40 }),
    Object.freeze({ id: "cell-east-south", center: point(640, 392), radius: 40 }),
    Object.freeze({ id: "escort-exit", center: point(808, 64), radius: 36 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "escort-route", width: 40, points: Object.freeze([point(120, 500), point(300, 500), point(300, 280), point(400, 300), point(400, 116)]) }),
    Object.freeze({ id: "cell-west-north", width: 32, points: Object.freeze([point(400, 116), point(268, 144), point(160, 144)]) }),
    Object.freeze({ id: "cell-west-south", width: 32, points: Object.freeze([point(300, 280), point(300, 392), point(268, 392), point(160, 392)]) }),
    Object.freeze({ id: "cell-east-north", width: 32, points: Object.freeze([point(400, 116), point(548, 116), point(660, 116)]) }),
    Object.freeze({ id: "cell-east-south", width: 32, points: Object.freeze([point(400, 300), point(508, 392), point(640, 392)]) }),
    Object.freeze({ id: "exit-route", width: 30, points: Object.freeze([point(400, 116), point(480, 40), point(808, 40), point(808, 64)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "dungeon-floor", assetKey: "dungeon:stone-alt", depth: -40 }),
    Object.freeze({ id: "stone-corridors", assetKey: "path:stone", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("south-entrance", "entrance", "prop:gate", 120, 520, 72, 44, 11),
    feature("north-exit", "exit", "prop:gate", 808, 36, 72, 44, 11),
    ...wallDecor,
    feature("cell-door-west-north", "cell-door", "prop:gate", 268, 144, 28, 28, 9),
    feature("cell-door-west-south", "cell-door", "prop:gate", 268, 392, 28, 28, 9),
    feature("cell-door-east-north", "cell-door", "prop:gate", 548, 116, 28, 28, 9),
    feature("cell-door-east-south", "cell-door", "prop:gate", 508, 392, 28, 28, 9),
    feature("crystal-west-north", "crystal", "prop:crystal", 160, 144, 20, 20, 13),
    feature("crystal-west-south", "crystal", "prop:crystal", 160, 392, 20, 20, 13),
    feature("crystal-east-north", "crystal", "prop:crystal", 660, 116, 20, 20, 13),
    feature("crystal-east-south", "crystal", "prop:crystal", 640, 392, 20, 20, 13),
    feature("lantern-corridor", "lantern", "prop:lantern", 400, 240, 28, 28, 16),
    feature("lantern-entry", "lantern", "prop:lantern", 240, 280, 28, 28, 16),
  ]),
  solids: Object.freeze([...solids]),
});

validateStandardPlayMap(DUNGEON_LIBERATOR_MAP);

/**
 * Checks grid reachability between two Dungeon Liberator cell block points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The cell block layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function dungeonLiberatorReachable(
  start: DungeonLiberatorPoint,
  end: DungeonLiberatorPoint,
  map: DungeonLiberatorMap = DUNGEON_LIBERATOR_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
