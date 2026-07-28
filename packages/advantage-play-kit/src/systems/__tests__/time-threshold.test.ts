import { describe, expect, it } from "vitest";

import {
  createCountdownTimer,
  createStopwatchTimer,
  type TimeThresholdTick,
} from "../time-threshold.js";

describe("time and frame loop threshold contract", () => {
  it("counts down remaining time and signals threshold crossing", () => {
    const timer = createCountdownTimer({ durationMs: 1000 });

    const tick1: TimeThresholdTick = timer.tick(200);
    expect(tick1.remainingMs).toBe(800);
    expect(tick1.thresholdCrossed).toBe(false);

    const tick2 = timer.tick(800);
    expect(tick2.remainingMs).toBe(0);
    expect(tick2.thresholdCrossed).toBe(true);
    expect(timer.isTerminal).toBe(true);
  });

  it("stops at zero remaining and signals threshold only once", () => {
    const timer = createCountdownTimer({ durationMs: 500 });

    timer.tick(500);
    const after = timer.tick(500);

    expect(after.remainingMs).toBe(0);
    expect(after.thresholdCrossed).toBe(false);
    expect(timer.isTerminal).toBe(true);
  });

  it("counts up elapsed time and signals threshold crossing", () => {
    const timer = createStopwatchTimer({ durationMs: 1000 });

    const tick1 = timer.tick(400);
    expect(tick1.elapsedMs).toBe(400);
    expect(tick1.thresholdCrossed).toBe(false);

    const tick2 = timer.tick(700);
    expect(tick2.elapsedMs).toBe(1100);
    expect(tick2.thresholdCrossed).toBe(true);
    expect(timer.isTerminal).toBe(true);
  });

  it("rejects negative tick deltas", () => {
    const timer = createCountdownTimer({ durationMs: 1000 });
    expect(() => timer.tick(-1)).toThrow(/negative/i);
  });

  it("rejects a non-positive duration at construction", () => {
    expect(() => createCountdownTimer({ durationMs: 0 })).toThrow(/positive/i);
    expect(() => createStopwatchTimer({ durationMs: -100 })).toThrow(/positive/i);
  });

  it("returns a pure tick result without coupling to game-owned rules", () => {
    const timer = createCountdownTimer({ durationMs: 1000 });
    const result = timer.tick(300);

    expect(Object.isFrozen(result)).toBe(true);
    expect(result.elapsedMs).toBe(300);
    expect(result.remainingMs).toBe(700);
  });

  it("preserves the original duration for diagnostics", () => {
    const timer = createCountdownTimer({ durationMs: 1500 });
    expect(timer.durationMs).toBe(1500);
    timer.tick(500);
    expect(timer.durationMs).toBe(1500);
  });

  it("reset returns a countdown timer to its initial state", () => {
    const timer = createCountdownTimer({ durationMs: 1000 });
    timer.tick(500);
    timer.reset();

    expect(timer.elapsedMs).toBe(0);
    expect(timer.remainingMs).toBe(1000);
    expect(timer.isTerminal).toBe(false);
  });
});
