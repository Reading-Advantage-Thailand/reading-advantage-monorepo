import {
  isStandardPlayMapPointInsideSolid,
  isStandardPlayMapPointReachable,
  type StandardPlayMap,
  type StandardPlayMapClearing,
  type StandardPlayMapFeature,
  type StandardPlayMapPath,
  type StandardPlayMapPoint,
  type StandardPlayMapRect,
  type StandardPlayMapTerrainLayer,
} from "./maps/standard-play-map.js";

/** A point in the fixed Wizard graveyard simulation. */
export type WizardGraveyardPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Wizard graveyard. */
export type WizardGraveyardRect = StandardPlayMapRect;

/** One curved or broken graveyard path. */
export type WizardGraveyardPath = StandardPlayMapPath;

/** One stable English answer clearing. */
export type WizardGraveyardClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type WizardGraveyardTerrainLayer = StandardPlayMapTerrainLayer;

/** One graveyard prop with a reviewed semantic asset. */
export type WizardGraveyardFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Wizard rules and rendering. */
export type WizardGraveyardMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): WizardGraveyardRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): WizardGraveyardPoint => Object.freeze({ x, y });

const BORDER_SOLIDS = Object.freeze([
  rect(0, 0, 960, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 420, 24),
  rect(540, 516, 420, 24),
]);

const FEATURE_SOLIDS = Object.freeze([
  rect(432, 132, 96, 56),
  rect(86, 96, 38, 34), rect(132, 116, 34, 32), rect(172, 92, 34, 34),
  rect(754, 92, 34, 34), rect(798, 118, 38, 32), rect(850, 94, 34, 34),
  rect(92, 282, 34, 34), rect(134, 310, 36, 34), rect(170, 286, 34, 34),
  rect(756, 286, 34, 34), rect(798, 310, 36, 34), rect(846, 282, 34, 34),
  rect(342, 250, 44, 52), rect(574, 248, 44, 52),
]);

