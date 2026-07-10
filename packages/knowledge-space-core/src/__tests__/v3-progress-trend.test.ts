import { describe, expect, it } from "vitest";
import * as progressTrendModule from "../progress-trend.js";
import type { ProgressTrendHistory } from "../progress-trend.js";

type ProgressTrend = "improving" | "stable" | "declining" | "unknown";
type ComputeProgressTrend = (
  history: ProgressTrendHistory,
  options: { now: number; windowMs: number; trendThreshold: number },
) => ProgressTrend;

const NOW = Date.parse("2026-07-10T00:00:00.000Z");
const WINDOW_MS = 14 * 24 * 60 * 60 * 1_000;

function compute(history: ProgressTrendHistory): ProgressTrend {
  const candidate = (
    progressTrendModule as unknown as {
      computeProgressTrend?: ComputeProgressTrend;
    }
  ).computeProgressTrend;
  expect(
    candidate,
    "v3 must export computeProgressTrend for the §9.4 projection",
  ).toBeTypeOf("function");
  return candidate!(history, {
    now: NOW,
    windowMs: WINDOW_MS,
    trendThreshold: 3,
  });
}

describe("v3 symmetric progress trend (§9.4)", () => {
  it("treats a decrease smaller than trendThreshold as stable", () => {
    expect(
      compute([
        {
          timestamp: NOW - WINDOW_MS,
          masteredNodeIds: ["a", "b", "c", "d", "e"],
        },
        { timestamp: NOW, masteredNodeIds: ["a", "b", "c"] },
      ]),
    ).toBe("stable");
  });

  it("classifies the exact negative threshold as declining", () => {
    expect(
      compute([
        { timestamp: NOW - WINDOW_MS, masteredNodeIds: ["a", "b", "c", "d"] },
        { timestamp: NOW, masteredNodeIds: ["a"] },
      ]),
    ).toBe("declining");
  });

  it("uses the symmetric positive threshold and reports insufficient history", () => {
    expect(
      compute([
        { timestamp: NOW - WINDOW_MS, masteredNodeIds: ["a"] },
        { timestamp: NOW, masteredNodeIds: ["a", "b", "c", "d"] },
      ]),
    ).toBe("improving");
    expect(compute([{ timestamp: NOW, masteredNodeIds: ["a"] }])).toBe(
      "unknown",
    );
  });
});
