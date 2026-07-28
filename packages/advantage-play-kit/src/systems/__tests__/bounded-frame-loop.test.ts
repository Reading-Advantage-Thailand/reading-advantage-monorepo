import { describe, expect, it } from "vitest";

import {
  BOUNDED_FRAME_DELTA_CEILING_MS,
  clampFrameDelta,
  createBoundedFrameScheduler,
} from "../bounded-frame-loop.js";

describe("bounded frame delta loop", () => {
  it("pins the 50 millisecond ceiling accepted from babel-architect", () => {
    expect(BOUNDED_FRAME_DELTA_CEILING_MS).toBe(50);
  });

  it("clamps deltas below the ceiling unchanged", () => {
    expect(clampFrameDelta(16)).toBe(16);
    expect(clampFrameDelta(0)).toBe(0);
  });

  it("clamps deltas at or above the ceiling down to the 50 ms ceiling", () => {
    expect(clampFrameDelta(50)).toBe(50);
    expect(clampFrameDelta(120)).toBe(50);
    expect(clampFrameDelta(1000)).toBe(50);
  });

  it("rejects negative deltas rather than treating them as zero", () => {
    expect(() => clampFrameDelta(-5)).toThrow(/negative/i);
  });

  it("passes bounded delta to a transport-independent game callback", () => {
    const received: number[] = [];
    const scheduler = createBoundedFrameScheduler((delta) => {
      received.push(delta);
    });

    scheduler.tick(16);
    scheduler.tick(80);
    scheduler.tick(32);

    expect(received).toEqual([16, 50, 32]);
  });

  it("tracks elapsed frame time without leaking the rAF transport into game code", () => {
    const scheduler = createBoundedFrameScheduler(() => undefined);

    scheduler.tick(16);
    scheduler.tick(16);
    scheduler.tick(80);

    expect(scheduler.elapsedMs).toBe(16 + 16 + 50);
    expect(scheduler.tickCount).toBe(3);
  });

  it("reports the last clamped delta so games can detect stalls", () => {
    const scheduler = createBoundedFrameScheduler(() => undefined);

    scheduler.tick(200);

    expect(scheduler.lastDeltaMs).toBe(50);
    expect(scheduler.lastDeltaWasClamped).toBe(true);
  });

  it("cancels cleanly so game-owned cleanup runs without dangling state", () => {
    const scheduler = createBoundedFrameScheduler(() => undefined);
    scheduler.tick(16);
    scheduler.cancel();

    expect(() => scheduler.tick(16)).toThrow(/cancelled/i);
    expect(scheduler.cancelled).toBe(true);
  });
});
