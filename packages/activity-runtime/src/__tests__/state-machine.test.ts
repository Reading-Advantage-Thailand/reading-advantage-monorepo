import { describe, expect, it } from "vitest";
import { createInitialActivityState, reduceActivityEvent } from "../core.js";

describe("framework-neutral activity state machine", () => {
  it("normalizes playback, checkpoint, tutorial, support, and completion transitions", () => {
    const events = [
      { eventId: "1", kind: "playback_started", occurredAt: "2026-07-10T00:00:00Z", positionSeconds: 12 },
      { eventId: "2", kind: "watched_range", occurredAt: "2026-07-10T00:00:10Z", startSeconds: 12, endSeconds: 22 },
      { eventId: "3", kind: "checkpoint_answered", occurredAt: "2026-07-10T00:00:11Z", checkpointId: "checkpoint.stage", answer: "stage", isCorrect: true },
      { eventId: "4", kind: "hint_used", occurredAt: "2026-07-10T00:00:12Z", stepId: "wedo.stage", hintId: "hint.stage" },
      { eventId: "5", kind: "tutorial_step_completed", occurredAt: "2026-07-10T00:00:13Z", stepId: "wedo.stage" },
      { eventId: "6", kind: "activity_completed", occurredAt: "2026-07-10T00:00:14Z" }
    ] as const;
    const state = events.reduce(reduceActivityEvent, createInitialActivityState("activity.git-commit-demo"));
    expect(state).toMatchObject({ playback: "paused", positionSeconds: 22, completed: true });
    expect(state.watchedRanges).toEqual([{ startSeconds: 12, endSeconds: 22 }]);
    expect(state.checkpointAttempts["checkpoint.stage"]).toMatchObject({ attemptNumber: 1, isCorrect: true });
    expect(state.completedStepIds).toEqual(["wedo.stage"]);
    expect(state.support).toEqual({ hintsUsed: 1, revealsUsed: 0, interventionLevel: 0 });
  });

  it("is idempotent by event ID and merges overlapping watched ranges", () => {
    const start = createInitialActivityState("activity.one");
    const first = reduceActivityEvent(start, { eventId: "range", kind: "watched_range", occurredAt: "2026-07-10T00:00:00Z", startSeconds: 0, endSeconds: 10 });
    const duplicate = reduceActivityEvent(first, { eventId: "range", kind: "watched_range", occurredAt: "2026-07-10T00:00:00Z", startSeconds: 0, endSeconds: 10 });
    const merged = reduceActivityEvent(duplicate, { eventId: "range-2", kind: "watched_range", occurredAt: "2026-07-10T00:00:01Z", startSeconds: 8, endSeconds: 14 });
    expect(duplicate).toBe(first);
    expect(merged.watchedRanges).toEqual([{ startSeconds: 0, endSeconds: 14 }]);
  });
});
