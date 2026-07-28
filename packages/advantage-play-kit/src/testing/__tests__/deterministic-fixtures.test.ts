import { describe, expect, it } from "vitest";

import {
  createDeterministicClock,
  createDeterministicInputSequence,
  createDeterministicRandom,
  RESPONSIVE_VIEWPORT_FIXTURES,
  WORST_CASE_TEXT_FIXTURES,
} from "../deterministic-fixtures.js";

describe("deterministic test fixtures", () => {
  it("produces a deterministic clock that advances by injected deltas", () => {
    const clock = createDeterministicClock();
    expect(clock.now()).toBe(0);

    clock.advance(16);
    expect(clock.now()).toBe(16);
    clock.advance(50);
    expect(clock.now()).toBe(66);
  });

  it("produces a deterministic RNG that repeats the same sequence for the same seed", () => {
    const rngA = createDeterministicRandom(42);
    const rngB = createDeterministicRandom(42);

    const sequenceA = [rngA(), rngA(), rngA()];
    const sequenceB = [rngB(), rngB(), rngB()];

    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces deterministic input sequences for replay", () => {
    const sequence = createDeterministicInputSequence([
      { modality: "keyboard", code: "ArrowLeft" },
      { modality: "keyboard", code: "Space" },
    ]);

    expect(sequence.next()).toEqual({ modality: "keyboard", code: "ArrowLeft" });
    expect(sequence.next()).toEqual({ modality: "keyboard", code: "Space" });
    expect(sequence.next()).toBeUndefined();
  });

  it("clock reset returns to zero without reallocating", () => {
    const clock = createDeterministicClock();
    clock.advance(100);
    clock.reset();
    expect(clock.now()).toBe(0);
  });

  it("publishes the complete compact/wide viewport and worst-case locale fixture matrices", () => {
    expect(RESPONSIVE_VIEWPORT_FIXTURES).toHaveLength(6);
    expect(RESPONSIVE_VIEWPORT_FIXTURES.map((fixture) => fixture.expectedProfile)).toContain("compact");
    expect(RESPONSIVE_VIEWPORT_FIXTURES.map((fixture) => fixture.expectedProfile)).toContain("wide");
    expect(WORST_CASE_TEXT_FIXTURES.thaiLong).toMatch(/[ก-๙]/u);
    expect(WORST_CASE_TEXT_FIXTURES.enlargedTextScale).toBeGreaterThan(1);
  });
});
