import { activitySchema } from "@reading-advantage/activity-runtime";
import { assessCheckpointAttempt } from "@reading-advantage/activity-runtime/server";
import { describe, expect, it } from "vitest";
import { createInMemoryMasteryPersistence } from "../../mastery/in-memory-mastery-persistence.js";
import { projectActivitySubmissionToMastery } from "../activity-mastery-projection.js";

const schoolId = "11111111-1111-4111-8111-111111111111";
const now = "2026-07-10T01:00:00.000Z";
const activity = activitySchema.parse({
  schemaVersion: "activity.v1", activityId: "activity.mastery", activityVersion: "1.0.0",
  graphVersion: "graph.v1", objectiveId: "objective.git", variantKey: "git.stage.v1",
  mode: "guided_practice", title: { en: "Mastery bridge" },
  accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.flow" },
  resources: [
    { kind: "video", resourceId: "video.stage", provider: "youtube", videoId: "video", captionsAvailable: true, transcriptResourceId: "transcript.stage", segments: [{ segmentId: "segment.stage", label: { en: "Stage" }, startSeconds: 0, endSeconds: 10 }] },
    { kind: "transcript", resourceId: "transcript.stage", language: "en", text: "Stage files." },
    { kind: "diagram", resourceId: "diagram.flow", assetId: "asset.flow", alt: { en: "Flow" } },
  ],
  checkpoints: [{ checkpointId: "checkpoint.stage", stepId: "step.stage", objectiveId: "objective.git", variantKey: "git.stage.v1", trigger: { resourceId: "video.stage", segmentId: "segment.stage" }, question: { kind: "single_choice", prompt: { en: "Stage?" }, options: [{ optionId: "yes", label: { en: "Yes" } }, { optionId: "no", label: { en: "No" } }], correctOptionIds: ["yes"] }, feedback: { correct: { en: "Correct" }, incorrect: { en: "Retry" } }, remediation: [{ kind: "diagram", resourceId: "diagram.flow" }], evidence: { behavior: "assessed", weight: 0.5 }, gate: "pause_non_blocking" }],
  tutorialSteps: [],
});

describe("activity mastery projection", () => {
  it("commits weighted assessed evidence and replays the same submission idempotently", async () => {
    const assessed = assessCheckpointAttempt(activity, {
      eventId: "event-1", checkpointId: "checkpoint.stage", submissionId: "submission-1",
      attemptNumber: 1, answer: "yes", submittedAt: now, hintsUsed: 0, revealsUsed: 0,
      interventionLevel: 0, evidenceConfidence: 0.9, timingMs: 1000,
    });
    const persistence = createInMemoryMasteryPersistence();
    await expect(projectActivitySubmissionToMastery(schoolId, "student-1", assessed.submission, persistence, now)).resolves.toMatchObject({ status: "applied" });
    await expect(projectActivitySubmissionToMastery(schoolId, "student-1", assessed.submission, persistence, now)).resolves.toMatchObject({ status: "replayed" });
    const snapshot = await persistence.readSnapshot({ schoolId });
    expect(snapshot.evidence).toHaveLength(1);
    expect(snapshot.evidence[0]).toMatchObject({ sourceId: "submission-1", correctedStrength: 1, practiceCoverage: 0.5, confidence: 0.9 });
    expect(snapshot.commits).toHaveLength(1);
  });
});
