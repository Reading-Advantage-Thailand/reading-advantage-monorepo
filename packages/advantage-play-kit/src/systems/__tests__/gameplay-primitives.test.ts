import { describe, expect, it } from "vitest";

import {
  advanceBody,
  createDeterministicSpawner,
  createObjectPool,
  intersects,
  stepProjectile,
} from "../gameplay-primitives.js";

describe("gameplay primitives", () => {
  it("advances movement deterministically and clamps to bounds", () => {
    expect(advanceBody(
      { position: { x: 9, y: 2 }, velocity: { x: 5, y: -5 } },
      1000,
      { x: 0, y: 0, width: 10, height: 10 },
    )).toEqual({ position: { x: 10, y: 0 }, velocity: { x: 5, y: -5 } });
  });

  it("uses strict AABB intersections so edge contact is not a collision", () => {
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 2, height: 2 })).toBe(false);
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 0, width: 2, height: 2 })).toBe(true);
  });

  it("reuses pooled objects and fails closed at the configured ceiling", () => {
    let id = 0;
    const pool = createObjectPool({ capacity: 1, create: () => ({ id: ++id }), reset: () => undefined });
    const first = pool.acquire();
    expect(() => pool.acquire()).toThrow(/capacity/i);
    pool.release(first);
    expect(pool.acquire()).toBe(first);
    pool.clear();
    expect(pool.activeCount).toBe(0);
    expect(pool.allocatedCount).toBe(1);
    expect(() => pool.release(first)).toThrow(/active owned/i);
  });

  it("spawns on deterministic thresholds without depending on wall-clock time", () => {
    const spawner = createDeterministicSpawner({ intervalMs: 100, maxPerTick: 2 });
    expect(spawner.advance(99)).toBe(0);
    expect(spawner.advance(251)).toBe(2);
    expect(spawner.elapsedMs).toBe(150);
    spawner.reset();
    expect(spawner.elapsedMs).toBe(0);
  });

  it("expires projectiles by lifetime or world bounds", () => {
    expect(stepProjectile({ position: { x: 0, y: 0 }, velocity: { x: 10, y: 0 }, ageMs: 0, lifetimeMs: 500 }, 100, { x: 0, y: 0, width: 100, height: 100 }).active).toBe(true);
    expect(stepProjectile({ position: { x: 99, y: 0 }, velocity: { x: 10, y: 0 }, ageMs: 0, lifetimeMs: 500 }, 200, { x: 0, y: 0, width: 100, height: 100 }).active).toBe(false);
  });

  it("fails closed for invalid movement, pool, spawn, and projectile configuration", () => {
    expect(() => advanceBody({ position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }, -1, { x: 0, y: 0, width: 1, height: 1 })).toThrow(/negative/i);
    expect(() => createObjectPool({ capacity: 0, create: () => ({}), reset: () => undefined })).toThrow(/capacity/i);
    expect(() => createDeterministicSpawner({ intervalMs: 0, maxPerTick: 1 })).toThrow(/positive/i);
    expect(() => stepProjectile({ position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, ageMs: 0, lifetimeMs: 0 }, 1, { x: 0, y: 0, width: 1, height: 1 })).toThrow(/lifetime/i);
  });
});
