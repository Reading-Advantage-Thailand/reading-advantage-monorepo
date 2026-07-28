import { describe, expect, it } from "vitest";

import {
  accumulateResult,
  calculateXp,
  createResultAccountant,
  finalizeResult,
  RESULT_ACCOUNTING_ZERO_ATTEMPTS_XP,
  type ResultAccountingPolicy,
} from "../result-accounting.js";

describe("result accounting calculator", () => {
  const policy: ResultAccountingPolicy = {
    xpPerCorrect: 10,
    xpPerAccuracyPoint: 50,
    xpCap: 1000,
    zeroAttemptsXp: 0,
  };

  it("accumulates correct and incorrect attempts into typed counters", () => {
    const counters = createResultAccountant();

    accumulateResult(counters, { correct: true });
    accumulateResult(counters, { correct: false });
    accumulateResult(counters, { correct: true });

    expect(counters.correctAnswers).toBe(2);
    expect(counters.totalAttempts).toBe(3);
    expect(counters.score).toBe(0);
  });

  it("lets games add to the score counter without owning the arithmetic", () => {
    const counters = createResultAccountant();
    counters.addScore(120);
    counters.addScore(30);

    expect(counters.score).toBe(150);
  });

  it("computes accuracy as correct over total with finite arithmetic", () => {
    const counters = createResultAccountant();
    accumulateResult(counters, { correct: true });
    accumulateResult(counters, { correct: true });
    accumulateResult(counters, { correct: false });

    const result = finalizeResult(counters, policy);

    expect(result.correctAnswers).toBe(2);
    expect(result.totalAttempts).toBe(3);
    expect(result.accuracy).toBeCloseTo(2 / 3, 10);
  });

  it("returns zero accuracy and the zero-attempt XP when no attempts were recorded", () => {
    const counters = createResultAccountant();
    const result = finalizeResult(counters, policy);

    expect(result.accuracy).toBe(0);
    expect(result.totalAttempts).toBe(0);
    expect(result.xp).toBe(RESULT_ACCOUNTING_ZERO_ATTEMPTS_XP);
  });

  it("calculates XP from normalized counters plus an explicit game policy", () => {
    expect(calculateXp({ correctAnswers: 4, totalAttempts: 5, accuracy: 0.8 }, policy)).toBe(
      4 * 10 + 0.8 * 50,
    );
  });

  it("respects the optional XP cap", () => {
    expect(
      calculateXp({ correctAnswers: 100, totalAttempts: 100, accuracy: 1 }, policy),
    ).toBe(policy.xpCap);
  });

  it("uses the zero-attempt XP value from the policy", () => {
    const custom: ResultAccountingPolicy = {
      xpPerCorrect: 0,
      xpPerAccuracyPoint: 0,
      zeroAttemptsXp: 5,
    };
    expect(calculateXp({ correctAnswers: 0, totalAttempts: 0, accuracy: 0 }, custom)).toBe(5);
  });

  it("rounds XP down to a nonnegative integer", () => {
    const fractional: ResultAccountingPolicy = {
      xpPerCorrect: 1,
      xpPerAccuracyPoint: 1,
    };
    expect(calculateXp({ correctAnswers: 1, totalAttempts: 3, accuracy: 1 / 3 }, fractional)).toBe(1);
  });

  it("freezes the finalized result so games cannot mutate shared counters after emission", () => {
    const counters = createResultAccountant();
    accumulateResult(counters, { correct: true });
    const result = finalizeResult(counters, policy);

    expect(Object.isFrozen(result)).toBe(true);
  });
});
