import { describe, expect, it } from "vitest";
import {
  computeTimingBaseline,
  deriveTimingFeatures,
  mapPracticeToSrsRating,
  practiceSubmissionPartSchema,
} from "../index.js";

describe("production rating evidence flow remediation", () => {
  it("derives a reliable zScore from the versioned timing baseline", () => {
    const baseline = computeTimingBaseline({
      variantKey: "test.variant",
      computedAt: "2026-07-10T00:00:00.000Z",
      timings: [800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250].map(
        (activeMs) => ({ activeMs, confidence: "high" as const }),
      ),
    });
    const features = deriveTimingFeatures(
      {
        startedAt: "2026-07-10T00:00:00.000Z",
        submittedAt: "2026-07-10T00:00:00.700Z",
        wallClockMs: 700,
        activeMs: 700,
        idleMs: 0,
        pauseCount: 0,
        focusLossCount: 0,
        visibilityHiddenCount: 0,
        confidence: "high",
      },
      baseline,
    );
    expect(features.hasReliableTiming).toBe(true);
    expect(features.zScore).toBeLessThanOrEqual(-1);
  });

  it("carries total reveals and misconception severity from validated parts into rating", () => {
    const part = practiceSubmissionPartSchema.parse({
      partId: "part-1",
      rawAnswer: "x",
      isCorrect: true,
      hintsUsed: 0,
      revealStepsSeen: 2,
      totalRevealSteps: 2,
      misconceptionTags: ["fabricated-rule"],
      misconceptionSeverityByTag: { "fabricated-rule": "severe" },
    });
    const result = mapPracticeToSrsRating({
      parts: [part],
      baselineSampleCount: 10,
      timingFeatures: {
        hasReliableTiming: true,
        zScore: -2,
        confidence: "high",
        reasons: [],
      },
    });
    expect(result).toMatchObject({
      rating: "Again",
      misconceptionCapped: true,
    });
    expect(result.reasons).toEqual(
      expect.arrayContaining(["all_steps_revealed", "misconception_severe"]),
    );
  });
});
