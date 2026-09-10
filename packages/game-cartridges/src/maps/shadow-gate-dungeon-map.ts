import {
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

/** A point in the fixed Shadow Gate crypt dungeon. */
export type ShadowGateDungeonPoint = StandardPlayMapPoint;

/** An axis-aligned solid footprint in the Shadow Gate dungeon. */
export type ShadowGateDungeonRect = StandardPlayMapRect;

/** One stone corridor through the Shadow Gate dungeon. */
export type ShadowGateDungeonPath = StandardPlayMapPath;

/** One stable interaction clearing in the Shadow Gate dungeon. */
export type ShadowGateDungeonClearing = StandardPlayMapClearing;

/** One terrain layer rendered below actors. */
export type ShadowGateDungeonTerrainLayer = StandardPlayMapTerrainLayer;

/** One dungeon prop with a reviewed semantic asset. */
export type ShadowGateDungeonFeature = StandardPlayMapFeature;

/** The complete authored layout consumed by Shadow Gate rules and rendering. */
export type ShadowGateDungeonMap = StandardPlayMap;

const rect = (x: number, y: number, width: number, height: number): ShadowGateDungeonRect =>
  Object.freeze({ x, y, width, height });

const point = (x: number, y: number): ShadowGateDungeonPoint => Object.freeze({ x, y });

const feature = (
  id: string,
  kind: ShadowGateDungeonFeature["kind"],
  assetKey: string,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  solid?: ShadowGateDungeonRect,
  rotation?: number,
  repeat?: ShadowGateDungeonFeature["repeat"],
): ShadowGateDungeonFeature => Object.freeze({
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

/** Mausoleum wall footprints. The top and bottom center gaps are the gate openings. */
const WALL_SEGMENTS = Object.freeze([
  rect(0, 0, 420, 24),
  rect(540, 0, 420, 24),
  rect(0, 0, 24, 540),
  rect(936, 0, 24, 540),
  rect(0, 516, 420, 24),
  rect(540, 516, 420, 24),
  rect(400, 24, 24, 86),
  rect(400, 190, 24, 160),
  rect(400, 430, 24, 86),
  rect(536, 24, 24, 86),
  rect(536, 190, 24, 160),
  rect(536, 430, 24, 86),
  rect(24, 246, 376, 24),
  rect(560, 246, 376, 24),
]);

const wallSolids: ShadowGateDungeonRect[] = [];
const wallFeatures: ShadowGateDungeonFeature[] = [];
WALL_SEGMENTS.forEach((segment, index) => {
  wallSolids.push(segment);
  const horizontal = segment.width >= segment.height;
  wallFeatures.push(feature(
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

/** The authored 960 by 540 crypt dungeon layout for Shadow Gate. */
export const SHADOW_GATE_DUNGEON_MAP: ShadowGateDungeonMap = Object.freeze({
  id: "shadow-gate-dungeon",
  world: Object.freeze({ width: 960, height: 540 }),
  playerSpawn: point(480, 470),
  enemySpawns: Object.freeze([point(480, 300), point(300, 200), point(660, 340)]),
  clearings: Object.freeze([
    Object.freeze({ id: "crypt-northwest", center: point(220, 150), radius: 55 }),
    Object.freeze({ id: "crypt-northeast", center: point(740, 150), radius: 55 }),
    Object.freeze({ id: "crypt-southwest", center: point(220, 390), radius: 55 }),
    Object.freeze({ id: "crypt-southeast", center: point(740, 390), radius: 55 }),
  ]),
  paths: Object.freeze([
    Object.freeze({ id: "entry-hall", width: 40, points: Object.freeze([point(480, 500), point(480, 150)]) }),
    Object.freeze({ id: "northwest-spur", width: 32, points: Object.freeze([point(480, 150), point(300, 150), point(40, 150)]) }),
    Object.freeze({ id: "northeast-spur", width: 32, points: Object.freeze([point(480, 150), point(660, 150), point(920, 150)]) }),
    Object.freeze({ id: "southwest-spur", width: 32, points: Object.freeze([point(480, 390), point(310, 390), point(40, 390)]) }),
    Object.freeze({ id: "southeast-spur", width: 32, points: Object.freeze([point(480, 390), point(650, 390), point(920, 390)]) }),
  ]),
  terrain: Object.freeze([
    Object.freeze({ id: "dungeon-floor", assetKey: "dungeon:stone", depth: -40 }),
    Object.freeze({ id: "stone-corridors", assetKey: "path:crypt", depth: -30 }),
  ]),
  decor: Object.freeze([
    feature("south-entrance", "entrance", "prop:gate", 480, 520, 72, 44, 11),
    feature("north-exit", "gate", "prop:gate", 480, 36, 72, 44, 11),
    ...wallFeatures,
    feature("grave-nw", "grave", "prop:grave-c", 96, 84, 24, 40, 12),
    feature("grave-ne", "grave", "prop:grave-c", 864, 84, 24, 40, 12),
    feature("grave-sw", "grave", "prop:grave-c", 96, 456, 24, 40, 12),
    feature("grave-se", "grave", "prop:grave-c", 864, 456, 24, 40, 12),
    feature("lantern-north", "lantern", "prop:lantern", 350, 90, 28, 28, 16),
    feature("lantern-south", "lantern", "prop:lantern", 610, 450, 28, 28, 16),
  ]),
  solids: Object.freeze([...wallSolids]),
});

validateStandardPlayMap(SHADOW_GATE_DUNGEON_MAP);

/**
 * Checks grid reachability between two Shadow Gate dungeon points.
 * @param start The starting point.
 * @param end The destination point.
 * @param map The dungeon layout to traverse.
 * @returns Whether a collision-free route exists.
 */
export function shadowGateDungeonReachable(
  start: ShadowGateDungeonPoint,
  end: ShadowGateDungeonPoint,
  map: ShadowGateDungeonMap = SHADOW_GATE_DUNGEON_MAP,
): boolean {
  return isStandardPlayMapPointReachable(start, end, map);
}
