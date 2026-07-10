import { describe, expect, it } from "vitest";
import * as proficiencyModule from "../srs/srs-proficiency.js";

type Attempt = { isCorrect: boolean; positionsAgo: number };
type CorrectedRetention = (
  attempts: Attempt[],
  options: { guessFloor: number },
) => number;
type CapConfidence = (
  confidence: "none" | "low" | "medium" | "high",
  attemptCount: number,
) => "none" | "low" | "medium" | "high";

function corrected(attempts: Attempt[], guessFloor: number): number {
  const candidate = (
    proficiencyModule as unknown as {
      computeCorrectedRetentionStrength?: CorrectedRetention;
    }
  ).computeCorrectedRetentionStrength;
  expect(
    candidate,
    "v3.1 must export recency-weighted Wilson/guess-floor evidence math",
  ).toBeTypeOf("function");
  return candidate!(attempts, { guessFloor });
}

function capped(
  confidence: "none" | "low" | "medium" | "high",
  attemptCount: number,
) {
  const candidate = (
    proficiencyModule as unknown as { capEvidenceConfidence?: CapConfidence }
  ).capEvidenceConfidence;
  expect(
    candidate,
    "v3.1 must export the normative small-sample cap",
  ).toBeTypeOf("function");
  return candidate!(confidence, attemptCount);
}

function attempts(correct: number, total: number): Attempt[] {
  return Array.from({ length: total }, (_, positionsAgo) => ({
    isCorrect: positionsAgo < correct,
    positionsAgo,
  }));
}

describe("v3.1 proficiency evidence math (§13.1-13.2)", () => {
  it("matches the normative 4-option MC and free-response worked examples", () => {
    expect(corrected(attempts(3, 10), 0.25)).toBe(0);
    expect(corrected(attempts(8, 10), 0.25)).toBeCloseTo(0.388, 3);
    expect(corrected(attempts(8, 10), 0)).toBeCloseTo(0.541, 3);
  });

  it("weights the newest six passes above six stale failures", () => {
    const history = Array.from({ length: 12 }, (_, positionsAgo) => ({
      isCorrect: positionsAgo < 6,
      positionsAgo,
    }));
    const recencyWeighted = corrected(history, 0);
    const unweighted = corrected(
      history.map((attempt) => ({ ...attempt, positionsAgo: 0 })),
      0,
    );

    expect(recencyWeighted).toBeGreaterThan(unweighted);
  });

  it("caps perfect small samples below high confidence", () => {
    expect(capped("high", 2)).toBe("low");
    expect(capped("high", 5)).toBe("medium");
    expect(capped("high", 6)).toBe("high");
  });
});
