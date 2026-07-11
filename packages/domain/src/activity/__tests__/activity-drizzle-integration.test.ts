import { activitySchema, createActivitySessionRecord } from "@reading-advantage/activity-runtime";
import { assessCheckpointAttempt } from "@reading-advantage/activity-runtime/server";
import { activitySessionEvents, masteryCommits, masteryEvidence, masteryPrincipals, users } from "@reading-advantage/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { CODECAMP_MASTERY_SCHOOL_ID, DrizzleActivityPersistence } from "../drizzle-activity-persistence.js";

const activity = activitySchema.parse({
  schemaVersion: "activity.v1", activityId: "activity.codecamp.outbox", activityVersion: "1.0.0", graphVersion: "graph.v1", objectiveId: "objective.apk", variantKey: "apk.v1", mode: "guided_practice", title: { en: "Outbox" }, accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram" },
  resources: [{ kind: "video", resourceId: "video", provider: "youtube", videoId: "video", captionsAvailable: true, transcriptResourceId: "transcript", segments: [{ segmentId: "segment", label: { en: "Segment" }, startSeconds: 0, endSeconds: 10 }] }, { kind: "transcript", resourceId: "transcript", language: "en", text: "Transcript" }, { kind: "diagram", resourceId: "diagram", assetId: "diagram", alt: { en: "Diagram" } }],
  checkpoints: [{ checkpointId: "checkpoint", stepId: "step", objectiveId: "objective.apk", variantKey: "apk.v1", trigger: { resourceId: "video", segmentId: "segment" }, question: { kind: "single_choice", prompt: { en: "Correct?" }, options: [{ optionId: "yes", label: { en: "Yes" } }, { optionId: "no", label: { en: "No" } }], correctOptionIds: ["yes"] }, feedback: { correct: { en: "Correct" }, incorrect: { en: "Retry" } }, remediation: [{ kind: "diagram", resourceId: "diagram" }], evidence: { behavior: "assessed", weight: 0.5 }, gate: "pause_non_blocking" }], tutorialSteps: [],
});

describe("activity Drizzle outbox and Codecamp mastery", () => {
  let harness: TestDb;
  beforeAll(async () => {
    harness = await createTestDb();
    await harness.db.insert(users).values({ id: "codecamp-learner", username: "codecamp-learner", displayUsername: "Codecamp Learner", role: "INTERN", schoolId: null });
  }, 120_000);
  afterAll(async () => harness.close());

  it("projects a platform assessment exactly once and records the durable outbox receipt", async () => {
    const persistence = new DrizzleActivityPersistence(harness.tenantDb({ schoolId: null }));
    const actor = { learnerId: "codecamp-learner", schoolId: null, tenantKey: "codecamp" } as const;
    await persistence.createSession(createActivitySessionRecord({ sessionId: "00000000-0000-4000-8000-000000000901", actor, activityId: activity.activityId, activityVersion: activity.activityVersion, startedAt: "2026-07-10T00:00:00Z" }));
    const result = assessCheckpointAttempt(activity, { eventId: "assessment-1", checkpointId: "checkpoint", submissionId: "submission-1", attemptNumber: 1, answer: "yes", submittedAt: "2026-07-10T00:01:00Z", hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: 0.9, timingMs: 1000 });
    await persistence.recordAssessment(actor, "00000000-0000-4000-8000-000000000901", result);
    await persistence.recordAssessment(actor, "00000000-0000-4000-8000-000000000901", result);

    const [event] = await harness.db.select().from(activitySessionEvents).where(eq(activitySessionEvents.eventId, "assessment-1"));
    expect(event).toMatchObject({ masteryProjectionStatus: "projected", masteryProjectionAttempts: 2 });
    expect(await harness.db.select().from(masteryEvidence)).toHaveLength(1);
    expect(await harness.db.select().from(masteryCommits)).toHaveLength(1);
    expect(await harness.db.select().from(masteryPrincipals)).toContainEqual(expect.objectContaining({ schoolId: CODECAMP_MASTERY_SCHOOL_ID, studentId: "codecamp-learner", sourceTenantKey: "codecamp" }));
  });
});
