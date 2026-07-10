import { describe, expect, it } from "vitest";
import {
  activitySchema,
  createInitialActivityState,
  mapCheckpointAttemptToPractice,
  mapTutorialStepResultToPractice,
  reduceActivityEvent,
  serverVerifiedResultSchema,
} from "../core.js";
import { validateActivity } from "../authoring.js";
import { verifyCheckpointAnswer, verifyTutorialStepResult } from "../server.js";
import { validActivity } from "./fixtures.js";

describe("mastery-integrity boundaries", () => {
  const activity = activitySchema.parse(validActivity);

  it("rejects checkpoint verification bound to a different answer", () => {
    const verificationForStage = verifyCheckpointAnswer(activity, "checkpoint.stage", "stage");
    expect(() => mapCheckpointAttemptToPractice(activity, {
      checkpointId: "checkpoint.stage",
      submissionId: "submission.forged-answer",
      attemptNumber: 1,
      answer: "publish",
      verifiedResult: verificationForStage,
      submittedAt: "2026-07-10T00:01:00Z",
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 1,
      timingMs: 1000,
    })).toThrowError(expect.objectContaining({ code: "VERIFICATION_MISMATCH" }));
  });

  it("runs tutorial checks through a server-owned executor and rejects a forged bundle", () => {
    const serverBundle = verifyTutorialStepResult(activity, "wedo.stage", (check) => check.checkId === "check.staged");
    expect(serverBundle).toMatchObject({
      checkResults: [{ checkId: "check.staged", passed: true }],
      verifiedResult: { source: "server", isCorrect: true },
    });
    expect(() => verifyTutorialStepResult(activity, "wedo.stage", [{ checkId: "check.staged", passed: true }] as never)).toThrow();
    expect(() => mapTutorialStepResultToPractice(activity, {
      stepId: "wedo.stage",
      submissionId: "submission.forged-tutorial",
      attemptNumber: 1,
      checkResults: [{ checkId: "check.staged", passed: false }],
      verifiedResult: serverBundle.verifiedResult,
      submittedAt: "2026-07-10T00:01:00Z",
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 1,
      timingMs: 1000,
    })).toThrowError(expect.objectContaining({ code: "VERIFICATION_MISMATCH" }));
  });

  it("rejects events from another activity before mutating projection state", () => {
    expect(() => reduceActivityEvent(createInitialActivityState(activity.activityId), {
      activityId: "other.activity",
      activityVersion: "1.0.0",
      graphVersion: "codecamp.graph.v1",
      objectiveId: "git.commit.create",
      variantKey: "git-commit.video.v1",
      stepId: "ido.stage-prediction",
      submissionId: "submission.other",
      attemptNumber: 1,
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 1,
      timing: { wallClockMs: 1000, activeMs: 1000 },
      eventId: "event.other",
      kind: "playback_started",
      occurredAt: "2026-07-10T00:00:00Z",
      positionSeconds: 0,
    })).toThrowError(expect.objectContaining({ code: "ACTIVITY_MISMATCH" }));
  });

  it("rejects remediation resource-kind mismatches and repository traversal", () => {
    const mismatch = validateActivity({
      ...validActivity,
      checkpoints: [{
        ...validActivity.checkpoints[0],
        remediation: [{ kind: "diagram", resourceId: "video.commit-demo" }],
      }],
    });
    expect(mismatch).toMatchObject({ ok: false });
    expect(mismatch.issues).toContainEqual(expect.objectContaining({ code: "RESOURCE_KIND_MISMATCH" }));

    const traversal = validateActivity({
      ...validActivity,
      resources: [
        ...validActivity.resources,
        {
          kind: "repository_location",
          resourceId: "repo.escape",
          repositoryId: "tutorial.repo",
          filePath: "../../etc/passwd",
          symbol: null,
          label: { en: "Escape" },
        },
      ],
    });
    expect(traversal).toMatchObject({ ok: false, issues: [{ code: "SCHEMA_INVALID" }] });
  });

  it("rejects contradictory correctness and score before evidence mapping", () => {
    expect(serverVerifiedResultSchema.safeParse({
      source: "server",
      activityId: activity.activityId,
      subjectId: "checkpoint.stage",
      inputDigest: "deadbeef",
      isCorrect: false,
      score: 1,
    }).success).toBe(false);
  });
});
