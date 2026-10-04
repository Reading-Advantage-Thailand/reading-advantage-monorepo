/**
 * Pure helpers for 2D movement on a floor (arena games: Dungeon Liberator, Devourer Slime, and
 * later Wizard vs Zombie, Labyrinth). Positions are meters on the XZ plane (`x` to the right,
 * `z` toward the camera). Every function returns new values; none reads time, the DOM, or
 * `Math.random` (the spread takes an `Rng`).
 */
import type { Rng } from './rng.js';

export interface Vec2 {
  x: number;
  z: number;
}

/** A moving thing: a position and a velocity in meters per second. */
export interface Mover extends Vec2 {
  vx: number;
  vz: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Circle extends Vec2 {
  r: number;
}

/** The floor of an arena: a rectangle or a circle. */
export type Bounds = Rect | Circle;

export const isCircle = (bounds: Bounds): bounds is Circle => 'r' in bounds;

// ---------------------------------------------------------------- vectors

export const vec = (x: number, z: number): Vec2 => ({ x, z });

export const length = (v: Vec2): number => Math.hypot(v.x, v.z);

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** The unit vector of `v`, or the zero vector when `v` is (near) zero. */
export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  return len < 1e-9 ? { x: 0, z: 0 } : { x: v.x / len, z: v.z / len };
};

/** The direction from `from` to `to` (a unit vector; zero when they coincide). */
export const directionTo = (from: Vec2, to: Vec2): Vec2 => normalize({ x: to.x - from.x, z: to.z - from.z });

/** A heading in degrees for a direction: 0 faces +Z (the front), 90 faces +X, like a three.js yaw. */
export const headingOf = (dir: Vec2): number => (Math.atan2(dir.x, dir.z) * 180) / Math.PI;

// ---------------------------------------------------------------- stepping

/**
 * Moves `pos` along `steer` at `speed` meters per second for `dtSeconds`. A steer longer than 1
 * counts as 1 (full speed); a shorter steer is a slower walk; zero is a stop.
 */
export function stepMover(pos: Vec2, steer: Vec2, speed: number, dtSeconds: number): Vec2 {
  const len = length(steer);
  if (len < 1e-9) return { x: pos.x, z: pos.z };
  const scale = (len > 1 ? 1 / len : 1) * speed * dtSeconds;
  return { x: pos.x + steer.x * scale, z: pos.z + steer.z * scale };
}

/** Moves `pos` toward `target` by at most `maxDistance`; it never overshoots. */
export function moveToward(pos: Vec2, target: Vec2, maxDistance: number): Vec2 {
  const d = distance(pos, target);
  if (d <= maxDistance || d < 1e-9) return { x: target.x, z: target.z };
  const t = maxDistance / d;
  return { x: pos.x + (target.x - pos.x) * t, z: pos.z + (target.z - pos.z) * t };
}

// ---------------------------------------------------------------- clamping

/** Keeps a body of `radius` inside the rectangle. */
export function clampToRect(pos: Vec2, rect: Rect, radius = 0): Vec2 {
  return {
    x: Math.min(rect.maxX - radius, Math.max(rect.minX + radius, pos.x)),
    z: Math.min(rect.maxZ - radius, Math.max(rect.minZ + radius, pos.z)),
  };
}

/** Keeps a body of `radius` inside the circle. */
export function clampToCircle(pos: Vec2, circle: Circle, radius = 0): Vec2 {
  const limit = Math.max(0, circle.r - radius);
  const dx = pos.x - circle.x;
  const dz = pos.z - circle.z;
  const d = Math.hypot(dx, dz);
  if (d <= limit) return { x: pos.x, z: pos.z };
  const t = limit / d;
  return { x: circle.x + dx * t, z: circle.z + dz * t };
}

export function clampToBounds(pos: Vec2, bounds: Bounds, radius = 0): Vec2 {
  return isCircle(bounds) ? clampToCircle(pos, bounds, radius) : clampToRect(pos, bounds, radius);
}

// ---------------------------------------------------------------- bouncing

/**
 * Moves a patroller by its velocity for `dtSeconds` and bounces it off the bounds: on a wall the
 * position is clamped and the velocity component into the wall is reflected. The speed stays.
 */
export function bouncePatroller(mover: Mover, bounds: Bounds, radius: number, dtSeconds: number): Mover {
  let x = mover.x + mover.vx * dtSeconds;
  let z = mover.z + mover.vz * dtSeconds;
  let vx = mover.vx;
  let vz = mover.vz;
  if (isCircle(bounds)) {
    const limit = Math.max(0, bounds.r - radius);
    const dx = x - bounds.x;
    const dz = z - bounds.z;
    const d = Math.hypot(dx, dz);
    if (d > limit && d > 1e-9) {
      const nx = dx / d;
      const nz = dz / d;
      const out = vx * nx + vz * nz;
      if (out > 0) {
        vx -= 2 * out * nx;
        vz -= 2 * out * nz;
      }
      x = bounds.x + nx * limit;
      z = bounds.z + nz * limit;
    }
  } else {
    if (x < bounds.minX + radius) {
      x = bounds.minX + radius;
      vx = Math.abs(vx);
    } else if (x > bounds.maxX - radius) {
      x = bounds.maxX - radius;
      vx = -Math.abs(vx);
    }
    if (z < bounds.minZ + radius) {
      z = bounds.minZ + radius;
      vz = Math.abs(vz);
    } else if (z > bounds.maxZ - radius) {
      z = bounds.maxZ - radius;
      vz = -Math.abs(vz);
    }
  }
  return { x, z, vx, vz };
}

