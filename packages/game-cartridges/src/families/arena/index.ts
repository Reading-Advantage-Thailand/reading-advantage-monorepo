/** Point in a bounded arena. */
export interface ArenaPoint { readonly x: number; readonly y: number }
/** Inclusive arena bounds. */
export interface ArenaBounds { readonly width: number; readonly height: number }
/** Educational target resolved by a deterministic arena loop. */
export interface ArenaTarget { readonly id: string; readonly label: string; readonly order: number; readonly x: number; readonly y: number }

/** Moves a point within arena bounds.
 * @param point Current point.
 * @param delta Requested movement delta.
 * @param bounds Inclusive arena dimensions.
 * @returns Clamped next point.
 */
export function moveArenaPoint(point: ArenaPoint, delta: ArenaPoint, bounds: ArenaBounds): ArenaPoint {
  if (bounds.width <= 0 || bounds.height <= 0) throw new Error("arena bounds must be positive");
  return { x: Math.max(0, Math.min(bounds.width, point.x + delta.x)), y: Math.max(0, Math.min(bounds.height, point.y + delta.y)) };
}

/** Selects the expected ordered target.
 * @param targets Available targets.
 * @param order Current educational order.
 * @returns Matching target, when present.
 */
export function expectedArenaTarget(targets: readonly ArenaTarget[], order: number): ArenaTarget | undefined {
  return targets.find((target) => target.order === order);
}

/** Measures a target against a projectile swept segment.
 * @param target Target position.
 * @param start Previous projectile position.
 * @param end Current projectile position.
 * @returns Shortest Euclidean distance to the segment.
 */
export function projectilePathDistance(target: ArenaPoint, start: ArenaPoint, end: ArenaPoint): number {
  const dx = end.x - start.x; const dy = end.y - start.y; const length = dx * dx + dy * dy;
  if (length === 0) return Math.hypot(target.x - start.x, target.y - start.y);
  const t = Math.max(0, Math.min(1, ((target.x - start.x) * dx + (target.y - start.y) * dy) / length));
  return Math.hypot(target.x - (start.x + t * dx), target.y - (start.y + t * dy));
}

/** Projects a world point into a minimap rectangle.
 * @param point World point.
 * @param world World bounds.
 * @param minimap Minimap dimensions.
 * @returns Minimap-local point.
 */
export function projectToMinimap(point: ArenaPoint, world: ArenaBounds, minimap: ArenaBounds): ArenaPoint {
  if (world.width <= 0 || world.height <= 0) throw new Error("world bounds must be positive");
  return { x: point.x / world.width * minimap.width, y: point.y / world.height * minimap.height };
}

/** Advances deterministic wave progress.
 * @param resolved Number of resolved targets.
 * @param waveSize Targets per wave.
 * @returns Zero-based wave number.
 */
export function arenaWaveIndex(resolved: number, waveSize: number): number {
  if (!Number.isInteger(resolved) || resolved < 0 || !Number.isInteger(waveSize) || waveSize <= 0) throw new Error("wave inputs must be non-negative integers");
  return Math.floor(resolved / waveSize);
}

/** Returns capture progress for an ordered territory map.
 * @param captured Number of captured tiles.
 * @param total Total capturable tiles.
 * @returns Normalized progress from zero to one.
 */
export function territoryProgress(captured: number, total: number): number {
  if (total <= 0) throw new Error("territory total must be positive");
  return Math.max(0, Math.min(1, captured / total));
}
