import { describe, expect, it } from "vitest";
import { activitySchema, createInitialActivityState, reduceActivityEvent } from "../core.js";
import { verifyCheckpointAnswer } from "../server.js";
import { validActivity } from "./fixtures.js";

describe("framework-neutral activity state machine", () => {
  const activity = activitySchema.parse(validActivity);
  const metadata = {
    activityId: "activity.git-commit-demo",
    activityVersion: "1.0.0",
    graphVersion: "codecamp.graph.v1",
    objectiveId: "git.commit.create",
    variantKey: "git-commit.video.v1",
    stepId: "ido.stage-prediction",
    submissionId: "submission.1",
    attemptNumber: 1,
    hintsUsed: 0,
    revealsUsed: 0,
    interventionLevel: 0,
    evidenceConfidence: 1,
    timing: { wallClockMs: 1000, activeMs: 1000 }
  } as const;

  it("normalizes playback, checkpoint, tutorial, support, and completion transitions", () => {
    const events = [
      { ...metadata, eventId: "1", kind: "playback_started", occurredAt: "2026-07-10T00:00:00Z", positionSeconds: 12 },
      { ...metadata, eventId: "2", kind: "watched_range", occurredAt: "2026-07-10T00:00:10Z", startSeconds: 12, endSeconds: 22 },
      { ...metadata, eventId: "3", kind: "checkpoint_answered", occurredAt: "2026-07-10T00:00:11Z", checkpointId: "checkpoint.stage", answer: "stage", verifiedResult: verifyCheckpointAnswer(activity, "checkpoint.stage", "stage") },
      { ...metadata, eventId: "4", kind: "hint_used", occurredAt: "2026-07-10T00:00:12Z", stepId: "wedo.stage", hintId: "hint.stage", hintsUsed: 1 },
      { ...metadata, eventId: "5", kind: "tutorial_step_completed", occurredAt: "2026-07-10T00:00:13Z", stepId: "wedo.stage" },
      { ...metadata, eventId: "6", kind: "activity_completed", occurredAt: "2026-07-10T00:00:14Z" }
    ] as const;
    const state = events.reduce(reduceActivityEvent, createInitialActivityState("activity.git-commit-demo"));
    expect(state).toMatchObject({ playback: "paused", positionSeconds: 22, completed: true });
    expect(state.watchedRanges).toEqual([{ startSeconds: 12, endSeconds: 22 }]);
    expect(state.checkpointAttempts["checkpoint.stage"]).toMatchObject({ attemptNumber: 1, isCorrect: true });
    expect(state.completedStepIds).toEqual(["wedo.stage"]);
    expect(state.support).toEqual({ hintsUsed: 1, revealsUsed: 0, interventionLevel: 0 });
  });

  it("is idempotent by event ID and merges overlapping watched ranges", () => {
    const start = createInitialActivityState("activity.git-commit-demo");
    const first = reduceActivityEvent(start, { ...metadata, eventId: "range", kind: "watched_range", occurredAt: "2026-07-10T00:00:00Z", startSeconds: 0, endSeconds: 10 });
    const duplicate = reduceActivityEvent(first, { ...metadata, eventId: "range", kind: "watched_range", occurredAt: "2026-07-10T00:00:00Z", startSeconds: 0, endSeconds: 10 });
    const merged = reduceActivityEvent(duplicate, { ...metadata, eventId: "range-2", kind: "watched_range", occurredAt: "2026-07-10T00:00:01Z", startSeconds: 8, endSeconds: 14 });
    expect(duplicate).toBe(first);
    expect(merged.watchedRanges).toEqual([{ startSeconds: 0, endSeconds: 14 }]);
  });

  it("rejects client-manufactured correctness and impossible watched ranges", () => {
    expect(() => reduceActivityEvent(createInitialActivityState("activity.git-commit-demo"), {
      ...metadata,
      eventId: "bad-result",
      kind: "checkpoint_answered",
      occurredAt: "2026-07-10T00:00:00Z",
      checkpointId: "checkpoint.stage",
      answer: "stage",
      isCorrect: true
    } as never)).toThrow();
    expect(() => reduceActivityEvent(createInitialActivityState("activity.git-commit-demo"), {
      ...metadata,
      eventId: "bad-range",
      kind: "watched_range",
      occurredAt: "2026-07-10T00:00:00Z",
      startSeconds: 10,
      endSeconds: 5
    })).toThrow();
  });
});
