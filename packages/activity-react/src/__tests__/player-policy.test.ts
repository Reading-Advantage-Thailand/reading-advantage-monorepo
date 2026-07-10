import { describe, expect, it } from "vitest";
import { mergeWatchedRanges, resolveCheckpointPolicy, sampleCueCrossings } from "../controllers.js";

describe("interactive media policies", () => {
  it("never hard-gates YouTube and requires approval for hosted hard gates", () => {
    expect(resolveCheckpointPolicy("youtube", "answer_before_continue", false)).toBe("pause_non_blocking");
    expect(resolveCheckpointPolicy("hosted", "answer_before_continue", false)).toBe("pause_non_blocking");
    expect(resolveCheckpointPolicy("hosted", "answer_before_continue", true)).toBe("answer_before_continue");
  });

  it("merges bounded watched samples without a per-second heartbeat", () => {
    expect(mergeWatchedRanges([
      { startSeconds: 0, endSeconds: 4 },
      { startSeconds: 3, endSeconds: 8 },
      { startSeconds: 12, endSeconds: 15 },
      { startSeconds: 20, endSeconds: 20 }
    ])).toEqual([{ startSeconds: 0, endSeconds: 8 }, { startSeconds: 12, endSeconds: 15 }]);
  });

  it("detects crossed cues during playback and forward seeks exactly once", () => {
    expect(sampleCueCrossings(10, 40, [12, 36, 64])).toEqual([12, 36]);
    expect(sampleCueCrossings(40, 10, [12, 36, 64])).toEqual([]);
  });
});
