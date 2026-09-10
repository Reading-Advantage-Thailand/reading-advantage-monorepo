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

/** Outer and divider wall footprints. Top and bottom center gaps are the gate openings. */
const BORDER_SEGMENTS = Object.freeze([
  rect(0, 0, 420, 24),
  rect(540, 0, 420, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 420, 24),
  rect(540, 516, 420, 24),
]);

/** Horizontal walls dividing each cell block into two stacked cells. */
const DIVIDER_SEGMENTS = Object.freeze([
  rect(24, 246, 336, 24),
  rect(600, 246, 336, 24),
]);

/** Cell fronts facing the escort corridor. Door gaps let escorts enter each cell. */
const CELL_FRONT_SEGMENTS = Object.freeze([
  rect(360, 24, 24, 86),
  rect(360, 190, 24, 160),
  rect(360, 430, 24, 86),
  rect(576, 24, 24, 86),
  rect(576, 190, 24, 160),
  rect(576, 430, 24, 86),
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
[...BORDER_SEGMENTS, ...DIVIDER_SEGMENTS].forEach((segment, index) => {
  solids.push(segment);
  wallDecor.push(wallFeature(`wall-${index}`, "wall", "prop:mausoleum", segment));
});
CELL_FRONT_SEGMENTS.forEach((segment, index) => {
  solids.push(segment);
  wallDecor.push(wallFeature(`cell-bars-${index}`, "cell-bars", "prop:fence", segment));
});

/** The authored 960 by 540 cell block and escort route layout for Dungeon Liberator. */
export const DUNGEON_LIBERATOR_MAP: DungeonLiberatorMap = Object.freeze({
  id: "dungeon-liberator",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 480),
  enemySpawns: Object.freeze([point(480, 300), point(768, 200)]),
  clearings: Object.freeze([
    Object.freeze({ id: "cell-northwest", center: point(192, 130), radius: 46 }),
    Object.freeze({ id: "cell-northeast", center: point(768, 130), radius: 46 }),
    Object.freeze({ id: "cell-southwest", center: point(192, 400), radius: 46 }),
    Object.freeze({ id: "cell-southeast", center: point(768, 400), radius: 46 }),
    Object.freeze({ id: "escort-exit", center: point(480, 70), radius: 40 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "escort-route", width: 40, points: Object.freeze([point(480, 500), point(480, 150), point(480, 70)]) }),
    Object.freeze({ id: "cell-spur-nw", width: 32, points: Object.freeze([point(480, 150), point(192, 150)]) }),
    Object.freeze({ id: "cell-spur-ne", width: 32, points: Object.freeze([point(480, 150), point(768, 150)]) }),
    Object.freeze({ id: "cell-spur-sw", width: 32, points: Object.freeze([point(480, 390), point(192, 390)]) }),
    Object.freeze({ id: "cell-spur-se", width: 32, points: Object.freeze([point(480, 390), point(768, 390)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "dungeon-floor", assetKey: "world:stone-floor", depth: -40 }),
    Object.freeze({ id: "stone-corridors", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("stone-floor-fill", "floor", "world:stone-floor", 480, 270, 960, 540, -22, undefined, undefined, "xy"),
    feature("south-entrance", "entrance", "prop:gate", 480, 520, 72, 44, 11),
    feature("north-exit", "exit", "prop:gate", 480, 36, 72, 44, 11),
    ...wallDecor,
    feature("cell-door-nw", "cell-door", "prop:gate", 372, 150, 28, 28, 9),
    feature("cell-door-sw", "cell-door", "prop:gate", 372, 390, 28, 28, 9),
    feature("cell-door-ne", "cell-door", "prop:gate", 588, 150, 28, 28, 9),
    feature("cell-door-se", "cell-door", "prop:gate", 588, 390, 28, 28, 9),
    feature("crystal-nw", "crystal", "prop:crystal", 192, 130, 20, 20, 13),
    feature("crystal-ne", "crystal", "prop:crystal", 768, 130, 20, 20, 13),
    feature("crystal-sw", "crystal", "prop:crystal", 192, 400, 20, 20, 13),
    feature("crystal-se", "crystal", "prop:crystal", 768, 400, 20, 20, 13),
    feature("lantern-north", "lantern", "prop:lantern", 480, 320, 28, 28, 16),
    feature("lantern-south", "lantern", "prop:lantern", 480, 180, 28, 28, 16),
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
