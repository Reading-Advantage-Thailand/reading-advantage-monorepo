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

/** A point in the Enchanted Library interior. */
export type EnchantedLibraryPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Enchanted Library. */
export type EnchantedLibraryRect = StandardPlayMapRect;

/** One reading aisle through the Enchanted Library. */
export type EnchantedLibraryPath = StandardPlayMapPath;

/** One stable book clearing in the Enchanted Library. */
export type EnchantedLibraryClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type EnchantedLibraryTerrainLayer = StandardPlayMapTerrainLayer;

/** One library prop with a reviewed semantic asset. */
export type EnchantedLibraryFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Enchanted Library rules and rendering. */
export type EnchantedLibraryMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): EnchantedLibraryRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): EnchantedLibraryPoint => Object.freeze({ x, y });

const feature = (
  id: string,
  kind: string,
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: EnchantedLibraryRect,
  rotation?: number,
  repeat?: EnchantedLibraryFeature["repeat"],
): EnchantedLibraryFeature => Object.freeze({
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
  rect(0, 520, 440, 20),
  rect(520, 520, 440, 20),
]);

const SHELF_SOLIDS = Object.freeze([
  rect(60, 120, 120, 28), rect(240, 120, 120, 28), rect(600, 120, 120, 28), rect(780, 120, 120, 28),
  rect(60, 220, 120, 28), rect(240, 220, 120, 28), rect(600, 220, 120, 28), rect(780, 220, 120, 28),
  rect(60, 320, 120, 28), rect(240, 320, 120, 28), rect(600, 320, 120, 28), rect(780, 320, 120, 28),
  rect(60, 420, 120, 28), rect(240, 420, 120, 28), rect(600, 420, 120, 28), rect(780, 420, 120, 28),
]);

const shelfFeatures: EnchantedLibraryFeature[] = [];
SHELF_SOLIDS.forEach((shelf, index) => {
  shelfFeatures.push(feature(
    `shelf-${index}`,
    "shelf",
    "prop:bookshelf",
    shelf.x + shelf.width / 2,
    shelf.y + shelf.height / 2,
    shelf.width,
    32,
    12,
    shelf,
    undefined,
    "x",
  ));
});

/** The authored 960 by 540 library interior for Enchanted Library. */
export const ENCHANTED_LIBRARY_MAP: EnchantedLibraryMap = Object.freeze({
  id: "enchanted-library",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 500),
  enemySpawns: Object.freeze([point(300, 70), point(660, 70)]),
  clearings: Object.freeze([
    Object.freeze({ id: "west-north", center: point(210, 180), radius: 48 }),
    Object.freeze({ id: "west-south", center: point(210, 380), radius: 48 }),
    Object.freeze({ id: "east-north", center: point(750, 180), radius: 48 }),
    Object.freeze({ id: "east-south", center: point(750, 380), radius: 48 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "entry-spine", width: 40, points: Object.freeze([point(480, 500), point(480, 270)]) }),
    Object.freeze({ id: "west-spine", width: 34, points: Object.freeze([point(480, 270), point(210, 270)]) }),
    Object.freeze({ id: "west-north", width: 34, points: Object.freeze([point(210, 270), point(210, 180)]) }),
    Object.freeze({ id: "west-south", width: 34, points: Object.freeze([point(210, 270), point(210, 380)]) }),
    Object.freeze({ id: "east-spine", width: 34, points: Object.freeze([point(480, 270), point(750, 270)]) }),
    Object.freeze({ id: "east-north", width: 34, points: Object.freeze([point(750, 270), point(750, 180)]) }),
    Object.freeze({ id: "east-south", width: 34, points: Object.freeze([point(750, 270), point(750, 380)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "library-floor", assetKey: "wizard-floor", depth: -40 }),
  ]),
  decor: Object.freeze([
    feature("stone-floor-fill", "floor", "wizard-floor", 480, 270, 960, 540, -22, undefined, undefined, "xy"),
    feature("south-entrance", "entrance", "prop:gate", 480, 522, 72, 44, 11),
    ...shelfFeatures,
    feature("lantern-center-north", "lantern", "prop:lantern", 480, 180, 28, 28, 16),
    feature("lantern-center-south", "lantern", "prop:lantern", 480, 380, 28, 28, 16),
    feature("reading-west", "reading-desk", "prop:memorial", 210, 270, 40, 40, 13),
    feature("reading-east", "reading-desk", "prop:memorial", 750, 270, 40, 40, 13),
  ]),
  solids: Object.freeze([...BORDER_SOLIDS, ...SHELF_SOLIDS]),
});

validateStandardPlayMap(ENCHANTED_LIBRARY_MAP);

/**
 * Checks whether a circular actor overlaps any library solid.
 * @param pointValue The actor center.
 * @param radius The actor collision radius.
 * @param solids The solid footprints to check.
 * @returns Whether the actor overlaps a solid.
 */
export function isPointInsideEnchantedLibrarySolid(
  pointValue: EnchantedLibraryPoint,
  radius: number,
  solids: readonly EnchantedLibraryRect[] = ENCHANTED_LIBRARY_MAP.solids,
): boolean {
  return isStandardPlayMapPointInsideSolid(pointValue, radius, solids);
}

/**
 * Checks grid reachability between two Enchanted Library points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The library layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function enchantedLibraryReachable(
  start: EnchantedLibraryPoint,
  end: EnchantedLibraryPoint,
  map: EnchantedLibraryMap = ENCHANTED_LIBRARY_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
