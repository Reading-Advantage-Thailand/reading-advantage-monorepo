/** The shared arena helpers of src/apk3d/sim/arena.ts: pure 2D movement on a floor. */
import { describe, expect, it } from 'vitest';
import {
  bouncePatroller,
  circlesTouch,
  clampToBounds,
  clampToCircle,
  clampToRect,
  createRng,
  directionTo,
  distance,
  followLeader,
  headingOf,
  moveToward,
  normalize,
  randomPoint,
  recordPath,
  separateCircles,
  spreadPoints,
  stepMover,
  steerAround,
  velocityAwayFrom,
  type Circle,
  type Rect,
} from '../sim/index.js';

const ROOM: Rect = { minX: -5.5, maxX: 5.5, minZ: -4.5, maxZ: 4.5 };
const CLEARING: Circle = { x: 0, z: 0, r: 7 };

describe('vectors', () => {
  it('normalizes, measures, and points', () => {
    expect(normalize({ x: 3, z: 4 })).toEqual({ x: 0.6, z: 0.8 });
    expect(normalize({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
    expect(distance({ x: 1, z: 1 }, { x: 4, z: 5 })).toBe(5);
    expect(directionTo({ x: 0, z: 0 }, { x: 0, z: 2 })).toEqual({ x: 0, z: 1 });
    expect(headingOf({ x: 0, z: 1 })).toBe(0);
    expect(headingOf({ x: 1, z: 0 })).toBe(90);
    expect(headingOf({ x: 0, z: -1 })).toBe(180);
  });
});

describe('stepping', () => {
  it('moves at speed along a steer of length 1, slower for a shorter steer, never faster', () => {
    expect(stepMover({ x: 0, z: 0 }, { x: 1, z: 0 }, 3, 0.5)).toEqual({ x: 1.5, z: 0 });
    expect(stepMover({ x: 0, z: 0 }, { x: 0.5, z: 0 }, 3, 0.5)).toEqual({ x: 0.75, z: 0 });
    const fast = stepMover({ x: 0, z: 0 }, { x: 3, z: 4 }, 2, 1);
    expect(distance({ x: 0, z: 0 }, fast)).toBeCloseTo(2);
    expect(stepMover({ x: 1, z: 2 }, { x: 0, z: 0 }, 3, 1)).toEqual({ x: 1, z: 2 });
  });

  it('moveToward never overshoots the target', () => {
    expect(moveToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 3)).toEqual({ x: 3, z: 0 });
    expect(moveToward({ x: 0, z: 0 }, { x: 1, z: 0 }, 3)).toEqual({ x: 1, z: 0 });
    expect(moveToward({ x: 2, z: 2 }, { x: 2, z: 2 }, 3)).toEqual({ x: 2, z: 2 });
  });
});

describe('clamping', () => {
  it('keeps a body of radius r inside a rectangle', () => {
    expect(clampToRect({ x: 9, z: -9 }, ROOM, 0.4)).toEqual({ x: 5.1, z: -4.1 });
    expect(clampToRect({ x: 1, z: 1 }, ROOM, 0.4)).toEqual({ x: 1, z: 1 });
  });

  it('keeps a body of radius r inside a circle', () => {
    const p = clampToCircle({ x: 10, z: 0 }, CLEARING, 0.5);
    expect(p).toEqual({ x: 6.5, z: 0 });
    expect(clampToCircle({ x: 1, z: -1 }, CLEARING, 0.5)).toEqual({ x: 1, z: -1 });
    const diag = clampToCircle({ x: 10, z: 10 }, CLEARING, 0);
    expect(distance(diag, CLEARING)).toBeCloseTo(7);
    expect(clampToBounds({ x: 10, z: 10 }, CLEARING)).toEqual(diag);
    expect(clampToBounds({ x: 10, z: 10 }, ROOM)).toEqual({ x: 5.5, z: 4.5 });
  });
});

describe('bouncing', () => {
  it('reflects a patroller off the walls of a rectangle and keeps its speed', () => {
    const m = bouncePatroller({ x: 5, z: 0, vx: 2, vz: 1 }, ROOM, 0.45, 1);
    expect(m.x).toBeCloseTo(5.05);
    expect(m.vx).toBe(-2);
    expect(m.vz).toBe(1);
    const corner = bouncePatroller({ x: -5.3, z: -4.3, vx: -1, vz: -1 }, ROOM, 0.45, 0.5);
    expect(corner).toEqual({ x: -5.05, z: -4.05, vx: 1, vz: 1 });
  });

  it('reflects a patroller off the edge of a circle', () => {
    const m = bouncePatroller({ x: 6.4, z: 0, vx: 2, vz: 0 }, CLEARING, 0.5, 0.1);
    expect(m.x).toBeCloseTo(6.5);
    expect(m.z).toBeCloseTo(0, 5);
    expect(m.vx).toBeCloseTo(-2);
    expect(m.vz).toBeCloseTo(0);
    // A glancing hit keeps the tangential part of the velocity.
    const g = bouncePatroller({ x: 6.4, z: 0, vx: 2, vz: 0.5 }, CLEARING, 0.5, 0.1);
    expect(g.vx).toBeLessThan(0);
    expect(g.vz).toBeGreaterThan(0);
    expect(Math.hypot(g.vx, g.vz)).toBeCloseTo(Math.hypot(2, 0.5));
    // A mover inside the circle just moves.
    expect(bouncePatroller({ x: 0, z: 0, vx: 1, vz: 0 }, CLEARING, 0.5, 0.5)).toEqual({ x: 0.5, z: 0, vx: 1, vz: 0 });
  });

  it('a long patrol stays inside the bounds', () => {
    let m = { x: 1, z: 2, vx: 1.3, vz: -0.7 };
    for (let i = 0; i < 3000; i++) {
      m = bouncePatroller(m, ROOM, 0.45, 1 / 30);
      expect(m.x).toBeGreaterThanOrEqual(ROOM.minX + 0.45 - 1e-9);
      expect(m.x).toBeLessThanOrEqual(ROOM.maxX - 0.45 + 1e-9);
      expect(m.z).toBeGreaterThanOrEqual(ROOM.minZ + 0.45 - 1e-9);
      expect(m.z).toBeLessThanOrEqual(ROOM.maxZ - 0.45 + 1e-9);
    }
    let c = { x: 1, z: 2, vx: 1.3, vz: -0.7 };
    for (let i = 0; i < 3000; i++) {
      c = bouncePatroller(c, CLEARING, 0.6, 1 / 30);
      expect(distance(c, CLEARING)).toBeLessThanOrEqual(7 - 0.6 + 1e-9);
    }
  });

  it('velocityAwayFrom points from the body away from the other, with a fallback when they coincide', () => {
    expect(velocityAwayFrom({ x: 1, z: 0 }, { x: 0, z: 0 }, 2)).toEqual({ x: 2, z: 0 });
    expect(velocityAwayFrom({ x: 0, z: 0 }, { x: 0, z: 0 }, 2, { x: 0, z: -1 })).toEqual({ x: 0, z: -2 });
  });
});

describe('contact', () => {
  it('two circles touch when their centers are closer than the sum of the radii', () => {
    expect(circlesTouch({ x: 0, z: 0 }, 0.4, { x: 0.7, z: 0 }, 0.35)).toBe(true);
    expect(circlesTouch({ x: 0, z: 0 }, 0.4, { x: 0.75, z: 0 }, 0.35)).toBe(false);
    expect(circlesTouch({ x: 0, z: 0 }, 0.4, { x: 0.8, z: 0 }, 0.35)).toBe(false);
  });

  it('separates overlapping bodies by half the overlap each, and leaves the rest alone', () => {
    const out = separateCircles([{ x: 0, z: 0 }, { x: 0.4, z: 0 }, { x: 3, z: 3 }], 1);
    expect(out[0]!.x).toBeCloseTo(-0.3);
    expect(out[1]!.x).toBeCloseTo(0.7);
    expect(out[2]).toEqual({ x: 3, z: 3 });
    expect(distance(out[0]!, out[1]!)).toBeCloseTo(1);
    // The same spot parts along +X; the input is not changed.
    const same = [{ x: 1, z: 1 }, { x: 1, z: 1 }];
    const parted = separateCircles(same, 0.8);
    expect(parted).toEqual([{ x: 0.6, z: 1 }, { x: 1.4, z: 1 }]);
    expect(same).toEqual([{ x: 1, z: 1 }, { x: 1, z: 1 }]);
    expect(separateCircles([], 1)).toEqual([]);
  });
});

describe('seeded spread', () => {
  it('random points stay inside the bounds and the margin', () => {
    const rng = createRng(5);
    for (let i = 0; i < 200; i++) {
      const p = randomPoint(rng, ROOM, 0.5);
      expect(p.x).toBeGreaterThanOrEqual(-5);
      expect(p.x).toBeLessThanOrEqual(5);
      expect(p.z).toBeGreaterThanOrEqual(-4);
      expect(p.z).toBeLessThanOrEqual(4);
      const c = randomPoint(rng, CLEARING, 1);
      expect(distance(c, CLEARING)).toBeLessThanOrEqual(6);
    }
  });

  it('keeps the minimum distance and the keep-out circles, and repeats per seed', () => {
    const keepOut: Circle[] = [{ x: 0, z: 3.5, r: 2 }, { x: 0, z: -4.5, r: 1.5 }];
    const points = spreadPoints(createRng(11), 7, ROOM, { minDistance: 1.6, keepOut, margin: 0.6 });
    expect(points).toHaveLength(7);
    for (let i = 0; i < points.length; i++) {
      for (const c of keepOut) expect(distance(points[i]!, c)).toBeGreaterThanOrEqual(c.r);
      for (let j = i + 1; j < points.length; j++) expect(distance(points[i]!, points[j]!)).toBeGreaterThanOrEqual(1.6);
    }
    expect(spreadPoints(createRng(11), 7, ROOM, { minDistance: 1.6, keepOut, margin: 0.6 })).toEqual(points);
    expect(spreadPoints(createRng(12), 7, ROOM, { minDistance: 1.6, keepOut, margin: 0.6 })).not.toEqual(points);
  });

  it('relaxes the distance when the floor is too small, but still returns every point', () => {
    const points = spreadPoints(createRng(3), 30, { x: 0, z: 0, r: 2 }, { minDistance: 3, tries: 5 });
    expect(points).toHaveLength(30);
    for (const p of points) expect(distance(p, { x: 0, z: 0 })).toBeLessThanOrEqual(2 + 1e-9);
  });
});

describe('follow the leader', () => {
  it('records a path newest first, skipping tiny moves, and trims beyond the max length', () => {
    let path = recordPath([], { x: 0, z: 0 }, 0.1, 3);
    path = recordPath(path, { x: 0.05, z: 0 }, 0.1, 3);
    expect(path).toEqual([{ x: 0, z: 0 }]);
    for (let x = 1; x <= 6; x++) path = recordPath(path, { x, z: 0 }, 0.1, 3);
    expect(path[0]).toEqual({ x: 6, z: 0 });
    // The path holds 3 m of history plus the point that closes it.
    expect(path).toEqual([{ x: 6, z: 0 }, { x: 5, z: 0 }, { x: 4, z: 0 }, { x: 3, z: 0 }]);
  });

  it('places followers spacing apart back along the path, and stacks them on the oldest point', () => {
    const path = [{ x: 5, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 2 }];
    const near = (points: { x: number; z: number }[], want: [number, number][]) => {
      expect(points).toHaveLength(want.length);
      points.forEach((p, i) => {
        expect(p.x).toBeCloseTo(want[i]![0]);
        expect(p.z).toBeCloseTo(want[i]![1]);
      });
    };
    near(followLeader(path, 0.8, 4), [[4.2, 0], [3.4, 0], [3, 0.4], [3, 1.2]]);
    expect(followLeader(path, 0.8, 6).slice(4)).toEqual([{ x: 3, z: 2 }, { x: 3, z: 2 }]);
    expect(followLeader([], 0.8, 2)).toEqual([{ x: 0, z: 0 }, { x: 0, z: 0 }]);
    expect(followLeader([{ x: 1, z: 1 }], 0.8, 1)).toEqual([{ x: 1, z: 1 }]);
    expect(followLeader(path, 0.8, 0)).toEqual([]);
  });
});

describe('simple avoidance', () => {
  it('steers straight with nothing in the way, and around an obstacle on the line', () => {
    expect(steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [], 2)).toEqual({ x: 1, z: 0 });
    // Too far ahead to matter, and behind the mover.
    expect(steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: 4, z: 0, r: 0.5 }], 2)).toEqual({ x: 1, z: 0 });
    expect(steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: -0.8, z: 0, r: 0.5 }], 2)).toEqual({ x: 1, z: 0 });
    // Beside the line, not on it.
    expect(steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: 1, z: 0.6, r: 0.5 }], 2)).toEqual({ x: 1, z: 0 });
    // On the line, a little to +z: pass on the -z side.
    const bent = steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: 1.2, z: 0.1, r: 0.5 }], 2);
    expect(Math.hypot(bent.x, bent.z)).toBeCloseTo(1);
    expect(bent.z).toBeLessThan(-0.3);
    expect(bent.x).toBeGreaterThan(0.5);
    const other = steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: 1.2, z: -0.1, r: 0.5 }], 2);
    expect(other.z).toBeGreaterThan(0.3);
  });

  it('keeps the waypoint inside the bounds, and leads out of an obstacle the mover is in', () => {
    const rect: Rect = { minX: -5, maxX: 5, minZ: -0.5, maxZ: 5 };
    // The shorter detour (-z) leaves the rectangle: take the other side.
    const bounded = steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: 1.2, z: 0.1, r: 0.9 }], 2, rect);
    expect(bounded.z).toBeGreaterThan(0.3);
    const out = steerAround({ x: 0, z: 0 }, { x: 5, z: 0 }, [{ x: 0.2, z: 0.3, r: 0.6 }], 2);
    expect(out.z).toBeLessThan(0); // away from the obstacle center
    expect(out.x).toBeGreaterThan(0); // and still toward the target
  });
});
