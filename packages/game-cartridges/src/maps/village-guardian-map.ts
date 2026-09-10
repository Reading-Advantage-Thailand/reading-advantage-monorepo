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
  rect(0, 520, 960, 20),
]);

const BUILDING_SOLIDS = Object.freeze([
  rect(136, 88, 30, 58),
  rect(582, 92, 50, 40),
  rect(840, 232, 46, 38),
  rect(796, 434, 30, 62),
  rect(122, 444, 50, 40),
  rect(546, 196, 28, 58),
  rect(304, 302, 48, 40),
  rect(596, 352, 46, 38),
  rect(408, 248, 24, 24),
]);

const TREE_SOLIDS = Object.freeze([
  rect(86, 226, 36, 44),
  rect(848, 108, 30, 28),
  rect(866, 446, 28, 32),
]);

/** The authored 960 by 540 walled village with a ring road around a central green. */
export const VILLAGE_GUARDIAN_MAP: VillageGuardianMap = Object.freeze({
  id: "village-guardian",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 440),
  enemySpawns: Object.freeze([point(480, 40), point(480, 500), point(720, 500)]),
  clearings: Object.freeze([
    Object.freeze({ id: "village-green", center: point(480, 300), radius: 60 }),
    Object.freeze({ id: "north-court", center: point(480, 110), radius: 36 }),
    Object.freeze({ id: "west-court", center: point(330, 250), radius: 36 }),
    Object.freeze({ id: "east-court", center: point(630, 330), radius: 36 }),
    Object.freeze({ id: "south-common", center: point(350, 470), radius: 36 }),
  ]),
  paths: Object.freeze([
    Object.freeze({
      id: "ring-road",
      width: 48,
      points: Object.freeze([
        point(240, 170),
        point(720, 170),
        point(720, 410),
        point(240, 410),
        point(240, 170),
      ]),
    }),
    Object.freeze({ id: "north-street", width: 44, points: Object.freeze([point(480, 220), point(480, 40)]) }),
    Object.freeze({ id: "south-street", width: 44, points: Object.freeze([point(480, 380), point(480, 500)]) }),
    Object.freeze({ id: "southeast-street", width: 40, points: Object.freeze([point(720, 410), point(720, 500)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "village-ground", assetKey: "world:ground", depth: -40 }),
    Object.freeze({ id: "village-roads", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("green-heart", "plaza", "prop:dirt-patch", 480, 300, 128, 128, 5),
    feature("fence-north-left", "fence", "prop:fence", 239, 16, 438, 32, 8, undefined, undefined, "x"),
    feature("fence-north-right", "fence", "prop:fence", 721, 16, 438, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 16, 270, 500, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 944, 270, 500, 32, 8, undefined, 90, "x"),
    feature("fence-south-left", "fence", "prop:fence", 239, 524, 438, 32, 8, undefined, undefined, "x"),
    feature("fence-south-mid", "fence", "prop:fence", 601, 524, 198, 32, 8, undefined, undefined, "x"),
    feature("fence-south-right", "fence", "prop:fence", 840, 524, 200, 32, 8, undefined, undefined, "x"),
    feature("gate-north", "gate", "prop:gate", 480, 26, 36, 36, 9),
    feature("gate-south", "gate", "prop:gate", 480, 514, 36, 36, 9),
    feature("gate-southeast", "gate", "prop:gate", 720, 514, 36, 36, 9),
    feature("house-north", "house", "prop:memorial", 607, 120, 64, 56, 14, BUILDING_SOLIDS[1]),
    feature("house-east", "house", "prop:memorial", 863, 251, 60, 54, 14, BUILDING_SOLIDS[2]),
    feature("house-southwest", "house", "prop:memorial", 147, 464, 64, 56, 14, BUILDING_SOLIDS[4]),
    feature("house-west-inner", "house", "prop:memorial", 328, 322, 60, 52, 14, BUILDING_SOLIDS[7]),
    feature("house-south-inner", "house", "prop:memorial", 619, 371, 56, 50, 14, BUILDING_SOLIDS[8]),
    feature("tower-northwest", "tower", "prop:tower", 151, 133, 48, 90, 15, BUILDING_SOLIDS[0]),
    feature("tower-southeast", "tower", "prop:tower", 811, 479, 48, 90, 15, BUILDING_SOLIDS[3]),
    feature("tower-north-inner", "tower", "prop:tower", 560, 237, 44, 84, 15, BUILDING_SOLIDS[5]),
    feature("village-well", "well", "prop:memorial", 420, 260, 44, 44, 15, BUILDING_SOLIDS[9]),
    feature("tree-west", "dead-tree", "prop:dead-tree-large", 104, 250, 72, 96, 14, TREE_SOLIDS[0]),
    feature("tree-northeast", "dead-tree", "prop:dead-tree-small", 863, 122, 68, 76, 14, TREE_SOLIDS[1]),
    feature("tree-southeast", "dead-tree", "prop:dead-tree-small", 880, 462, 68, 76, 14, TREE_SOLIDS[2]),
    feature("lantern-ring-nw", "lantern", "prop:lantern", 216, 146, 28, 28, 16),
    feature("lantern-ring-ne", "lantern", "prop:lantern", 744, 146, 28, 28, 16),
    feature("lantern-ring-se", "lantern", "prop:lantern", 744, 434, 28, 28, 16),
    feature("lantern-ring-sw", "lantern", "prop:lantern", 216, 434, 28, 28, 16),
    feature("lantern-ring-west", "lantern", "prop:lantern", 216, 290, 28, 28, 16),
    feature("lantern-ring-east", "lantern", "prop:lantern", 744, 290, 28, 28, 16),
    feature("lantern-plaza-west", "lantern", "prop:lantern", 400, 300, 28, 28, 16),
    feature("lantern-plaza-east", "lantern", "prop:lantern", 560, 300, 28, 28, 16),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...BUILDING_SOLIDS, ...TREE_SOLIDS]),
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
