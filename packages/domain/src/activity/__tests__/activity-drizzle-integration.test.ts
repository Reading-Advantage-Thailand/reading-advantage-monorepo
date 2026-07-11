import { activitySchema, createActivitySessionRecord } from "@reading-advantage/activity-runtime";
import { assessCheckpointAttempt } from "@reading-advantage/activity-runtime/server";
import { runTutorialStep } from "@reading-advantage/activity-tutorial";
import { codecampAPKUnit, createCodecampAPKTutorialActivity } from "@reading-advantage/codecamp-knowledge/apk-unit";
import { activitySessionEvents, activityTutorialReports, activityTutorialRepositoryStates, codecampExerciseRepos, codecampModules, codecampPrReviews, masteryCards, masteryCommits, masteryEvidence, masteryPrincipals, users } from "@reading-advantage/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { CODECAMP_MASTERY_SCHOOL_ID, DrizzleActivityPersistence } from "../drizzle-activity-persistence.js";
import { DrizzleTutorialReportStore, prepareCodecampTutorialReport, processCodecampTutorialReport, reissueCodecampTutorialReportCredential } from "../tutorial-reporting.js";
import { updatePrReview } from "../../codecamp/pr-reviews.js";

const passingAPKEvaluation = {
  rubricId: "apk.rubric.independent-cartridge" as const,
  dimensions: [
    { dimensionId: "objective" as const, score: 1, evidence: "Educational result mapping test passes." },
    { dimensionId: "contract" as const, score: 1, evidence: "Runtime manifest ABI test passes." },
    { dimensionId: "tests" as const, score: 1, evidence: "Unit and browser checks pass." },
    { dimensionId: "accessibility" as const, score: 1, evidence: "Keyboard and reduced-motion checks pass." },
  ],
  requiredChecks: codecampAPKUnit.youdo.requiredChecks.map((check) => ({ check, passed: true, evidence: `${check} passed in CI.` })),
  totalScore: 1,
};

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

  it("migrates, verifies, persists, projects, and idempotently replays a tutorial report", async () => {
    const tenantDb = harness.tenantDb({ schoolId: null });
    const persistence = new DrizzleActivityPersistence(tenantDb);
    const actor = { learnerId: "codecamp-learner", schoolId: null, tenantKey: "codecamp" } as const;
    const tutorialActivity = createCodecampAPKTutorialActivity("en");
    const sessionId = "00000000-0000-4000-8000-000000000902";
    const validManifest = "export const cartridgeManifest = { id: 'game', title: 'Game', description: 'Guided game', version: '1.0.0', runtimeApiVersion: '1.0.0', inputMode: 'vocabulary', requiredAssetSlots: ['background'], capabilities: ['keyboard'] } as const;";
    const repositoryCapturedAt = new Date(Date.now() - 90_000).toISOString();
    await persistence.createSession(createActivitySessionRecord({ sessionId, actor, activityId: tutorialActivity.activityId, activityVersion: tutorialActivity.activityVersion, startedAt: "2026-07-10T00:00:00Z" }));
    const prepared = await prepareCodecampTutorialReport(tenantDb, actor, { sessionId, submissionId: "submission-apk-1", repositoryId: codecampAPKUnit.wedo.manifest.repositoryId, stepId: "wedo.apk.manifest" }, "integration-tutorial-secret-at-least-32-bytes", {
      capture: async () => ({ files: { "src/cartridge.ts": validManifest, "src/game-state.ts": "export {};", ".env": "must-not-persist" }, gitStatus: "", capturedAt: repositoryCapturedAt.replace("Z", "+00:00") }),
    });
    const reissued = await reissueCodecampTutorialReportCredential(tenantDb, actor, { sessionId, submissionId: "submission-apk-1", repositoryStateId: prepared.repositoryStateId, stepId: "wedo.apk.manifest" }, "integration-tutorial-secret-at-least-32-bytes");
    await expect(reissueCodecampTutorialReportCredential(tenantDb, actor, { sessionId, submissionId: "submission-apk-2", repositoryStateId: prepared.repositoryStateId, stepId: "wedo.apk.manifest" }, "integration-tutorial-secret-at-least-32-bytes")).rejects.toThrow("state not found");
    await expect(reissueCodecampTutorialReportCredential(tenantDb, actor, { sessionId, submissionId: "submission-apk-1", repositoryStateId: prepared.repositoryStateId, stepId: "wedo.apk.other" }, "integration-tutorial-secret-at-least-32-bytes")).rejects.toThrow("session not found");
    const localResult = await runTutorialStep(codecampAPKUnit.wedo.manifest, "wedo.apk.manifest", {
      readAllowedFile: async () => validManifest, runAllowedCommand: async () => "", now: () => "2026-07-10T00:01:00Z",
    });
    const request = { submissionId: "submission-apk-1", credential: reissued.credential, repositoryStateId: prepared.repositoryStateId, localResult };
    const evidenceBefore = await harness.db.select().from(masteryEvidence);
    const first = await processCodecampTutorialReport(tenantDb, actor, request, "integration-tutorial-secret-at-least-32-bytes");
    const replay = await processCodecampTutorialReport(tenantDb, actor, request, "integration-tutorial-secret-at-least-32-bytes");

    expect(first.verified).toMatchObject({ passed: true, sessionId, stepId: "wedo.apk.manifest" });
    expect(first.session.assessedTutorialResults["wedo.apk.manifest"]).toMatchObject({ attemptNumber: 1, isCorrect: true });
    expect(replay).toEqual(first);
    await expect(persistence.getPlatformTeacherSummary(actor.learnerId, sessionId)).resolves.toMatchObject({
      sessionId,
      assessedTutorialResults: { "wedo.apk.manifest": { isCorrect: true } },
    });
    await expect(persistence.getPlatformTeacherSummary("another-learner", sessionId)).resolves.toBeNull();
    expect(await harness.db.select().from(activityTutorialReports)).toHaveLength(1);
    expect(await harness.db.select().from(activityTutorialRepositoryStates)).toEqual([expect.objectContaining({ id: prepared.repositoryStateId, filesJson: expect.not.objectContaining({ ".env": expect.anything() }) })]);
    expect(await harness.db.select().from(masteryEvidence)).toHaveLength(evidenceBefore.length + 1);
  });

  it("serializes concurrent claims and rejects stale lease completion", async () => {
    const tenantDb = harness.tenantDb({ schoolId: null });
    const persistence = new DrizzleActivityPersistence(tenantDb);
    const actor = { learnerId: "codecamp-learner", schoolId: null, tenantKey: "codecamp" } as const;
    const sessionId = "00000000-0000-4000-8000-000000000903";
    const tutorialActivity = createCodecampAPKTutorialActivity("en");
    await persistence.createSession(createActivitySessionRecord({ sessionId, actor, activityId: tutorialActivity.activityId, activityVersion: tutorialActivity.activityVersion, startedAt: "2026-07-10T00:00:00Z" }));
    const store = new DrizzleTutorialReportStore(tenantDb);
    const input = { scopedKey: `codecamp\u0000codecamp-learner\u0000${sessionId}\u0000submission-race`, nonce: "nonce-race-1234567890", requestDigest: "digest-race", expiresAt: "2026-07-10T00:10:00Z", leaseUntil: new Date(Date.now() + 60_000).toISOString() };
    const claims = await Promise.all([store.begin(input), store.begin(input)]);
    expect(claims.map(({ kind }) => kind).sort()).toEqual(["busy", "execute"]);
    const executing = claims.find((claim): claim is Extract<typeof claim, { kind: "execute" }> => claim.kind === "execute");
    if (!executing) throw new Error("Expected an executing claim");
    await store.fail(executing.claimId, new Date(Date.now() - 1_000).toISOString(), "retry");
    const replacement = await store.begin({ ...input, nonce: "nonce-race-2234567890" });
    expect(replacement.kind).toBe("execute");
    await expect(store.complete(executing.claimId, { submissionId: "submission-race", sessionId, activityId: tutorialActivity.activityId, activityVersion: tutorialActivity.activityVersion, graphVersion: tutorialActivity.graphVersion, repositoryId: codecampAPKUnit.wedo.manifest.repositoryId, learnerId: actor.learnerId, tenantKey: actor.tenantKey, stepId: "wedo.apk.manifest", passed: true, checks: [], verifiedAt: new Date().toISOString() })).rejects.toThrow("Unknown tutorial report claim");
  });

  it("projects an approved independent APK pull request into Mastery and FSRS", async () => {
    const tenantDb = harness.tenantDb({ schoolId: null });
    const [module] = await harness.db.insert(codecampModules).values({ title: "APK", description: "APK", slug: "apk-game-creation", order: 999, phase: "D", status: "published" }).returning();
    const [repository] = await harness.db.insert(codecampExerciseRepos).values({ moduleId: module!.id, repoUrl: "https://github.com/example/apk", description: "APK", order: 1 }).returning();
    const [review] = await harness.db.insert(codecampPrReviews).values({ exerciseRepoId: repository!.id, userId: "codecamp-learner", prUrl: "https://github.com/example/apk/pull/1", reviewStatus: "pending" }).returning();

    await expect(updatePrReview({ db: tenantDb, user: { id: "admin", username: "admin", name: "Admin", role: "ADMIN", schoolId: null, xp: 0, level: 1, cefrLevel: "A1" }, tenant: { schoolId: null }, input: { reviewId: review!.id, reviewStatus: "approved" } })).rejects.toThrow();
    await updatePrReview({ db: tenantDb, user: { id: "admin", username: "admin", name: "Admin", role: "ADMIN", schoolId: null, xp: 0, level: 1, cefrLevel: "A1" }, tenant: { schoolId: null }, input: { reviewId: review!.id, reviewStatus: "approved", rubricEvaluation: passingAPKEvaluation } });

    const persistence = new DrizzleActivityPersistence(tenantDb);
    await expect(persistence.getPlatformTeacherSummary("codecamp-learner", review!.id)).resolves.toMatchObject({ assessedCheckpointResults: { "checkpoint.apk.pr-approved": { isCorrect: true } } });
    expect(await harness.db.select().from(masteryEvidence)).toContainEqual(expect.objectContaining({ objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.independent.transfer" }));
    expect(await harness.db.select().from(masteryCards)).toContainEqual(expect.objectContaining({ studentId: "codecamp-learner", objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.independent.transfer" }));
    for (const followUp of codecampAPKUnit.srsFollowUps) expect(await harness.db.select().from(masteryCards)).toContainEqual(expect.objectContaining({ studentId: "codecamp-learner", objectiveId: followUp.objectiveId, variantKey: followUp.variantKey, scheduledDays: followUp.afterDays }));
    expect((await harness.db.select().from(codecampPrReviews).where(eq(codecampPrReviews.id, review!.id)))[0]?.rubricEvaluationJson).toMatchObject({ rubricId: codecampAPKUnit.youdo.rubric.rubricId, totalScore: 1 });
  });
});