const feature = (
  id: string,
  kind: WizardGraveyardFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: WizardGraveyardRect,
  rotation?: number,
  repeat?: WizardGraveyardFeature["repeat"],
): WizardGraveyardFeature => Object.freeze({
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

const GRAVE_CLUSTERS = Object.freeze([
  feature("grave-nw-a", "grave", "prop:grave-a", 105, 110, 32, 56, 12, FEATURE_SOLIDS[1]),
  feature("grave-nw-b", "grave", "prop:grave-b", 149, 132, 30, 54, 13, FEATURE_SOLIDS[2], -7),
  feature("grave-nw-c", "grave", "prop:grave-c", 189, 106, 32, 56, 12, FEATURE_SOLIDS[3], 5),
  feature("grave-ne-a", "grave", "prop:grave-c", 771, 106, 32, 56, 12, FEATURE_SOLIDS[4], -5),
  feature("grave-ne-b", "grave", "prop:grave-a", 815, 133, 32, 54, 13, FEATURE_SOLIDS[5], 8),
  feature("grave-ne-c", "grave", "prop:grave-b", 867, 108, 30, 56, 12, FEATURE_SOLIDS[6]),
  feature("grave-sw-a", "grave", "prop:grave-b", 109, 298, 30, 54, 12, FEATURE_SOLIDS[7], 5),
  feature("grave-sw-b", "memorial", "prop:memorial", 152, 326, 46, 46, 13, FEATURE_SOLIDS[8]),
  feature("grave-sw-c", "grave", "prop:grave-c", 187, 302, 32, 56, 12, FEATURE_SOLIDS[9], -6),
  feature("grave-se-a", "grave", "prop:grave-a", 773, 302, 32, 56, 12, FEATURE_SOLIDS[10]),
  feature("grave-se-b", "grave", "prop:grave-c", 816, 326, 32, 54, 13, FEATURE_SOLIDS[11], 7),
  feature("grave-se-c", "memorial", "prop:memorial", 863, 298, 46, 46, 12, FEATURE_SOLIDS[12]),
]);

/** The authored 960 by 540 graveyard layout for Wizard vs. Zombie. */
export const WIZARD_GRAVEYARD_MAP: WizardGraveyardMap = Object.freeze({
  id: "wizard-graveyard",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 474),
  enemySpawns: Object.freeze([point(82, 58), point(878, 58), point(62, 454), point(898, 454)]),
  clearings: Object.freeze([
    Object.freeze({ id: "northwest", center: point(258, 184), radius: 58 }),
    Object.freeze({ id: "northeast", center: point(702, 184), radius: 58 }),
    Object.freeze({ id: "southwest", center: point(258, 382), radius: 58 }),
    Object.freeze({ id: "southeast", center: point(702, 382), radius: 58 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "entrance-spine", width: 38, points: Object.freeze([point(480, 528), point(458, 462), point(508, 414), point(452, 360), point(492, 308), point(468, 262)]) }),
    Object.freeze({ id: "north-fork", width: 32, points: Object.freeze([point(468, 262), point(402, 246), point(350, 196), point(258, 184)]) }),
    Object.freeze({ id: "north-return", width: 32, points: Object.freeze([point(492, 308), point(548, 258), point(610, 196), point(702, 184)]) }),
    Object.freeze({ id: "south-fork", width: 32, points: Object.freeze([point(452, 360), point(390, 342), point(320, 398), point(258, 382)]) }),
    Object.freeze({ id: "south-return", width: 32, points: Object.freeze([point(508, 414), point(556, 372), point(640, 356), point(702, 382)]) }),
    Object.freeze({ id: "west-loop", width: 26, points: Object.freeze([point(258, 184), point(228, 230), point(232, 300), point(246, 340), point(258, 382)]) }),
    Object.freeze({ id: "east-loop", width: 26, points: Object.freeze([point(702, 184), point(732, 238), point(724, 300), point(736, 344), point(702, 382)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "grave-soil", assetKey: "world:ground", depth: -40 }),
    Object.freeze({ id: "crypt-floor", assetKey: "wizard-floor", depth: -24 }),
    Object.freeze({ id: "broken-stone-paths", assetKey: "world:path", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("south-entrance", "entrance", "prop:gate", 480, 514, 72, 44, 11),
    feature("crypt-floor-interior", "crypt-floor", "wizard-floor", 480, 188, 140, 150, -22, undefined, undefined, "xy"),
    feature("north-mausoleum", "mausoleum", "prop:mausoleum", 480, 188, 96, 128, 10, FEATURE_SOLIDS[0]),
    feature("crypt-gate", "gate", "prop:gate", 480, 264, 48, 40, 9),
    feature("crypt-coffin", "enemy-spawn", "prop:grave-c", 510, 232, 30, 54, 12),
    ...GRAVE_CLUSTERS,
    feature("west-tree", "dead-tree", "prop:dead-tree-large", 365, 276, 72, 96, 14, FEATURE_SOLIDS[13]),
    feature("east-tree", "dead-tree", "prop:dead-tree-small", 596, 274, 68, 76, 14, FEATURE_SOLIDS[14]),
    feature("lantern-northwest", "lantern", "prop:lantern", 330, 226, 28, 28, 16),
    feature("lantern-northeast", "lantern", "prop:lantern", 630, 226, 28, 28, 16),
    feature("lantern-southwest", "lantern", "prop:lantern", 338, 386, 28, 28, 16),
    feature("lantern-southeast", "lantern", "prop:lantern", 622, 386, 28, 28, 16),
    feature("fence-north", "fence", "prop:fence", 480, 18, 912, 32, 8, undefined, undefined, "x"),
    feature("fence-west", "fence", "prop:fence", 18, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-east", "fence", "prop:fence", 942, 270, 492, 32, 8, undefined, 90, "x"),
    feature("fence-southwest", "fence", "prop:fence", 210, 522, 420, 32, 8, undefined, undefined, "x"),
    feature("fence-southeast", "fence", "prop:fence", 750, 522, 420, 32, 8, undefined, undefined, "x"),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...FEATURE_SOLIDS]),
});

/**
 * Checks whether a circular actor overlaps any graveyard solid.
 * @param pointValue The actor center.
 * @param radius The actor collision radius.
 * @param solids The solid footprints to check.
 * @returns Whether the actor overlaps a solid.
 */
export function isPointInsideWizardGraveyardSolid(
  pointValue: WizardGraveyardPoint,
  radius: number,
  solids: readonly WizardGraveyardRect[] = WIZARD_GRAVEYARD_MAP.solids,
): boolean {
  return isStandardPlayMapPointInsideSolid(pointValue, radius, solids);
}

/**
 * Checks grid reachability between two graveyard points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The graveyard layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function isWizardGraveyardPointReachable(
  start: WizardGraveyardPoint,
  end: WizardGraveyardPoint,
  map: WizardGraveyardMap = WIZARD_GRAVEYARD_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
