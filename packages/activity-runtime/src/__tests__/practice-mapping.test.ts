import { practiceSubmissionEnvelopeSchema } from "@reading-advantage/practice-core/contract";
import { describe, expect, it } from "vitest";
import { mapEngagementContext } from "../core.js";
import { activitySchema } from "../core.js";
import { assessCheckpointAttempt, assessTutorialStep, checkpointAssessmentInputSchema } from "../server.js";
import { validActivity } from "./fixtures.js";

describe("practice.v1 evidence mapping", () => {
  it("maps assessed correctness and scaffold context without app translation", () => {
    const activity = activitySchema.parse(validActivity);
    const envelope = assessCheckpointAttempt(activity, {
      eventId: "event.submission.1",
      checkpointId: "checkpoint.stage",
      submissionId: "submission.1",
      attemptNumber: 2,
      answer: "stage",
      submittedAt: "2026-07-10T00:01:00Z",
      hintsUsed: 1,
      revealsUsed: 0,
      interventionLevel: 1,
      evidenceConfidence: 0.8,
      timingMs: 24000
    }).submission;
    expect(practiceSubmissionEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(envelope.parts[0]).toMatchObject({ partId: "ido.stage-prediction", isCorrect: true, hintsUsed: 1, revealStepsSeen: 0 });
    expect(envelope.analytics).toMatchObject({ objectiveId: "git.commit.create", variantKey: "git-commit.checkpoint.v1", submissionId: "submission.1", evidenceConfidence: 0.8, interventionLevel: 1 });
    expect(envelope).toMatchObject({ attemptNumber: 2, timing: { wallClockMs: 24000, activeMs: 24000 } });
  });

  it("rejects a client isCorrect field at the strict evidence boundary", () => {
    expect(checkpointAssessmentInputSchema.safeParse({
      eventId: "event.submission.client",
      checkpointId: "checkpoint.stage",
      submissionId: "submission.client",
      attemptNumber: 1,
      answer: "stage",
      isCorrect: true,
      submittedAt: "2026-07-10T00:01:00Z",
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 1,
      timingMs: 1000
    }).success).toBe(false);
  });

  it("maps a server-verified tutorial step with fading scaffold usage", () => {
    const activity = activitySchema.parse(validActivity);
    const envelope = assessTutorialStep(activity, {
      eventId: "event.tutorial-submission.1",
      stepId: "wedo.stage",
      submissionId: "tutorial-submission.1",
      attemptNumber: 1,
      submittedAt: "2026-07-10T00:02:00Z",
      hintsUsed: 1,
      revealsUsed: 0,
      interventionLevel: 1,
      evidenceConfidence: 0.75,
      timingMs: 30000
    }, () => true).submission;
    expect(practiceSubmissionEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(envelope.parts[0]).toMatchObject({ partId: "wedo.stage", isCorrect: true, hintsUsed: 1, revealStepsSeen: 0 });
    expect(envelope.analytics).toMatchObject({
      schemaVersion: "activity-evidence.v1",
      objectiveId: "git.commit.create",
      variantKey: "git-commit.tutorial.v1",
      stepId: "wedo.stage",
      submissionId: "tutorial-submission.1",
      scaffoldLevel: 2,
      evidenceConfidence: 0.75
    });
  });

  it("keeps watch and resource-open activity contextual with no correctness field", () => {
    const context = mapEngagementContext({
      activityId: "activity.git-commit-demo",
      objectiveId: "git.commit.create",
      variantKey: "git-commit.video.v1",
      watchedRanges: [{ startSeconds: 12, endSeconds: 35 }],
      openedResourceIds: ["diagram.commit-flow"]
    });
    expect(context.kind).toBe("activity_engagement.v1");
    expect(context).not.toHaveProperty("isCorrect");
    expect(context).not.toHaveProperty("score");
  });
});
