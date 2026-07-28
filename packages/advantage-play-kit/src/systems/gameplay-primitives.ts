/** Two-dimensional gameplay vector. */
export interface GameplayVector {
  /** Horizontal component. */
  readonly x: number;
  /** Vertical component. */
  readonly y: number;
}

/** Axis-aligned gameplay rectangle. */
export interface GameplayBounds extends GameplayVector {
  /** Horizontal extent. */
  readonly width: number;
  /** Vertical extent. */
  readonly height: number;
}

/** Deterministic movable body state. */
export interface KinematicBody {
  /** Current point position. */
  readonly position: GameplayVector;
  /** Velocity in world units per second. */
  readonly velocity: GameplayVector;
}

function assertFinite(values: readonly number[], label: string): void {
  if (!values.every(Number.isFinite)) throw new Error(`${label} requires finite numeric values`);
}

/**
 * Advances a point body with a controllable delta and clamps it to world bounds.
 * @param body Current position and velocity.
 * @param deltaMs Deterministic elapsed time in milliseconds.
 * @param bounds Inclusive point bounds.
 * @returns The next immutable body state.
 * @throws When values are non-finite, elapsed time is negative, or bounds are invalid.
 */
export function advanceBody(body: KinematicBody, deltaMs: number, bounds: GameplayBounds): KinematicBody {
  assertFinite([
    body.position.x,
    body.position.y,
    body.velocity.x,
    body.velocity.y,
    deltaMs,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  ], "Body advance");
  if (deltaMs < 0 || bounds.width < 0 || bounds.height < 0) throw new Error("Body advance received negative time or bounds");
  const seconds = deltaMs / 1000;
  return Object.freeze({
    position: Object.freeze({
      x: Math.min(bounds.x + bounds.width, Math.max(bounds.x, body.position.x + body.velocity.x * seconds)),
      y: Math.min(bounds.y + bounds.height, Math.max(bounds.y, body.position.y + body.velocity.y * seconds)),
    }),
    velocity: Object.freeze({ ...body.velocity }),
  });
}

/**
 * Tests strict area overlap between two axis-aligned rectangles.
 * @param left First rectangle.
 * @param right Second rectangle.
 * @returns True only when the rectangles overlap with positive area.
 */
