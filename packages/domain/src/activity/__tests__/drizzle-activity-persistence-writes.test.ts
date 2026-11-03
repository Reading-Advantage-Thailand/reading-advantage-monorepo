import { activitySchema, createActivitySessionRecord } from "@reading-advantage/activity-runtime";
import { assessCheckpointAttempt } from "@reading-advantage/activity-runtime/server";
import { activitySessionEvents, activitySessions, schools, users } from "@reading-advantage/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { DrizzleActivityPersistence, retryPendingActivityMasteryProjections } from "../drizzle-activity-persistence.js";

const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_SCHOOL_ID = "22222222-2222-4222-8222-222222222222";
const ACTIVITY_ID = "activity.persistence.writes";
const ACTIVITY_VERSION = "1.0.0";

const metadata = {
  activityId: ACTIVITY_ID,
  activityVersion: ACTIVITY_VERSION,
  graphVersion: "graph.v1",
  objectiveId: "objective.writes",
  variantKey: "writes.v1",
  stepId: "step",
  submissionId: "submission.client",
  attemptNumber: 1,
  hintsUsed: 0,
  revealsUsed: 0,
  interventionLevel: 0,
  evidenceConfidence: 1,
  timing: { wallClockMs: 1000, activeMs: 1000 },
} as const;

const policy = { now: "2026-07-10T01:00:00Z", maxPositionSeconds: 600 };

const activity = activitySchema.parse({
  schemaVersion: "activity.v1", activityId: ACTIVITY_ID, activityVersion: ACTIVITY_VERSION, graphVersion: "graph.v1", objectiveId: "objective.writes", variantKey: "writes.v1", mode: "guided_practice", title: { en: "Writes" }, accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram" },
  resources: [{ kind: "video", resourceId: "video", provider: "youtube", videoId: "video", captionsAvailable: true, transcriptResourceId: "transcript", segments: [{ segmentId: "segment", label: { en: "Segment" }, startSeconds: 0, endSeconds: 10 }] }, { kind: "transcript", resourceId: "transcript", language: "en", text: "Transcript" }, { kind: "diagram", resourceId: "diagram", assetId: "diagram", alt: { en: "Diagram" } }],
  checkpoints: [{ checkpointId: "checkpoint", stepId: "step", objectiveId: "objective.writes", variantKey: "writes.v1", trigger: { resourceId: "video", segmentId: "segment" }, question: { kind: "single_choice", prompt: { en: "Correct?" }, options: [{ optionId: "yes", label: { en: "Yes" } }, { optionId: "no", label: { en: "No" } }], correctOptionIds: ["yes"] }, feedback: { correct: { en: "Correct" }, incorrect: { en: "Retry" } }, remediation: [{ kind: "diagram", resourceId: "diagram" }], evidence: { behavior: "assessed", weight: 0.5 }, gate: "pause_non_blocking" }], tutorialSteps: [],
});

function assessment(eventId: string, answer: string, attemptNumber = 1) {
  return assessCheckpointAttempt(activity, { eventId, checkpointId: "checkpoint", submissionId: `submission-${eventId}`, attemptNumber, answer, submittedAt: "2026-07-10T00:01:00Z", hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: 0.9, timingMs: 1000 });
}

