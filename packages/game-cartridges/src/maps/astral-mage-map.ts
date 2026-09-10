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

/** A point in the fixed Astral Mage star arena. */
export type AstralMagePoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Astral Mage arena. */
export type AstralMageRect = StandardPlayMapRect;

/** One stone corridor through the ruined arena. */
export type AstralMagePath = StandardPlayMapPath;

/** One stable crystal clearing. */
export type AstralMageClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type AstralMageTerrainLayer = StandardPlayMapTerrainLayer;

/** One arena prop with a reviewed semantic asset. */
export type AstralMageFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Astral Mage rules and rendering. */
export type AstralMageMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): AstralMageRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): AstralMagePoint => Object.freeze({ x, y });

const BORDER_SOLIDS = Object.freeze([
  rect(0, 0, 960, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 960, 24),
]);

const FEATURE_SOLIDS = Object.freeze([
  rect(302, 206, 96, 128),
  rect(562, 206, 96, 128),
  rect(84, 144, 52, 52),
  rect(824, 144, 52, 52),
  rect(84, 344, 52, 52),
  rect(824, 344, 52, 52),
]);

const feature = (
  id: string,
  kind: AstralMageFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: AstralMageRect,
  rotation?: number,
  repeat?: AstralMageFeature["repeat"],
): AstralMageFeature => Object.freeze({
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

const CRYSTAL_CLEARINGS = Object.freeze([
  Object.freeze({ id: "crystal-northwest", center: point(210, 130), radius: 44 }),
  Object.freeze({ id: "crystal-northeast", center: point(750, 130), radius: 44 }),
  Object.freeze({ id: "crystal-west", center: point(170, 300), radius: 44 }),
  Object.freeze({ id: "crystal-east", center: point(790, 300), radius: 44 }),
  Object.freeze({ id: "crystal-southwest", center: point(210, 420), radius: 44 }),
  Object.freeze({ id: "crystal-southeast", center: point(750, 420), radius: 44 }),
]);

const CRYSTAL_NODES = Object.freeze([
  feature("crystal-node-northwest", "crystal", "prop:crystal", 210, 130, 16, 16, 14),
  feature("crystal-node-northeast", "crystal", "prop:crystal", 750, 130, 16, 16, 14),
  feature("crystal-node-west", "crystal", "prop:crystal", 170, 300, 16, 16, 14),
  feature("crystal-node-east", "crystal", "prop:crystal", 790, 300, 16, 16, 14),
  feature("crystal-node-southwest", "crystal", "prop:crystal", 210, 420, 16, 16, 14),
  feature("crystal-node-southeast", "crystal", "prop:crystal", 750, 420, 16, 16, 14),
]);

/** The authored 960 by 540 ruined star arena layout for Astral Mage. */
export const ASTRAL_MAGE_MAP: AstralMageMap = Object.freeze({
  id: "astral-mage",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 474),
  enemySpawns: Object.freeze([point(360, 90), point(600, 90)]),
  clearings: CRYSTAL_CLEARINGS,
  paths: Object.freeze([
    Object.freeze({ id: "spine", width: 38, points: Object.freeze([point(480, 474), point(480, 420), point(480, 180), point(480, 130), point(480, 36)]) }),
    Object.freeze({ id: "crystal-northwest", width: 32, points: Object.freeze([point(480, 180), point(300, 180), point(210, 130)]) }),
    Object.freeze({ id: "crystal-northeast", width: 32, points: Object.freeze([point(480, 180), point(660, 180), point(750, 130)]) }),
    Object.freeze({ id: "crystal-west", width: 32, points: Object.freeze([point(480, 360), point(300, 360), point(170, 300)]) }),
    Object.freeze({ id: "crystal-east", width: 32, points: Object.freeze([point(480, 360), point(660, 360), point(790, 300)]) }),
    Object.freeze({ id: "crystal-southwest", width: 32, points: Object.freeze([point(480, 420), point(330, 420), point(210, 420)]) }),
    Object.freeze({ id: "crystal-southeast", width: 32, points: Object.freeze([point(480, 420), point(630, 420), point(750, 420)]) }),
    Object.freeze({ id: "spawn-northwest", width: 26, points: Object.freeze([point(480, 240), point(360, 160), point(360, 90)]) }),
    Object.freeze({ id: "spawn-northeast", width: 26, points: Object.freeze([point(480, 240), point(600, 160), point(600, 90)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "arena-stone", assetKey: "dungeon:stone-alt", depth: -40 }),
    Object.freeze({ id: "stone-corridors", assetKey: "path:sand", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("mausoleum-west", "mausoleum", "prop:mausoleum", 350, 270, 96, 128, 10, FEATURE_SOLIDS[0]),
    feature("mausoleum-east", "mausoleum", "prop:mausoleum", 610, 270, 96, 128, 10, FEATURE_SOLIDS[1]),
    feature("ruin-northwest", "ruins", "prop:ruins", 110, 170, 64, 64, 12, FEATURE_SOLIDS[2]),
    feature("ruin-northeast", "ruins", "prop:ruins", 850, 170, 64, 64, 12, FEATURE_SOLIDS[3]),
    feature("ruin-southwest", "ruins", "prop:ruins", 110, 370, 64, 64, 12, FEATURE_SOLIDS[4]),
    feature("ruin-southeast", "ruins", "prop:ruins", 850, 370, 64, 64, 12, FEATURE_SOLIDS[5]),
    feature("arena-wall-north", "wall", "prop:mausoleum", 480, 12, 936, 24, 9, undefined, undefined, "x"),
    feature("arena-wall-south", "wall", "prop:mausoleum", 480, 528, 936, 24, 9, undefined, undefined, "x"),
    feature("arena-wall-west", "wall", "prop:mausoleum", 12, 270, 516, 24, 9, undefined, 90, "x"),
    feature("arena-wall-east", "wall", "prop:mausoleum", 948, 270, 516, 24, 9, undefined, 90, "x"),
    feature("spawn-gate-northwest", "gate", "prop:gate", 360, 90, 40, 40, 13),
    feature("spawn-gate-northeast", "gate", "prop:gate", 600, 90, 40, 40, 13),
    ...CRYSTAL_NODES,
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...FEATURE_SOLIDS]),
});

validateStandardPlayMap(ASTRAL_MAGE_MAP);

/**
 * Checks whether a circular actor overlaps any Astral Mage arena solid.
 * @param pointValue The actor center.
 * @param radius The actor collision radius.
 * @param solids The solid footprints to check.
 * @returns Whether the actor overlaps a solid.
 */
export function isPointInsideAstralMageSolid(
  pointValue: AstralMagePoint,
  radius: number,
  solids: readonly AstralMageRect[] = ASTRAL_MAGE_MAP.solids,
): boolean {
  return isStandardPlayMapPointInsideSolid(pointValue, radius, solids);
}

/**
 * Checks grid reachability between two Astral Mage arena points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The arena layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function astralMageReachable(
  start: AstralMagePoint,
  end: AstralMagePoint,
  map: AstralMageMap = ASTRAL_MAGE_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