/** A velocity of `speed` pointing from `from` away from `away` (a bounce off a body). */
export function velocityAwayFrom(from: Vec2, away: Vec2, speed: number, fallback: Vec2 = { x: 0, z: 1 }): Vec2 {
  const dir = directionTo(away, from);
  const unit = length(dir) < 1e-9 ? normalize(fallback) : dir;
  return { x: unit.x * speed, z: unit.z * speed };
}

// ---------------------------------------------------------------- contact

/** True when two circles overlap (a touch): centers closer than the sum of the radii. */
export function circlesTouch(a: Vec2, ra: number, b: Vec2, rb: number): boolean {
  return distance(a, b) < ra + rb;
}

/**
 * Pushes overlapping bodies apart: every pair closer than `minDistance` moves half the overlap
 * each, along the line between them (a pair on the same spot parts along +X). One pass per call;
 * a crowd that calls it every step stays soft. Returns new positions in the input order.
 */
export function separateCircles(bodies: readonly Vec2[], minDistance: number): Vec2[] {
  const out = bodies.map((b) => ({ x: b.x, z: b.z }));
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i]!;
      const b = out[j]!;
      const d = distance(a, b);
      if (d >= minDistance) continue;
      const dir = d < 1e-9 ? { x: 1, z: 0 } : { x: (b.x - a.x) / d, z: (b.z - a.z) / d };
      const push = (minDistance - d) / 2;
      a.x -= dir.x * push;
      a.z -= dir.z * push;
      b.x += dir.x * push;
      b.z += dir.z * push;
    }
  }
  return out;
}

// ---------------------------------------------------------------- seeded spread

export interface SpreadOptions {
  /** Points keep at least this far from each other. */
  minDistance: number;
  /** Points keep out of these circles (a start position, a gate). */
  keepOut?: readonly Circle[];
  /** Points keep this far from the edge of the bounds. */
  margin?: number;
  /** Candidates rolled per point before the minimum distance is relaxed (halved). */
  tries?: number;
}

/** A uniform seeded point inside the bounds, `margin` from the edge. */
export function randomPoint(rng: Rng, bounds: Bounds, margin = 0): Vec2 {
  if (isCircle(bounds)) {
    const r = Math.max(0, bounds.r - margin) * Math.sqrt(rng.next());
    const a = rng.next() * Math.PI * 2;
    return { x: bounds.x + Math.cos(a) * r, z: bounds.z + Math.sin(a) * r };
  }
  const w = Math.max(0, bounds.maxX - bounds.minX - 2 * margin);
  const h = Math.max(0, bounds.maxZ - bounds.minZ - 2 * margin);
  return { x: bounds.minX + margin + rng.next() * w, z: bounds.minZ + margin + rng.next() * h };
}

/**
 * `count` seeded points inside the bounds, at least `minDistance` apart and outside every
 * keep-out circle. When `tries` candidates in a row fail, the minimum distance is halved (and
 * halved again) so the spread always returns `count` points; the keep-out circles always hold
 * unless they cover the whole floor.
 */
export function spreadPoints(rng: Rng, count: number, bounds: Bounds, options: SpreadOptions): Vec2[] {
  const { keepOut = [], margin = 0, tries = 40 } = options;
  const points: Vec2[] = [];
  let minDistance = options.minDistance;
  let failed = 0;
  let guard = 0;
  while (points.length < count && guard < count * tries * 8 + 1000) {
    guard += 1;
    const p = randomPoint(rng, bounds, margin);
    const clear = keepOut.every((c) => distance(p, c) >= c.r);
    const apart = points.every((q) => distance(p, q) >= minDistance);
    if (clear && apart) {
      points.push(p);
      failed = 0;
    } else if (++failed >= tries) {
      minDistance /= 2;
      failed = 0;
    }
  }
  while (points.length < count) points.push(randomPoint(rng, bounds, margin));
  return points;
}

// ---------------------------------------------------------------- follow the leader

/**
 * A leader's recent path: the newest point first. `recordPath` adds `point` when the leader
 * moved at least `minGap` since the newest point and trims the tail beyond `maxLength` meters,
 * so the path never grows without bound. Returns a new array; the input is not changed.
 */
