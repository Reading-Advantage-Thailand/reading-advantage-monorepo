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

/** A point in the fixed Realm Carver sandstone realm. */
export type RealmCarverPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Realm Carver sandstone realm. */
export type RealmCarverRect = StandardPlayMapRect;

/** One carved stone lane through the sandstone realm. */
export type RealmCarverPath = StandardPlayMapPath;

/** One stable word clearing. */
export type RealmCarverClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type RealmCarverTerrainLayer = StandardPlayMapTerrainLayer;

/** One realm prop with a reviewed semantic asset. */
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

const RUIN_SOLIDS = Object.freeze([
  rect(178, 148, 44, 44),
  rect(738, 148, 44, 44),
  rect(178, 348, 44, 44),
  rect(738, 348, 44, 44),
]);

const TREE_SOLIDS = Object.freeze([
  rect(100, 48, 40, 44),
  rect(820, 48, 40, 44),
  rect(80, 158, 40, 44),
  rect(840, 158, 40, 44),
  rect(80, 338, 40, 44),
  rect(840, 338, 40, 44),
  rect(100, 448, 40, 44),
  rect(820, 448, 40, 44),
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

/** The authored 960 by 540 carved sandstone realm layout for Realm Carver. */
export const REALM_CARVER_MAP: RealmCarverMap = Object.freeze({
  id: "realm-carver",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 474),
  enemySpawns: Object.freeze([point(200, 270), point(760, 270), point(480, 120)]),
  clearings: Object.freeze([
    Object.freeze({ id: "clearing-monument", center: point(480, 270), radius: 56 }),
    Object.freeze({ id: "clearing-northwest", center: point(330, 205), radius: 44 }),
    Object.freeze({ id: "clearing-northeast", center: point(630, 205), radius: 44 }),
    Object.freeze({ id: "clearing-south", center: point(480, 430), radius: 44 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "cross-horizontal", width: 46, points: Object.freeze([point(60, 270), point(900, 270)]) }),
    Object.freeze({ id: "cross-vertical", width: 46, points: Object.freeze([point(480, 60), point(480, 512)]) }),
    Object.freeze({ id: "carve-northwest", width: 34, points: Object.freeze([point(480, 270), point(170, 100)]) }),
    Object.freeze({ id: "carve-northeast", width: 34, points: Object.freeze([point(480, 270), point(790, 100)]) }),
    Object.freeze({ id: "carve-southwest", width: 34, points: Object.freeze([point(480, 270), point(170, 440)]) }),
    Object.freeze({ id: "carve-southeast", width: 34, points: Object.freeze([point(480, 270), point(790, 440)]) }),
    Object.freeze({ id: "monument-ring", width: 26, points: Object.freeze([point(300, 150), point(660, 150), point(660, 390), point(300, 390), point(300, 150)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "sandstone-floor", assetKey: "dungeon:sandstone", depth: -40 }),
    Object.freeze({ id: "carve-lanes", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("dirt-patch-southwest", "dirt-patch", "prop:dirt-patch", 250, 430, 96, 96, 6),
    feature("dirt-patch-southeast", "dirt-patch", "prop:dirt-patch", 710, 430, 96, 96, 6),
    feature("fence-north", "fence", "prop:fence", 480, 12, 912, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 12, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 948, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-southwest", "fence", "prop:fence", 198, 522, 396, 32, 8, undefined, undefined, "x"),
    feature("fence-southeast", "fence", "prop:fence", 762, 522, 396, 32, 8, undefined, undefined, "x"),
    feature("south-gate", "entrance", "prop:gate", 480, 514, 72, 44, 11),
    feature("ruin-northwest", "ruins", "prop:ruins", 200, 170, 64, 64, 12, RUIN_SOLIDS[0]),
    feature("ruin-northeast", "ruins", "prop:ruins", 760, 170, 64, 64, 12, RUIN_SOLIDS[1]),
    feature("ruin-southwest", "ruins", "prop:ruins", 200, 370, 64, 64, 12, RUIN_SOLIDS[2]),
    feature("ruin-southeast", "ruins", "prop:ruins", 760, 370, 64, 64, 12, RUIN_SOLIDS[3]),
    feature("tree-northwest", "dead-tree", "prop:dead-tree-large", 120, 70, 72, 96, 14, TREE_SOLIDS[0]),
    feature("tree-northeast", "dead-tree", "prop:dead-tree-large", 840, 70, 72, 96, 14, TREE_SOLIDS[1]),
    feature("tree-west-upper", "dead-tree", "prop:dead-tree-large", 100, 180, 72, 96, 14, TREE_SOLIDS[2]),
    feature("tree-east-upper", "dead-tree", "prop:dead-tree-large", 860, 180, 72, 96, 14, TREE_SOLIDS[3]),
    feature("tree-west-lower", "dead-tree", "prop:dead-tree-large", 100, 360, 72, 96, 14, TREE_SOLIDS[4]),
    feature("tree-east-lower", "dead-tree", "prop:dead-tree-large", 860, 360, 72, 96, 14, TREE_SOLIDS[5]),
    feature("tree-southwest", "dead-tree", "prop:dead-tree-large", 120, 470, 72, 96, 14, TREE_SOLIDS[6]),
    feature("tree-southeast", "dead-tree", "prop:dead-tree-large", 840, 470, 72, 96, 14, TREE_SOLIDS[7]),
    feature("monument-crystal", "crystal", "prop:crystal", 480, 270, 44, 44, 15),
    feature("ring-crystal-north", "crystal", "prop:crystal", 480, 150, 18, 18, 15),
    feature("ring-crystal-south", "crystal", "prop:crystal", 480, 390, 18, 18, 15),
    feature("ring-crystal-west", "crystal", "prop:crystal", 300, 270, 18, 18, 15),
    feature("ring-crystal-east", "crystal", "prop:crystal", 660, 270, 18, 18, 15),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...RUIN_SOLIDS, ...TREE_SOLIDS]),
});

validateStandardPlayMap(REALM_CARVER_MAP);

/**
 * Checks whether a circular actor overlaps any Realm Carver realm solid.
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
 * Checks grid reachability between two Realm Carver realm points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The realm layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function realmCarverReachable(
  start: RealmCarverPoint,
  end: RealmCarverPoint,
  map: RealmCarverMap = REALM_CARVER_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
