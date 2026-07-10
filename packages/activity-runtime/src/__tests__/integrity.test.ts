import { describe, expect, it, vi } from "vitest";
import * as core from "../core.js";
import * as server from "../server.js";
import { validateActivity } from "../authoring.js";
import { validActivity } from "./fixtures.js";

describe("mastery-integrity boundaries", () => {
  const activity = core.activitySchema.parse(validActivity);
  const checkpointInput = {
    eventId: "event.checkpoint.integrity",
    checkpointId: "checkpoint.stage",
    submissionId: "submission.integrity",
    attemptNumber: 1,
    answer: "stage",
    submittedAt: "2026-07-10T00:01:00Z",
    hintsUsed: 0,
    revealsUsed: 0,
    interventionLevel: 0,
    evidenceConfidence: 1,
    timingMs: 1000,
  } as const;
  const tutorialInput = {
    eventId: "event.tutorial.integrity",
    stepId: "wedo.stage",
    submissionId: "tutorial.integrity",
    attemptNumber: 1,
    submittedAt: "2026-07-10T00:02:00Z",
    hintsUsed: 0,
    revealsUsed: 0,
    interventionLevel: 0,
    evidenceConfidence: 1,
    timingMs: 1000,
  } as const;

  it("does not export unsafe verification constructors or raw mappers", () => {
    for (const name of [
      "createVerificationDigest",
      "serverVerifiedResultSchema",
      "checkpointPracticeInputSchema",
      "tutorialStepPracticeInputSchema",
      "mapCheckpointAttemptToPractice",
      "mapTutorialStepResultToPractice",
    ]) expect(core).not.toHaveProperty(name);
    expect(server).not.toHaveProperty("verifyCheckpointAnswer");
    expect(server).not.toHaveProperty("verifyTutorialStepResult");
  });

  it("executes each authored tutorial check exactly once and rejects caller checkResults", () => {
    const executeCheck = vi.fn(() => true);
    const assessed = server.assessTutorialStep(activity, tutorialInput, executeCheck);
    expect(executeCheck).toHaveBeenCalledTimes(activity.tutorialSteps[0]?.checks.length ?? 0);
    expect(assessed.submission.parts[0]).toMatchObject({ isCorrect: true, score: 1 });
    expect(server.tutorialAssessmentInputSchema.safeParse({
      ...tutorialInput,
      checkResults: [{ checkId: "check.staged", passed: true }],
    }).success).toBe(false);
  });

  it("rejects correctness and verification fields on client submission events", () => {
    const metadata = {
      activityId: activity.activityId,
      activityVersion: activity.activityVersion,
      graphVersion: activity.graphVersion,
      objectiveId: activity.objectiveId,
      variantKey: activity.variantKey,
      stepId: "ido.stage-prediction",
      submissionId: "submission.client",
      attemptNumber: 1,
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 1,
      timing: { wallClockMs: 1000, activeMs: 1000 },
      eventId: "event.client",
      kind: "checkpoint_answered",
      occurredAt: "2026-07-10T00:00:00Z",
      checkpointId: "checkpoint.stage",
      answer: "stage",
    } as const;
    expect(core.activityEventSchema.parse(metadata)).not.toHaveProperty("isCorrect");
    expect(core.activityEventSchema.safeParse({ ...metadata, isCorrect: true }).success).toBe(false);
    expect(core.activityEventSchema.safeParse({ ...metadata, verifiedResult: {} }).success).toBe(false);
  });

  it("atomically binds practice submissions and assessed persistence events", () => {
    const checkpoint = server.assessCheckpointAttempt(activity, checkpointInput);
    expect(checkpoint.submission.analytics).toMatchObject({
      activityId: checkpoint.event.activityId,
      submissionId: checkpoint.event.submissionId,
      attemptNumber: checkpoint.event.attemptNumber,
    });
    expect(checkpoint.event).toMatchObject({
      kind: "checkpoint_answered",
      payload: { checkpointId: "checkpoint.stage", verifiedResult: { isCorrect: true } },
    });
    expect(core.activityEvidenceEventSchema.parse(checkpoint.event)).toEqual(checkpoint.event);
  });

  it("round-trips assessed JSON and replays identical correctness idempotently", () => {
    const assessed = server.assessTutorialStep(activity, tutorialInput, () => true);
    const serialized = JSON.parse(JSON.stringify(assessed.event)) as unknown;
    const direct = core.reduceAssessedActivityEvent(core.createInitialActivityState(activity.activityId), assessed.event);
    const replayed = core.reduceAssessedActivityEvent(core.createInitialActivityState(activity.activityId), serialized);
    expect(replayed).toEqual(direct);
    expect(core.reduceAssessedActivityEvent(replayed, serialized)).toBe(replayed);
    expect(replayed.assessedTutorialResults["wedo.stage"]).toMatchObject({ isCorrect: true, score: 1 });
  });

  it("rejects nested assessed verification bound to another activity, answer, or score", () => {
    const assessed = server.assessCheckpointAttempt(activity, checkpointInput);
    const mismatched = JSON.parse(JSON.stringify(assessed.event)) as {
      payload: { answer: unknown; verifiedResult: { activityId: string; isCorrect: boolean; score?: number } };
    };
    mismatched.payload.answer = "publish";
    expect(core.activityEvidenceEventSchema.safeParse(mismatched).success).toBe(false);
    mismatched.payload.answer = "stage";
    mismatched.payload.verifiedResult.activityId = "other.activity";
    expect(core.activityEvidenceEventSchema.safeParse(mismatched).success).toBe(false);
    mismatched.payload.verifiedResult.activityId = activity.activityId;
    mismatched.payload.verifiedResult.isCorrect = false;
    mismatched.payload.verifiedResult.score = 1;
    expect(core.activityEvidenceEventSchema.safeParse(mismatched).success).toBe(false);
  });

  it("rejects remediation kind mismatches, traversal, and Windows absolute paths", () => {
    const mismatch = validateActivity({
      ...validActivity,
      checkpoints: [{ ...validActivity.checkpoints[0], remediation: [{ kind: "diagram", resourceId: "video.commit-demo" }] }],
    });
    expect(mismatch.issues).toContainEqual(expect.objectContaining({ code: "RESOURCE_KIND_MISMATCH" }));

    for (const filePath of ["../../etc/passwd", "C:\\Windows\\system.ini", "C:/Windows/system.ini"]) {
      const result = validateActivity({
        ...validActivity,
        resources: [
          ...validActivity.resources,
          {
            kind: "repository_location",
            resourceId: `repo.invalid.${filePath.length}`,
            repositoryId: "tutorial.repo",
            filePath,
            symbol: null,
            label: { en: "Invalid path" },
          },
        ],
      });
      expect(result).toMatchObject({ ok: false, issues: [{ code: "SCHEMA_INVALID" }] });
    }
  });
});