export function recordPath(path: readonly Vec2[], point: Vec2, minGap: number, maxLength: number): Vec2[] {
  const head = path[0];
  if (head && distance(head, point) < minGap) return path.slice();
  const out: Vec2[] = [{ x: point.x, z: point.z }];
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    total += distance(out[out.length - 1]!, p);
    out.push(p);
    if (total >= maxLength) break;
  }
  return out;
}

/**
 * `count` positions along the path, `spacing` meters apart, measured back from the newest point:
 * follower `i` sits `(i + 1) * spacing` behind the leader. Beyond the end of the path, the
 * followers stack on the oldest point.
 */
export function followLeader(path: readonly Vec2[], spacing: number, count: number): Vec2[] {
  const out: Vec2[] = [];
  if (count <= 0) return out;
  const oldest = path[path.length - 1] ?? { x: 0, z: 0 };
  let seg = 0;
  let walked = 0; // path length up to the start of segment `seg`
  for (let i = 0; i < count; i++) {
    const want = (i + 1) * spacing;
    while (seg < path.length - 1 && walked + distance(path[seg]!, path[seg + 1]!) < want) {
      walked += distance(path[seg]!, path[seg + 1]!);
      seg += 1;
    }
    if (seg >= path.length - 1) {
      out.push({ x: oldest.x, z: oldest.z });
      continue;
    }
    const a = path[seg]!;
    const b = path[seg + 1]!;
    const segLen = distance(a, b);
    const t = segLen < 1e-9 ? 0 : (want - walked) / segLen;
    out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }
  return out;
}

// ---------------------------------------------------------------- simple avoidance

/**
 * A steer of length 1 from `pos` toward `target` that goes around the first obstacle on the
 * straight line within `lookAhead` meters: the steer points at a waypoint beside that obstacle,
 * on the side that needs the smaller detour (or the side that stays inside `bounds`, when
 * given, and the side whose waypoint is clear of the other obstacles). Inside an obstacle, the
 * steer leads out of it toward the target. The way to the waypoint is checked the same way,
 * `depth` obstacles deep. Bots use it; it is not a path planner.
 */
export function steerAround(
  pos: Vec2,
  target: Vec2,
  obstacles: readonly Circle[],
  lookAhead: number,
  bounds?: Bounds,
  depth = 4,
): Vec2 {
  const desired = directionTo(pos, target);
  const reach = Math.min(lookAhead, distance(pos, target));
  if (length(desired) < 1e-9) return desired;
  const inside = obstacles.find((o) => distance(pos, o) < o.r);
  if (inside) {
    const out = directionTo(inside, pos);
    const away = length(out) < 1e-9 ? { x: -desired.z, z: desired.x } : out;
    const escape = normalize({ x: desired.x + away.x * 1.5, z: desired.z + away.z * 1.5 });
    if (depth <= 1) return escape;
    const others = obstacles.filter((o) => o !== inside);
    const exit = { x: pos.x + escape.x * lookAhead, z: pos.z + escape.z * lookAhead };
    return steerAround(pos, exit, others, lookAhead, bounds, depth - 1);
  }
  // The first obstacle whose circle crosses the segment ahead.
  let block: Circle | null = null;
  let blockAt = Infinity;
  let blockSide = 0;
  for (const o of obstacles) {
    const dx = o.x - pos.x;
    const dz = o.z - pos.z;
    const along = dx * desired.x + dz * desired.z;
    const across = dx * desired.z - dz * desired.x; // > 0: the obstacle is on the right of the ray
    // Only an obstacle whose center is ahead can block; one behind (or around) the mover is
    // the `inside` case above or already passed.
    if (along <= 0 || along - o.r >= reach) continue;
    if (Math.abs(across) >= o.r) continue;
    if (along < blockAt) {
      block = o;
      blockAt = along;
      blockSide = across;
    }
  }
  if (!block) return desired;
  const margin = 0.15;
  const left = { x: -desired.z, z: desired.x };
  const wayLeft = { x: block.x + left.x * (block.r + margin), z: block.z + left.z * (block.r + margin) };
  const wayRight = { x: block.x - left.x * (block.r + margin), z: block.z - left.z * (block.r + margin) };
  const blocked = block;
  const fits = (p: Vec2): boolean =>
    (bounds === undefined || distance(clampToBounds(p, bounds), p) < 1e-6) &&
    obstacles.every((o) => o === blocked || distance(p, o) >= o.r);
  // The obstacle sits to the right of the ray: pass on the left (the smaller detour).
  const first = blockSide > 0 ? wayLeft : wayRight;
  const second = blockSide > 0 ? wayRight : wayLeft;
  const way = fits(first) ? first : fits(second) ? second : first;
  // The way to the waypoint may cross another obstacle: bend around that one too.
  const steer =
    depth > 1
      ? steerAround(pos, way, obstacles.filter((o) => o !== blocked), lookAhead, bounds, depth - 1)
      : directionTo(pos, way);
  return length(steer) < 1e-9 ? desired : steer;
}