export function intersects(left: GameplayBounds, right: GameplayBounds): boolean {
  assertFinite(
    [left.x, left.y, left.width, left.height, right.x, right.y, right.width, right.height],
    "Collision test",
  );
  if (left.width < 0 || left.height < 0 || right.width < 0 || right.height < 0) {
    throw new Error("Collision rectangles cannot have negative dimensions");
  }
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

/** Object-pool configuration with a strict capacity. */
export interface ObjectPoolConfig<Value extends object> {
  /** Maximum simultaneously active objects. */
  readonly capacity: number;
  /** Creates one object when no released object is available. */
  readonly create: () => Value;
  /** Restores an object to an inactive reusable state. */
  readonly reset: (value: Value) => void;
}

/** Bounded reusable object pool. */
export interface ObjectPool<Value extends object> {
  /** Acquires an active object or fails at capacity. */
  acquire(): Value;
  /** Releases a currently active object for reuse. */
  release(value: Value): void;
  /** Current active object count. */
  readonly activeCount: number;
  /** Total object count allocated by the pool. */
  readonly allocatedCount: number;
  /** Releases every active object. */
  clear(): void;
}

/**
 * Creates a deterministic bounded object pool for projectiles, effects, or actors.
 * @param config Capacity and game-owned create/reset adapters.
 * @returns A pool that reuses released objects and fails closed at capacity.
 */
export function createObjectPool<Value extends object>(config: ObjectPoolConfig<Value>): ObjectPool<Value> {
  if (!Number.isInteger(config.capacity) || config.capacity <= 0) throw new Error("Object pool capacity must be a positive integer");
  const available: Value[] = [];
  const allocated = new Set<Value>();
  const active = new Set<Value>();
  return Object.freeze({
    acquire(): Value {
      const value = available.pop();
      if (value) {
        active.add(value);
        return value;
      }
      if (allocated.size >= config.capacity) throw new Error(`Object pool capacity ${config.capacity} reached`);
      const created = config.create();
      if (!created || typeof created !== "object") throw new Error("Object pool create adapter must return an object");
      allocated.add(created);
      active.add(created);
      return created;
    },
    release(value: Value): void {
      if (!active.delete(value)) throw new Error("Object pool can release only a currently active owned object");
      config.reset(value);
      available.push(value);
    },
    get activeCount(): number {
      return active.size;
    },
    get allocatedCount(): number {
      return allocated.size;
    },
    clear(): void {
      for (const value of [...active]) {
        active.delete(value);
        config.reset(value);
        available.push(value);
      }
    },
  });
}

/** Deterministic interval-spawner configuration. */
export interface DeterministicSpawnerConfig {
  /** Milliseconds accumulated per spawn. */
  readonly intervalMs: number;
  /** Safety ceiling for spawns emitted by one advance call. */
  readonly maxPerTick: number;
}

/** Controllably clocked spawn threshold. */
export interface DeterministicSpawner {
  /**
   * Advances virtual time and returns the bounded number of due spawns.
   * @param deltaMs Deterministic elapsed time.
   * @returns Number of spawn events due this tick.
   */
  advance(deltaMs: number): number;
  /** Milliseconds retained toward the next spawn. */
  readonly elapsedMs: number;
  /** Clears retained elapsed time. */
  reset(): void;
}

/**
 * Creates a deterministic interval spawner with a per-tick safety ceiling.
 * @param config Interval and maximum emissions per tick.
 * @returns A controllably clocked spawn threshold.
 */
export function createDeterministicSpawner(config: DeterministicSpawnerConfig): DeterministicSpawner {
  if (!Number.isFinite(config.intervalMs) || config.intervalMs <= 0
    || !Number.isInteger(config.maxPerTick) || config.maxPerTick <= 0) {
    throw new Error("Deterministic spawner requires a positive interval and positive integer maxPerTick");
  }
  let elapsedMs = 0;
  return Object.freeze({
    advance(deltaMs: number): number {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Spawner delta must be a non-negative finite number");
      elapsedMs += deltaMs;
      const due = Math.floor(elapsedMs / config.intervalMs);
      const emitted = Math.min(due, config.maxPerTick);
      elapsedMs -= emitted * config.intervalMs;
      return emitted;
    },
    get elapsedMs(): number {
      return elapsedMs;
    },
    reset(): void {
      elapsedMs = 0;
    },
  });
}

/** Deterministic projectile state. */
export interface ProjectileState extends KinematicBody {
  /** Time already alive. */
  readonly ageMs: number;
  /** Maximum lifetime. */
  readonly lifetimeMs: number;
}

/** Result of one projectile step. */
export interface ProjectileStep extends ProjectileState {
  /** Whether the projectile remains within lifetime and bounds. */
  readonly active: boolean;
}

/**
 * Advances a projectile and marks it inactive at lifetime or world boundaries.
 * @param projectile Current projectile state.
 * @param deltaMs Deterministic elapsed time.
 * @param bounds World rectangle that retains active projectiles.
 * @returns Next immutable projectile state and active flag.
 */
export function stepProjectile(
  projectile: ProjectileState,
  deltaMs: number,
  bounds: GameplayBounds,
): ProjectileStep {
  if (!Number.isFinite(projectile.ageMs) || !Number.isFinite(projectile.lifetimeMs)
    || projectile.ageMs < 0 || projectile.lifetimeMs <= 0) {
    throw new Error("Projectile age and lifetime must be valid positive time values");
  }
  assertFinite([
    projectile.position.x,
    projectile.position.y,
    projectile.velocity.x,
    projectile.velocity.y,
    deltaMs,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  ], "Projectile step");
  if (deltaMs < 0 || bounds.width <= 0 || bounds.height <= 0) throw new Error("Projectile step received invalid time or bounds");
  const seconds = deltaMs / 1000;
  const body: KinematicBody = {
    position: {
      x: projectile.position.x + projectile.velocity.x * seconds,
      y: projectile.position.y + projectile.velocity.y * seconds,
    },
    velocity: { ...projectile.velocity },
  };
  const ageMs = projectile.ageMs + deltaMs;
  const active = ageMs < projectile.lifetimeMs
    && body.position.x >= bounds.x
    && body.position.y >= bounds.y
    && body.position.x < bounds.x + bounds.width
    && body.position.y < bounds.y + bounds.height;
  return Object.freeze({ ...body, ageMs, lifetimeMs: projectile.lifetimeMs, active });
}
