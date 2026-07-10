import { practiceSubmissionEnvelopeSchema } from "@reading-advantage/practice-core/contract";
import { describe, expect, it } from "vitest";
import { mapCheckpointAttemptToPractice, mapEngagementContext } from "../core.js";
import { activitySchema } from "../core.js";
import { validActivity } from "./fixtures.js";

describe("practice.v1 evidence mapping", () => {
  it("maps assessed correctness and scaffold context without app translation", () => {
    const activity = activitySchema.parse(validActivity);
    const envelope = mapCheckpointAttemptToPractice(activity, {
      checkpointId: "checkpoint.stage",
      submissionId: "submission.1",
      attemptNumber: 2,
      answer: "stage",
      isCorrect: true,
      submittedAt: "2026-07-10T00:01:00Z",
      hintsUsed: 1,
      revealsUsed: 0,
      interventionLevel: 1,
      evidenceConfidence: 0.8,
      timingMs: 24000
    });
    expect(practiceSubmissionEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(envelope.parts[0]).toMatchObject({ partId: "ido.stage-prediction", isCorrect: true, hintsUsed: 1, revealStepsSeen: 0 });
    expect(envelope.analytics).toMatchObject({ objectiveId: "git.commit.create", variantKey: "git-commit.checkpoint.v1", submissionId: "submission.1", evidenceConfidence: 0.8, interventionLevel: 1 });
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