describe("DrizzleActivityPersistence writes", () => {
  let harness: TestDb;
  let persistence: DrizzleActivityPersistence;
  const actor = { learnerId: "learner-1", schoolId: SCHOOL_ID } as const;
  const platformActor = { learnerId: "platform-learner", schoolId: null, tenantKey: "codecamp" } as const;
  let sessionCounter = 0;

  async function newSession(owner: typeof actor | typeof platformActor = actor) {
    sessionCounter += 1;
    const sessionId = `00000000-0000-4000-8000-${String(sessionCounter).padStart(12, "0")}`;
    await persistence.createSession(createActivitySessionRecord({ sessionId, actor: owner, activityId: ACTIVITY_ID, activityVersion: ACTIVITY_VERSION, startedAt: "2026-07-10T00:00:00Z" }));
    return sessionId;
  }

  beforeAll(async () => {
    harness = await createTestDb();
    await harness.db.insert(schools).values([{ id: SCHOOL_ID, name: "School" }, { id: OTHER_SCHOOL_ID, name: "Other" }]);
    await harness.db.insert(users).values([
      { id: "learner-1", username: "learner-1", displayUsername: "Learner", role: "STUDENT", schoolId: SCHOOL_ID },
      { id: "learner-2", username: "learner-2", displayUsername: "Learner 2", role: "STUDENT", schoolId: SCHOOL_ID },
      { id: "platform-learner", username: "platform-learner", displayUsername: "Platform", role: "INTERN", schoolId: null },
    ]);
    persistence = new DrizzleActivityPersistence(harness.tenantDb({ schoolId: SCHOOL_ID }), 30);
  }, 120_000);
  afterAll(async () => harness.close());

  it("creates a school session with the school as tenant key and the retention window", async () => {
    const sessionId = await newSession();
    const [row] = await harness.db.select().from(activitySessions).where(eq(activitySessions.id, sessionId));
    expect(row).toMatchObject({ schoolId: SCHOOL_ID, tenantKey: SCHOOL_ID, learnerId: "learner-1", lastEventSequence: 0, completed: false });
    expect(row!.retainUntil.toISOString()).toBe("2026-08-09T00:00:00.000Z");
    await expect(persistence.getOwnedSession(actor, sessionId)).resolves.toMatchObject({ sessionId, actor, lastEventSequence: 0 });
  });

  it("appends a batch, stores each new event once, and updates the projection", async () => {
    const sessionId = await newSession();
    const updated = await persistence.appendBatch(actor, sessionId, {
      batchId: "batch-1",
      deviceId: "device-1",
      events: [
        { clientSequence: 1, event: { ...metadata, eventId: "e1", kind: "playback_started", occurredAt: "2026-07-10T00:00:01Z", positionSeconds: 5 } },
        { clientSequence: 2, event: { ...metadata, eventId: "e2", kind: "activity_completed", occurredAt: "2026-07-10T00:00:02Z" } },
      ],
    }, policy);

    expect(updated).toMatchObject({ lastEventSequence: 2, processedBatchIds: ["batch-1"], deviceHighWatermarks: { "device-1": 2 } });
    expect(updated.state).toMatchObject({ playback: "paused", positionSeconds: 5, completed: true });
    const events = await harness.db.select().from(activitySessionEvents).where(eq(activitySessionEvents.sessionId, sessionId));
    expect(events.map((event) => [event.eventId, event.serverSequence, event.clientSequence, event.isAssessed]).sort()).toEqual([["e1", 1, 1, false], ["e2", 2, 2, false]]);
    const [row] = await harness.db.select().from(activitySessions).where(eq(activitySessions.id, sessionId));
    expect(row).toMatchObject({ completed: true, lastEventSequence: 2 });
    expect(row!.updatedAt.toISOString()).toBe("2026-07-10T01:00:00.000Z");
  });

  it("returns the stored projection for a replayed batch and writes no new event", async () => {
    const sessionId = await newSession();
    const batch = { batchId: "batch-replay", deviceId: "device-1", events: [{ clientSequence: 1, event: { ...metadata, eventId: "r1", kind: "resource_opened" as const, occurredAt: "2026-07-10T00:00:01Z", resourceId: "diagram" } }] };
    const first = await persistence.appendBatch(actor, sessionId, batch, policy);
    const replay = await persistence.appendBatch(actor, sessionId, batch, policy);
    expect(replay).toEqual(first);
    expect(await harness.db.select().from(activitySessionEvents).where(eq(activitySessionEvents.sessionId, sessionId))).toHaveLength(1);
  });

  it("skips events already processed in a new batch", async () => {
    const sessionId = await newSession();
    const event = { ...metadata, eventId: "dup", kind: "resource_opened" as const, occurredAt: "2026-07-10T00:00:01Z", resourceId: "diagram" };
    await persistence.appendBatch(actor, sessionId, { batchId: "b1", deviceId: "device-1", events: [{ clientSequence: 1, event }] }, policy);
    const second = await persistence.appendBatch(actor, sessionId, { batchId: "b2", deviceId: "device-1", events: [{ clientSequence: 1, event }] }, policy);
    expect(second).toMatchObject({ lastEventSequence: 1, processedBatchIds: ["b1", "b2"] });
    expect(await harness.db.select().from(activitySessionEvents).where(eq(activitySessionEvents.sessionId, sessionId))).toHaveLength(1);
  });

  it("rejects a batch for a session owned by another learner", async () => {
    const sessionId = await newSession();
    const other = { learnerId: "learner-2", schoolId: SCHOOL_ID } as const;
    await expect(persistence.appendBatch(other, sessionId, { batchId: "b", deviceId: "d", events: [{ clientSequence: 1, event: { ...metadata, eventId: "x", kind: "activity_completed", occurredAt: "2026-07-10T00:00:01Z" } }] }, policy))
      .rejects.toThrow(`Activity session not found: ${sessionId}`);
    await expect(persistence.getOwnedSession(other, sessionId)).resolves.toBeNull();
  });

  it("rejects an invalid batch before it opens a transaction", async () => {
    const sessionId = await newSession();
    await expect(persistence.appendBatch(actor, sessionId, { batchId: "", deviceId: "d", events: [] }, policy)).rejects.toThrow();
  });

  it("rejects a stale device sequence and keeps the row unchanged", async () => {
    const sessionId = await newSession();
    await persistence.appendBatch(actor, sessionId, { batchId: "b1", deviceId: "device-1", events: [{ clientSequence: 5, event: { ...metadata, eventId: "s1", kind: "resource_opened", occurredAt: "2026-07-10T00:00:01Z", resourceId: "diagram" } }] }, policy);
    await expect(persistence.appendBatch(actor, sessionId, { batchId: "b2", deviceId: "device-1", events: [{ clientSequence: 3, event: { ...metadata, eventId: "s2", kind: "resource_opened", occurredAt: "2026-07-10T00:00:02Z", resourceId: "video" } }] }, policy))
      .rejects.toThrow("stale sequence");
    const [row] = await harness.db.select().from(activitySessions).where(eq(activitySessions.id, sessionId));
    expect(row!.lastEventSequence).toBe(1);
  });

  it("returns a teacher summary only within the teacher's school", async () => {
    const sessionId = await newSession();
    await expect(persistence.getTeacherSummary(SCHOOL_ID, "learner-1", sessionId, ["checkpoint"])).resolves.toMatchObject({ sessionId, activityId: ACTIVITY_ID, completed: false, unresolvedCheckpointIds: ["checkpoint"] });
    await expect(persistence.getTeacherSummary(OTHER_SCHOOL_ID, "learner-1", sessionId)).resolves.toBeNull();
    await expect(persistence.getTeacherSummary(SCHOOL_ID, "learner-2", sessionId)).resolves.toBeNull();
  });

  it("hides a school session from the platform teacher summary", async () => {
    const sessionId = await newSession();
    await expect(persistence.getPlatformTeacherSummary("learner-1", sessionId)).resolves.toBeNull();
  });

  it("rejects an assessment whose attempt number skips ahead", async () => {
    const sessionId = await newSession(platformActor);
    await expect(persistence.recordAssessment(platformActor, sessionId, assessment("skip", "yes", 2))).rejects.toThrow("Activity assessment attempt must be 1");
  });

  it("rejects an assessment for a missing session", async () => {
    await expect(persistence.recordAssessment(platformActor, "00000000-0000-4000-8000-00000000ffff", assessment("missing", "yes"))).rejects.toThrow("Activity session not found");
  });

  it("rejects a replayed assessment event with a different answer", async () => {
    const sessionId = await newSession(platformActor);
    await persistence.recordAssessment(platformActor, sessionId, assessment("conflict", "yes"));
    await expect(persistence.recordAssessment(platformActor, sessionId, assessment("conflict", "no"))).rejects.toThrow("Activity assessment idempotency conflict: conflict");
  });

  it("counts unparseable outbox rows as failed in the retry worker", async () => {
    const sessionId = await newSession(platformActor);
    await harness.db.insert(activitySessionEvents).values({
      sessionId, tenantKey: "codecamp", learnerId: "platform-learner", eventId: "bad-outbox", batchId: "b", deviceId: "d", clientSequence: 1, serverSequence: 1,
      eventKind: "checkpoint_answered", isAssessed: true, submissionId: "s", submissionJson: { invalid: true }, masteryProjectionStatus: "failed", eventJson: {}, occurredAt: new Date("2026-07-10T00:00:00Z"),
    });
    const result = await retryPendingActivityMasteryProjections(harness.tenantDb({ schoolId: null }), 100);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    const [row] = await harness.db.select().from(activitySessionEvents).where(eq(activitySessionEvents.eventId, "bad-outbox"));
    expect(row).toMatchObject({ masteryProjectionStatus: "failed", masteryProjectionAttempts: 0 });
  });
});
