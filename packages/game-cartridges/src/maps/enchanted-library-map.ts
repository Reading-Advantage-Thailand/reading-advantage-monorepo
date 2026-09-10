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

/** Staggered shelf footprints. Horizontal rows are wider than tall; columns are taller than wide. */
const SHELF_SOLIDS = Object.freeze([
  rect(360, 176, 120, 28),
  rect(500, 176, 120, 28),
  rect(360, 336, 120, 28),
  rect(520, 336, 120, 28),
  rect(336, 150, 28, 100),
  rect(336, 300, 28, 100),
  rect(596, 150, 28, 100),
  rect(596, 300, 28, 100),
  rect(80, 120, 120, 28),
  rect(80, 220, 120, 28),
  rect(80, 320, 120, 28),
  rect(80, 420, 120, 28),
  rect(300, 60, 110, 28),
  rect(440, 60, 110, 28),
  rect(760, 120, 28, 120),
  rect(760, 300, 28, 120),
  rect(860, 180, 28, 120),
  rect(860, 360, 28, 120),
  rect(700, 440, 120, 28),
  rect(860, 440, 120, 28),
]);

const shelfFeatures: EnchantedLibraryFeature[] = [];
SHELF_SOLIDS.forEach((shelf, index) => {
  const vertical = shelf.height > shelf.width;
  shelfFeatures.push(feature(
    `shelf-${index}`,
    "shelf",
    "prop:bookshelf",
    shelf.x + shelf.width / 2,
    shelf.y + shelf.height / 2,
    vertical ? shelf.height : shelf.width,
    vertical ? 28 : 32,
    12,
    shelf,
    vertical ? 90 : undefined,
    "x",
  ));
});

/** Boundary wall features that anchor the library interior and entrance. */
const borderFeatures: EnchantedLibraryFeature[] = [];
BORDER_SOLIDS.forEach((segment, index) => {
  const horizontal = segment.width >= segment.height;
  borderFeatures.push(feature(
    `wall-${index}`,
    "wall",
    "prop:mausoleum",
    segment.x + segment.width / 2,
    segment.y + segment.height / 2,
    horizontal ? segment.width : segment.height,
    horizontal ? segment.height : segment.width,
    10,
    segment,
    horizontal ? undefined : 90,
    "x",
  ));
});

/** The authored 960 by 540 library interior for Enchanted Library. */
export const ENCHANTED_LIBRARY_MAP: EnchantedLibraryMap = Object.freeze({
  id: "enchanted-library",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 500),
  enemySpawns: Object.freeze([point(120, 70), point(900, 90)]),
  clearings: Object.freeze([
    Object.freeze({ id: "rotunda", center: point(480, 270), radius: 46 }),
    Object.freeze({ id: "west-hall", center: point(200, 270), radius: 44 }),
    Object.freeze({ id: "north-study", center: point(370, 110), radius: 40 }),
    Object.freeze({ id: "east-wing", center: point(810, 260), radius: 40 }),
    Object.freeze({ id: "south-stack", center: point(600, 440), radius: 40 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "entry-hall", width: 40, points: Object.freeze([point(480, 500), point(480, 420), point(500, 300), point(480, 270)]) }),
    Object.freeze({ id: "west-aisle", width: 34, points: Object.freeze([point(480, 270), point(360, 275), point(200, 270)]) }),
    Object.freeze({ id: "north-aisle", width: 34, points: Object.freeze([point(490, 270), point(490, 140), point(370, 110)]) }),
    Object.freeze({ id: "east-aisle", width: 34, points: Object.freeze([point(480, 270), point(650, 275), point(810, 260)]) }),
    Object.freeze({ id: "south-stack", width: 30, points: Object.freeze([point(480, 420), point(600, 440)]) }),
    Object.freeze({ id: "enemy-northwest", width: 26, points: Object.freeze([point(370, 110), point(200, 110), point(120, 70)]) }),
    Object.freeze({ id: "enemy-east", width: 26, points: Object.freeze([point(810, 260), point(820, 150), point(900, 90)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "library-floor", assetKey: "wizard-floor", depth: -40 }),
  ]),
  decor: Object.freeze([
    ...borderFeatures,
    feature("south-entrance", "entrance", "prop:gate", 480, 522, 72, 44, 11),
    ...shelfFeatures,
    feature("lantern-rotunda", "lantern", "prop:lantern", 480, 210, 28, 28, 16),
    feature("lantern-west", "lantern", "prop:lantern", 240, 200, 28, 28, 16),
    feature("lantern-east", "lantern", "prop:lantern", 740, 200, 28, 28, 16),
    feature("reading-east", "reading-desk", "prop:memorial", 810, 140, 40, 40, 13),
    feature("reading-north", "reading-desk", "prop:memorial", 300, 150, 40, 40, 13),
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
