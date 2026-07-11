/** Point in a bounded arena. */
export interface ArenaPoint { readonly x: number; readonly y: number }
/** Inclusive arena bounds. */
export interface ArenaBounds { readonly width: number; readonly height: number }
/** Educational target resolved by a deterministic arena loop. */
export interface ArenaTarget { readonly id: string; readonly label: string; readonly order: number; readonly x: number; readonly y: number }
/** Runtime mechanic families backed by shared arena state. */
export type ArenaMechanic = "protected-target-aim" | "paired-hero-arena" | "aerial-ordered-targets" | "patrol-minimap" | "ordered-territory-capture";
/** Deterministic shared state specialized by each W4 mechanic. */
export interface ArenaMechanicState {
  readonly mechanic: ArenaMechanic;
  readonly targetCount: number;
  readonly resolved: number;
  readonly health: number;
  readonly wave: number;
  readonly altitude: number;
  readonly captured: number;
  readonly shots: number;
  readonly complete: boolean;
  readonly victory?: boolean;
}

/** Creates deterministic survival, flight, patrol, or territory state.
 * @param mechanic Frozen W4 mechanic identity.
 * @param targetCount Number of educational targets required for victory.
 * @returns Initial mechanic state.
 * @throws When targetCount is not a positive integer.
 */
export function createArenaMechanicState(mechanic: ArenaMechanic, targetCount: number): ArenaMechanicState {
  if (!Number.isInteger(targetCount) || targetCount <= 0) throw new Error("arena target count must be a positive integer");
  return { mechanic, targetCount, resolved: 0, health: mechanic === "paired-hero-arena" ? 6 : 3, wave: 1, altitude: mechanic === "aerial-ordered-targets" ? 0.5 : 0, captured: 0, shots: 0, complete: false };
}

/** Resolves a projectile, strike, patrol shot, or territory capture attempt.
 * @param state Current mechanic state.
 * @param correct Whether the selected target is educationally correct.
 * @returns Updated progress, health, wave, capture, and terminal state.
 */
export function resolveArenaMechanicAttempt(state: ArenaMechanicState, correct: boolean): ArenaMechanicState {
  if (state.complete) return state;
  const resolved = state.resolved + (correct ? 1 : 0);
  const health = Math.max(0, state.health - (correct ? 0 : 1));
  const complete = resolved >= state.targetCount || health === 0;
  return { ...state, resolved, health, shots: state.shots + 1, wave: arenaWaveIndex(resolved, 3) + 1, captured: state.mechanic === "ordered-territory-capture" ? resolved : state.captured, complete, ...(complete ? { victory: resolved >= state.targetCount } : {}) };
}

/** Applies one bounded flap impulse to aerial state.
 * @param state Current aerial mechanic state.
 * @param impulse Signed normalized altitude impulse.
 * @returns State with altitude clamped from zero to one.
 * @throws When used with a non-aerial mechanic.
 */
export function flapArenaState(state: ArenaMechanicState, impulse: number): ArenaMechanicState {
  if (state.mechanic !== "aerial-ordered-targets") throw new Error("flap requires aerial mechanic state");
  return { ...state, altitude: Math.max(0, Math.min(1, state.altitude + impulse)) };
}

/** Moves a point within arena bounds.
 * @param point Current point.
 * @param delta Requested movement delta.
 * @param bounds Inclusive arena dimensions.
 * @returns Clamped next point.
 * @throws When either arena dimension is not positive.
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
 * @throws When either world dimension is not positive.
 */
export function projectToMinimap(point: ArenaPoint, world: ArenaBounds, minimap: ArenaBounds): ArenaPoint {
  if (world.width <= 0 || world.height <= 0) throw new Error("world bounds must be positive");
  return { x: point.x / world.width * minimap.width, y: point.y / world.height * minimap.height };
}

/** Advances deterministic wave progress.
 * @param resolved Number of resolved targets.
 * @param waveSize Targets per wave.
 * @returns Zero-based wave number.
 * @throws When resolved or waveSize is not a legal integer.
 */
export function arenaWaveIndex(resolved: number, waveSize: number): number {
  if (!Number.isInteger(resolved) || resolved < 0 || !Number.isInteger(waveSize) || waveSize <= 0) throw new Error("wave inputs must be non-negative integers");
  return Math.floor(resolved / waveSize);
}

/** Returns capture progress for an ordered territory map.
 * @param captured Number of captured tiles.
 * @param total Total capturable tiles.
 * @returns Normalized progress from zero to one.
 * @throws When total is not positive.
 */
export function territoryProgress(captured: number, total: number): number {
  if (total <= 0) throw new Error("territory total must be positive");
  return Math.max(0, Math.min(1, captured / total));
}
