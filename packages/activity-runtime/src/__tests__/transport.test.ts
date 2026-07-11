import { describe, expect, it } from "vitest";
import { activitySchema } from "../core.js";
import { reduceAssessedActivityEvent } from "../core.js";
import { appendActivityEventBatch, type ActivitySessionRecord } from "../persistence.js";
import { createActivityTransportHandlers, type ActivityPersistencePort } from "../transport.js";
import { validActivity } from "./fixtures.js";

const actor = { learnerId: "learner-1", schoolId: "school-1" } as const;
const activity = activitySchema.parse(validActivity);

function memoryPersistence(): ActivityPersistencePort {
  const sessions = new Map<string, ActivitySessionRecord>();
  return {
    async createSession(record) { sessions.set(record.sessionId, record); return record; },
    async appendBatch(requestActor, sessionId, batch, policy) {
      const current = sessions.get(sessionId);
      if (!current || JSON.stringify(current.actor) !== JSON.stringify(requestActor)) throw new Error("Not found");
      const updated = appendActivityEventBatch(current, batch, policy);
      sessions.set(sessionId, updated);
      return updated;
    },
    async getOwnedSession(requestActor, sessionId) {
      const session = sessions.get(sessionId);
      return session && JSON.stringify(session.actor) === JSON.stringify(requestActor) ? session : null;
    },
    async recordAssessment(requestActor, sessionId, result) {
      const current = sessions.get(sessionId);
      if (!current || JSON.stringify(current.actor) !== JSON.stringify(requestActor)) throw new Error("Not found");
      const updated = { ...current, lastEventSequence: current.lastEventSequence + 1, state: reduceAssessedActivityEvent(current.state, result.event), updatedAt: result.event.occurredAt };
      sessions.set(sessionId, updated);
      return updated;
    },
  };
}

describe("activity transport handlers", () => {
  it("binds authenticated identity, authored duration, and owned reads", async () => {
    const persistence = memoryPersistence();
    const handlers = createActivityTransportHandlers({
      activities: { async getActivity(id, version) { return id === activity.activityId && version === activity.activityVersion ? activity : null; } },
      persistence,
      createSessionId: () => "session-1",
      now: () => "2026-07-10T00:01:00Z",
      executeTutorialCheck: () => true,
    });
    await expect(handlers.start(actor, { activityId: activity.activityId, activityVersion: activity.activityVersion })).resolves.toMatchObject({ sessionId: "session-1" });
    await expect(handlers.get({ learnerId: "other", schoolId: "school-1" }, { sessionId: "session-1" })).resolves.toBeNull();
    await expect(handlers.append(actor, {
      sessionId: "session-1",
      batch: {
        batchId: "batch-1", deviceId: "laptop", events: [{ clientSequence: 1, event: {
          activityId: activity.activityId, activityVersion: activity.activityVersion,
          graphVersion: activity.graphVersion, objectiveId: activity.objectiveId,
          variantKey: activity.variantKey, stepId: "ido.stage-prediction", submissionId: "submission-1",
          attemptNumber: 1, hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: 1,
          timing: { wallClockMs: 1000, activeMs: 1000 }, eventId: "event-1", kind: "watched_range",
          occurredAt: "2026-07-10T00:00:30Z", startSeconds: 12, endSeconds: 30,
        }}],
      },
    })).resolves.toMatchObject({ watchedRanges: [{ startSeconds: 12, endSeconds: 30 }] });
    await expect(handlers.assessCheckpoint(actor, {
      sessionId: "session-1",
      attempt: { eventId: "assessment-1", checkpointId: "checkpoint.stage", submissionId: "submission-1", attemptNumber: 1, answer: "stage", submittedAt: "2026-07-10T00:02:00Z", hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: 1, timingMs: 1000 },
    })).resolves.toMatchObject({ isCorrect: true, score: 1, session: { assessedCheckpointResults: { "checkpoint.stage": { isCorrect: true } } } });
  });

  it("rejects unknown activities, oversized positions, and client-owned identity fields", async () => {
    const handlers = createActivityTransportHandlers({
      activities: { async getActivity(id) { return id === activity.activityId ? activity : null; } },
      persistence: memoryPersistence(), createSessionId: () => "session-1", now: () => "2026-07-10T00:01:00Z",
      executeTutorialCheck: () => true,
    });
    await expect(handlers.start(actor, { activityId: "missing", activityVersion: "1" })).rejects.toThrow("Activity not found");
    await expect(handlers.start(actor, { activityId: activity.activityId, activityVersion: activity.activityVersion, learnerId: "attacker" })).rejects.toThrow();
  });
});
