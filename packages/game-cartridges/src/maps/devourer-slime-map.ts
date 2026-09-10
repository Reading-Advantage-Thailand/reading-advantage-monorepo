import {
  isStandardPlayMapPointInsideSolid,
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

/** A point in the fixed Devourer Slime feeding bog. */
export type DevourerSlimePoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Devourer Slime bog. */
export type DevourerSlimeRect = StandardPlayMapRect;

/** One dirt corridor through the feeding bog. */
export type DevourerSlimePath = StandardPlayMapPath;

/** One stable word-orb clearing. */
export type DevourerSlimeClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type DevourerSlimeTerrainLayer = StandardPlayMapTerrainLayer;

/** One bog prop with a reviewed semantic asset. */
export type DevourerSlimeFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Devourer Slime rules and rendering. */
export type DevourerSlimeMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): DevourerSlimeRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): DevourerSlimePoint => Object.freeze({ x, y });

const BORDER_SOLIDS = Object.freeze([
  rect(0, 0, 960, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 396, 24),
  rect(564, 516, 396, 24),
]);

const TREE_SOLIDS = Object.freeze([
  rect(82, 466, 36, 28),
  rect(842, 466, 36, 28),
  rect(602, 66, 36, 28),
  rect(322, 66, 36, 28),
  rect(102, 186, 36, 28),
  rect(822, 186, 36, 28),
  rect(82, 326, 36, 28),
  rect(842, 326, 36, 28),
]);

const SPIRAL_POINTS = Object.freeze([
  point(480, 500),
  point(480, 440),
  point(760, 440),
  point(760, 140),
  point(200, 140),
  point(200, 380),
  point(640, 380),
  point(640, 220),
  point(320, 220),
  point(320, 320),
  point(520, 320),
  point(520, 280),
]);

const DIRT_PATCH_CENTERS = Object.freeze([
  point(120, 144),
  point(312, 144),
  point(504, 144),
  point(696, 144),
  point(888, 144),
  point(216, 312),
  point(408, 312),
  point(600, 312),
  point(792, 312),
  point(168, 456),
  point(360, 456),
  point(552, 456),
  point(744, 456),
  point(912, 456),
]);

const feature = (
  id: string,
  kind: DevourerSlimeFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: DevourerSlimeRect,
  rotation?: number,
  repeat?: DevourerSlimeFeature["repeat"],
): DevourerSlimeFeature => Object.freeze({
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

const dirtPatch = (index: number, x: number, y: number): DevourerSlimeFeature =>
  feature(`mud-${index}`, "dirt-patch", "prop:dirt-patch", x, y, 192, 192, -10);

const coilStamp = (
  id: string,
  start: DevourerSlimePoint,
  end: DevourerSlimePoint,
): DevourerSlimeFeature => {
  const horizontal = start.y === end.y;
  const length = Math.abs(horizontal ? end.x - start.x : end.y - start.y);
  return feature(
    id,
    "path",
    "world:path",
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    horizontal ? length + 44 : 44,
    horizontal ? 44 : length + 44,
    -5,
    undefined,
    undefined,
    horizontal ? "x" : "y",
  );
};

const COIL_STAMPS = Object.freeze(
  SPIRAL_POINTS.slice(1).map((end, index) =>
    coilStamp(`coil-${index}`, SPIRAL_POINTS[index]!, end),
  ),
);

/** The authored 960 by 540 murky spiral feeding bog layout for Devourer Slime. */
export const DEVOURER_SLIME_MAP: DevourerSlimeMap = Object.freeze({
  id: "devourer-slime",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 474),
  enemySpawns: Object.freeze([point(120, 84), point(840, 84)]),
  clearings: Object.freeze([
    Object.freeze({ id: "orb-north", center: point(480, 80), radius: 52 }),
    Object.freeze({ id: "orb-west", center: point(120, 260), radius: 52 }),
    Object.freeze({ id: "orb-east", center: point(860, 260), radius: 52 }),
    Object.freeze({ id: "orb-core", center: point(480, 280), radius: 52 }),
    Object.freeze({ id: "orb-inner-south", center: point(480, 410), radius: 52 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "spiral-coil", width: 44, points: SPIRAL_POINTS }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "bog-grass", assetKey: "world:ground", depth: -40 }),
    Object.freeze({ id: "bog-dirt", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    ...DIRT_PATCH_CENTERS.map((center, index) => dirtPatch(index, center.x, center.y)),
    ...COIL_STAMPS,
    feature("south-entrance", "gate", "prop:gate", 480, 514, 72, 44, 11),
    feature("tree-southwest", "dead-tree", "prop:dead-tree-large", 100, 480, 72, 96, 14, TREE_SOLIDS[0]),
    feature("tree-southeast", "dead-tree", "prop:dead-tree-large", 860, 480, 72, 96, 14, TREE_SOLIDS[1]),
    feature("tree-northeast", "dead-tree", "prop:dead-tree-large", 620, 80, 72, 96, 14, TREE_SOLIDS[2]),
    feature("tree-northwest", "dead-tree", "prop:dead-tree-large", 340, 80, 72, 96, 14, TREE_SOLIDS[3]),
    feature("tree-west-north", "dead-tree", "prop:dead-tree-large", 120, 200, 72, 96, 14, TREE_SOLIDS[4]),
    feature("tree-east-north", "dead-tree", "prop:dead-tree-large", 840, 200, 72, 96, 14, TREE_SOLIDS[5]),
    feature("tree-west-south", "dead-tree", "prop:dead-tree-large", 100, 340, 72, 96, 14, TREE_SOLIDS[6]),
    feature("tree-east-south", "dead-tree", "prop:dead-tree-large", 860, 340, 72, 96, 14, TREE_SOLIDS[7]),
    feature("fence-north", "fence", "prop:fence", 480, 12, 912, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 12, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 948, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-southwest", "fence", "prop:fence", 198, 522, 396, 32, 8, undefined, undefined, "x"),
    feature("fence-southeast", "fence", "prop:fence", 762, 522, 396, 32, 8, undefined, undefined, "x"),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...TREE_SOLIDS]),
});

validateStandardPlayMap(DEVOURER_SLIME_MAP);

/**
 * Checks whether a circular actor overlaps any Devourer Slime bog solid.
 * @param pointValue The actor center.
 * @param radius The actor collision radius.
 * @param solids The solid footprints to check.
 * @returns Whether the actor overlaps a solid.
 */
export function isPointInsideDevourerSlimeSolid(
  pointValue: DevourerSlimePoint,
  radius: number,
  solids: readonly DevourerSlimeRect[] = DEVOURER_SLIME_MAP.solids,
): boolean {
  return isStandardPlayMapPointInsideSolid(pointValue, radius, solids);
}

/**
 * Checks grid reachability between two Devourer Slime bog points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The bog layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function devourerSlimeReachable(
  start: DevourerSlimePoint,
  end: DevourerSlimePoint,
  map: DevourerSlimeMap = DEVOURER_SLIME_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
