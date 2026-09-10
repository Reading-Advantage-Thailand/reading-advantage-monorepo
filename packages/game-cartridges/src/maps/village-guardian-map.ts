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

/** A point in the Village Guardian settlement. */
export type VillageGuardianPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Village Guardian settlement. */
export type VillageGuardianRect = StandardPlayMapRect;

/** One road through the Village Guardian settlement. */
export type VillageGuardianPath = StandardPlayMapPath;

/** One stable villager clearing in the settlement. */
export type VillageGuardianClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type VillageGuardianTerrainLayer = StandardPlayMapTerrainLayer;

/** One village prop with a reviewed semantic asset. */
export type VillageGuardianFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Village Guardian rules and rendering. */
export type VillageGuardianMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): VillageGuardianRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): VillageGuardianPoint => Object.freeze({ x, y });

const feature = (
  id: string,
  kind: string,
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: VillageGuardianRect,
  rotation?: number,
  repeat?: VillageGuardianFeature["repeat"],
): VillageGuardianFeature => Object.freeze({
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

const BORDER_SOLIDS = Object.freeze([
  rect(0, 0, 960, 20),
  rect(0, 0, 20, 540),
  rect(940, 0, 20, 540),
  rect(0, 520, 420, 20),
  rect(540, 520, 420, 20),
]);

const TREE_SOLIDS = Object.freeze([
  rect(340, 252, 44, 52),
  rect(582, 252, 44, 52),
]);

const TOWER_SOLIDS = Object.freeze([
  rect(120, 240, 32, 80),
  rect(808, 240, 32, 80),
]);

/** The authored 960 by 540 village layout for Village Guardian. */
export const VILLAGE_GUARDIAN_MAP: VillageGuardianMap = Object.freeze({
  id: "village-guardian",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 480),
  enemySpawns: Object.freeze([point(60, 60), point(900, 60), point(480, 60)]),
  clearings: Object.freeze([
    Object.freeze({ id: "northwest", center: point(150, 120), radius: 50 }),
    Object.freeze({ id: "northeast", center: point(810, 120), radius: 50 }),
    Object.freeze({ id: "sanctuary", center: point(480, 140), radius: 50 }),
    Object.freeze({ id: "southwest", center: point(200, 400), radius: 50 }),
    Object.freeze({ id: "southeast", center: point(760, 400), radius: 50 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "village-spine", width: 40, points: Object.freeze([point(480, 480), point(480, 140)]) }),
    Object.freeze({ id: "northwest-road", width: 32, points: Object.freeze([point(480, 140), point(320, 130), point(150, 120)]) }),
    Object.freeze({ id: "northeast-road", width: 32, points: Object.freeze([point(480, 140), point(640, 130), point(810, 120)]) }),
    Object.freeze({ id: "southwest-road", width: 32, points: Object.freeze([point(480, 300), point(320, 380), point(200, 400)]) }),
    Object.freeze({ id: "southeast-road", width: 32, points: Object.freeze([point(480, 300), point(640, 380), point(760, 400)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "village-green", assetKey: "world:ground", depth: -40 }),
    Object.freeze({ id: "village-roads", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("fence-north", "fence", "prop:fence", 480, 16, 920, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 16, 270, 500, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 944, 270, 500, 32, 8, undefined, 90, "x"),
    feature("fence-southwest", "fence", "prop:fence", 210, 524, 360, 32, 8, undefined, undefined, "x"),
    feature("fence-southeast", "fence", "prop:fence", 750, 524, 360, 32, 8, undefined, undefined, "x"),
    feature("tree-west", "dead-tree", "prop:dead-tree-large", 362, 276, 72, 96, 14, TREE_SOLIDS[0]),
    feature("tree-east", "dead-tree", "prop:dead-tree-small", 604, 276, 68, 76, 14, TREE_SOLIDS[1]),
    feature("tower-west", "tower", "prop:tower", 136, 280, 48, 90, 15, TOWER_SOLIDS[0]),
    feature("tower-east", "tower", "prop:tower", 824, 280, 48, 90, 15, TOWER_SOLIDS[1]),
    feature("lantern-sanctuary", "lantern", "prop:lantern", 400, 200, 28, 28, 16),
    feature("lantern-southwest", "lantern", "prop:lantern", 300, 430, 28, 28, 16),
    feature("lantern-southeast", "lantern", "prop:lantern", 660, 430, 28, 28, 16),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...TREE_SOLIDS, ...TOWER_SOLIDS]),
});

validateStandardPlayMap(VILLAGE_GUARDIAN_MAP);

/**
 * Checks whether a circular actor overlaps any village solid.
 * @param pointValue The actor center.
 * @param radius The actor collision radius.
 * @param solids The solid footprints to check.
 * @returns Whether the actor overlaps a solid.
 */
export function isPointInsideVillageGuardianSolid(
  pointValue: VillageGuardianPoint,
  radius: number,
  solids: readonly VillageGuardianRect[] = VILLAGE_GUARDIAN_MAP.solids,
): boolean {
  return isStandardPlayMapPointInsideSolid(pointValue, radius, solids);
}

/**
 * Checks grid reachability between two Village Guardian points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The village layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function villageGuardianReachable(
  start: VillageGuardianPoint,
  end: VillageGuardianPoint,
  map: VillageGuardianMap = VILLAGE_GUARDIAN_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
