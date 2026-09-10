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

/** A point in the fixed Realm Carver territory. */
export type RealmCarverPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Realm Carver territory. */
export type RealmCarverRect = StandardPlayMapRect;

/** One dirt lane through the bounded territory. */
export type RealmCarverPath = StandardPlayMapPath;

/** One stable word clearing. */
export type RealmCarverClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type RealmCarverTerrainLayer = StandardPlayMapTerrainLayer;

/** One territory prop with a reviewed semantic asset. */
export type RealmCarverFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Realm Carver rules and rendering. */
export type RealmCarverMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): RealmCarverRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): RealmCarverPoint => Object.freeze({ x, y });

const BORDER_SOLIDS = Object.freeze([
  rect(0, 0, 960, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 396, 24),
  rect(564, 516, 396, 24),
]);

const FEATURE_SOLIDS = Object.freeze([
  rect(128, 234, 44, 52),
  rect(788, 234, 44, 52),
  rect(298, 154, 44, 52),
  rect(618, 154, 44, 52),
  rect(298, 274, 44, 52),
  rect(618, 274, 44, 52),
]);

const feature = (
  id: string,
  kind: RealmCarverFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: RealmCarverRect,
  rotation?: number,
  repeat?: RealmCarverFeature["repeat"],
): RealmCarverFeature => Object.freeze({
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

/** The authored 960 by 540 bounded territory layout for Realm Carver. */
export const REALM_CARVER_MAP: RealmCarverMap = Object.freeze({
  id: "realm-carver",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 474),
  enemySpawns: Object.freeze([point(120, 90), point(480, 90), point(840, 90)]),
  clearings: Object.freeze([
    Object.freeze({ id: "clearing-northwest", center: point(240, 140), radius: 48 }),
    Object.freeze({ id: "clearing-northeast", center: point(720, 140), radius: 48 }),
    Object.freeze({ id: "clearing-southwest", center: point(240, 380), radius: 48 }),
    Object.freeze({ id: "clearing-southeast", center: point(720, 380), radius: 48 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "center-lane", width: 38, points: Object.freeze([point(480, 500), point(480, 300), point(480, 90)]) }),
    Object.freeze({ id: "northwest-fork", width: 32, points: Object.freeze([point(480, 300), point(300, 240), point(240, 140)]) }),
    Object.freeze({ id: "northeast-fork", width: 32, points: Object.freeze([point(480, 300), point(660, 240), point(720, 140)]) }),
    Object.freeze({ id: "southwest-fork", width: 32, points: Object.freeze([point(480, 440), point(330, 410), point(240, 380)]) }),
    Object.freeze({ id: "southeast-fork", width: 32, points: Object.freeze([point(480, 440), point(630, 410), point(720, 380)]) }),
    Object.freeze({ id: "west-lane", width: 26, points: Object.freeze([point(480, 300), point(200, 200), point(120, 90)]) }),
    Object.freeze({ id: "east-lane", width: 26, points: Object.freeze([point(480, 300), point(760, 200), point(840, 90)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "territory-grass", assetKey: "world:ground", depth: -40 }),
    Object.freeze({ id: "dirt-lanes", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("south-entrance", "entrance", "prop:gate", 480, 514, 72, 44, 11),
    feature("tree-west", "dead-tree", "prop:dead-tree-large", 150, 260, 72, 96, 14, FEATURE_SOLIDS[0]),
    feature("tree-east", "dead-tree", "prop:dead-tree-large", 810, 260, 72, 96, 14, FEATURE_SOLIDS[1]),
    feature("tree-northwest", "dead-tree", "prop:dead-tree-large", 320, 180, 72, 96, 14, FEATURE_SOLIDS[2]),
    feature("tree-northeast", "dead-tree", "prop:dead-tree-large", 640, 180, 72, 96, 14, FEATURE_SOLIDS[3]),
    feature("tree-southwest", "dead-tree", "prop:dead-tree-large", 320, 300, 72, 96, 14, FEATURE_SOLIDS[4]),
    feature("tree-southeast", "dead-tree", "prop:dead-tree-large", 640, 300, 72, 96, 14, FEATURE_SOLIDS[5]),
    feature("dirt-patch-west", "dirt-patch", "prop:dirt-patch", 180, 180, 192, 192, 6),
    feature("dirt-patch-east", "dirt-patch", "prop:dirt-patch", 780, 180, 192, 192, 6),
    feature("dirt-patch-south", "dirt-patch", "prop:dirt-patch", 480, 380, 192, 192, 6),
    feature("fence-north", "fence", "prop:fence", 480, 12, 912, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 12, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 948, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-southwest", "fence", "prop:fence", 198, 522, 396, 32, 8, undefined, undefined, "x"),
    feature("fence-southeast", "fence", "prop:fence", 762, 522, 396, 32, 8, undefined, undefined, "x"),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...FEATURE_SOLIDS]),
});

validateStandardPlayMap(REALM_CARVER_MAP);

/**
 * Checks whether a circular actor overlaps any Realm Carver territory solid.
 * @param pointValue The actor center.
 * @param radius The actor collision radius.
 * @param solids The solid footprints to check.
 * @returns Whether the actor overlaps a solid.
 */
export function isPointInsideRealmCarverSolid(
  pointValue: RealmCarverPoint,
  radius: number,
  solids: readonly RealmCarverRect[] = REALM_CARVER_MAP.solids,
): boolean {
  return isStandardPlayMapPointInsideSolid(pointValue, radius, solids);
}

/**
 * Checks grid reachability between two Realm Carver territory points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The territory layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function realmCarverReachable(
  start: RealmCarverPoint,
  end: RealmCarverPoint,
  map: RealmCarverMap = REALM_CARVER_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
