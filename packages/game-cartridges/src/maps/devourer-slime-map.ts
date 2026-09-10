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

/** A point in the fixed Devourer Slime feeding field. */
export type DevourerSlimePoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Devourer Slime field. */
export type DevourerSlimeRect = StandardPlayMapRect;

/** One dirt corridor through the feeding field. */
export type DevourerSlimePath = StandardPlayMapPath;

/** One stable word-orb clearing. */
export type DevourerSlimeClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type DevourerSlimeTerrainLayer = StandardPlayMapTerrainLayer;

/** One field prop with a reviewed semantic asset. */
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

const FEATURE_SOLIDS = Object.freeze([
  rect(68, 224, 44, 52),
  rect(848, 224, 44, 52),
  rect(68, 444, 44, 52),
  rect(848, 444, 44, 52),
  rect(378, 274, 44, 52),
  rect(538, 274, 44, 52),
  rect(144, 240, 32, 72),
  rect(144, 360, 32, 60),
  rect(784, 240, 32, 72),
  rect(784, 360, 32, 60),
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

/** The authored 960 by 540 open feeding field layout for Devourer Slime. */
export const DEVOURER_SLIME_MAP: DevourerSlimeMap = Object.freeze({
  id: "devourer-slime",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 474),
  enemySpawns: Object.freeze([point(120, 84), point(840, 84)]),
  clearings: Object.freeze([
    Object.freeze({ id: "orb-north", center: point(480, 130), radius: 52 }),
    Object.freeze({ id: "orb-northwest", center: point(210, 150), radius: 52 }),
    Object.freeze({ id: "orb-northeast", center: point(750, 150), radius: 52 }),
    Object.freeze({ id: "orb-southwest", center: point(250, 400), radius: 52 }),
    Object.freeze({ id: "orb-southeast", center: point(710, 400), radius: 52 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "spine", width: 38, points: Object.freeze([point(480, 500), point(480, 260), point(480, 130)]) }),
    Object.freeze({ id: "northwest-fork", width: 32, points: Object.freeze([point(480, 200), point(340, 180), point(210, 150)]) }),
    Object.freeze({ id: "northeast-fork", width: 32, points: Object.freeze([point(480, 200), point(620, 180), point(750, 150)]) }),
    Object.freeze({ id: "southwest-fork", width: 32, points: Object.freeze([point(480, 440), point(360, 430), point(250, 400)]) }),
    Object.freeze({ id: "southeast-fork", width: 32, points: Object.freeze([point(480, 440), point(600, 430), point(710, 400)]) }),
    Object.freeze({ id: "west-enemy", width: 26, points: Object.freeze([point(340, 180), point(220, 120), point(120, 84)]) }),
    Object.freeze({ id: "east-enemy", width: 26, points: Object.freeze([point(620, 180), point(740, 120), point(840, 84)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "feeding-grass", assetKey: "world:ground", depth: -40 }),
    Object.freeze({ id: "dirt-corridors", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("south-entrance", "entrance", "prop:gate", 480, 514, 72, 44, 11),
    feature("tree-nw", "dead-tree", "prop:dead-tree-large", 90, 250, 72, 96, 14, FEATURE_SOLIDS[0]),
    feature("tree-ne", "dead-tree", "prop:dead-tree-large", 870, 250, 72, 96, 14, FEATURE_SOLIDS[1]),
    feature("tree-sw", "dead-tree", "prop:dead-tree-large", 90, 470, 72, 96, 14, FEATURE_SOLIDS[2]),
    feature("tree-se", "dead-tree", "prop:dead-tree-large", 870, 470, 72, 96, 14, FEATURE_SOLIDS[3]),
    feature("tree-center-west", "dead-tree", "prop:dead-tree-large", 400, 300, 72, 96, 14, FEATURE_SOLIDS[4]),
    feature("tree-center-east", "dead-tree", "prop:dead-tree-large", 560, 300, 72, 96, 14, FEATURE_SOLIDS[5]),
    feature("size-gate-west-north", "gate", "prop:fence", 160, 276, 72, 32, 8, FEATURE_SOLIDS[6], 90, "x"),
    feature("size-gate-west-south", "gate", "prop:fence", 160, 390, 60, 32, 8, FEATURE_SOLIDS[7], 90, "x"),
    feature("size-gate-east-north", "gate", "prop:fence", 800, 276, 72, 32, 8, FEATURE_SOLIDS[8], 90, "x"),
    feature("size-gate-east-south", "gate", "prop:fence", 800, 390, 60, 32, 8, FEATURE_SOLIDS[9], 90, "x"),
    feature("fence-north", "fence", "prop:fence", 480, 12, 912, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 12, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 948, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-southwest", "fence", "prop:fence", 198, 522, 396, 32, 8, undefined, undefined, "x"),
    feature("fence-southeast", "fence", "prop:fence", 762, 522, 396, 32, 8, undefined, undefined, "x"),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...FEATURE_SOLIDS]),
});

validateStandardPlayMap(DEVOURER_SLIME_MAP);

/**
 * Checks whether a circular actor overlaps any Devourer Slime field solid.
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
 * Checks grid reachability between two Devourer Slime field points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The field layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function devourerSlimeReachable(
  start: DevourerSlimePoint,
  end: DevourerSlimePoint,
  map: DevourerSlimeMap = DEVOURER_SLIME_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
