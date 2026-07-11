import { describe, expect, it } from "vitest";
import {
  ActivityPersistenceError,
  appendActivityEventBatch,
  createActivitySessionRecord,
  summarizeActivitySession,
} from "../persistence.js";

const actor = { learnerId: "learner-1", schoolId: "school-1" } as const;
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
  timing: { wallClockMs: 1000, activeMs: 1000 },
} as const;

function event(eventId: string, kind: "watched_range" | "resource_opened", clientSequence: number) {
  const payload = kind === "watched_range"
    ? { ...metadata, eventId, kind, occurredAt: "2026-07-10T00:00:00Z", startSeconds: 0, endSeconds: 10 }
    : { ...metadata, eventId, kind, occurredAt: "2026-07-10T00:00:00Z", resourceId: "diagram.commit-flow" };
  return { clientSequence, event: payload };
}

describe("activity persistence projection", () => {
  it("merges device batches monotonically and ignores duplicate batches", () => {
    const session = createActivitySessionRecord({
      sessionId: "session-1",
      actor,
      activityId: metadata.activityId,
      activityVersion: metadata.activityVersion,
      startedAt: "2026-07-10T00:00:00Z",
    });
    const first = appendActivityEventBatch(session, {
      batchId: "batch-1",
      deviceId: "laptop",
      events: [event("event-1", "watched_range", 1)],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 });
    const duplicate = appendActivityEventBatch(first, {
      batchId: "batch-1",
      deviceId: "laptop",
      events: [event("event-1", "watched_range", 1)],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 });
    const secondDevice = appendActivityEventBatch(duplicate, {
      batchId: "batch-2",
      deviceId: "phone",
      events: [event("event-2", "resource_opened", 1)],
    }, { now: "2026-07-10T00:02:00Z", maxPositionSeconds: 120 });

    expect(duplicate).toBe(first);
    expect(secondDevice.lastEventSequence).toBe(2);
    expect(secondDevice.deviceHighWatermarks).toEqual({ laptop: 1, phone: 1 });
    expect(secondDevice.state.watchedRanges).toEqual([{ startSeconds: 0, endSeconds: 10 }]);
    expect(secondDevice.state.openedResourceIds).toEqual(["diagram.commit-flow"]);
  });

  it("rejects stale reordering, malicious positions, and future timestamps atomically", () => {
    const session = createActivitySessionRecord({
      sessionId: "session-1",
      actor,
      activityId: metadata.activityId,
      activityVersion: metadata.activityVersion,
      startedAt: "2026-07-10T00:00:00Z",
    });
    const accepted = appendActivityEventBatch(session, {
      batchId: "batch-1",
      deviceId: "laptop",
      events: [event("event-1", "watched_range", 2)],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 });

    expect(() => appendActivityEventBatch(accepted, {
      batchId: "batch-stale",
      deviceId: "laptop",
      events: [event("event-stale", "resource_opened", 1)],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 })).toThrow(ActivityPersistenceError);

    expect(() => appendActivityEventBatch(session, {
      batchId: "batch-bad",
      deviceId: "laptop",
      events: [{
        clientSequence: 1,
        event: { ...metadata, eventId: "event-bad", kind: "watched_range", occurredAt: "2026-07-10T00:00:00Z", startSeconds: 0, endSeconds: 121 },
      }],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 })).toThrow("outside the authored media duration");

    expect(() => appendActivityEventBatch(session, {
      batchId: "batch-future",
      deviceId: "laptop",
      events: [{
        clientSequence: 1,
        event: { ...metadata, eventId: "event-future", kind: "resource_opened", occurredAt: "2026-07-10T01:00:00Z", resourceId: "diagram.commit-flow" },
      }],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 })).toThrow("too far in the future");

    expect(session.lastEventSequence).toBe(0);
    expect(session.state.processedEventIds).toEqual([]);
  });

  it("rejects cross-activity batches and summarizes support without inventing correctness", () => {
    const session = createActivitySessionRecord({
      sessionId: "session-1",
      actor,
      activityId: metadata.activityId,
      activityVersion: metadata.activityVersion,
      startedAt: "2026-07-10T00:00:00Z",
    });
    expect(() => appendActivityEventBatch(session, {
      batchId: "batch-wrong-activity",
      deviceId: "laptop",
      events: [{
        clientSequence: 1,
        event: { ...metadata, activityId: "activity.other", eventId: "event-1", kind: "resource_opened", occurredAt: "2026-07-10T00:00:00Z", resourceId: "diagram.commit-flow" },
      }],
    }, { now: "2026-07-10T00:01:00Z", maxPositionSeconds: 120 })).toThrow("does not match session activity");

    expect(summarizeActivitySession(session)).toEqual({
      sessionId: "session-1",
      activityId: metadata.activityId,
      completed: false,
      watchedRanges: [],
      checkpointAttempts: {},
      assessedCheckpointResults: {},
      assessedTutorialResults: {},
      completedStepIds: [],
      openedResourceIds: [],
      unresolvedCheckpointIds: [],
      support: { hintsUsed: 0, revealsUsed: 0, interventionLevel: 0 },
    });
  });
});
