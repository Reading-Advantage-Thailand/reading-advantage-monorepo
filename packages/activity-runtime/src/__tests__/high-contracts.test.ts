import { describe, expect, it } from "vitest";
import {
  activityEngagementMetadataSchema,
  activityEvidenceEventSchema,
  activityEvidenceMetadataSchema,
  activityPracticeSubmissionEnvelopeSchema,
  activitySchema,
  mapCheckpointAttemptToPractice,
} from "../core.js";
import { validateActivity } from "../authoring.js";
import { activityActorSchema, verifyCheckpointAnswer } from "../server.js";
import { validActivity } from "./fixtures.js";

describe("high-severity contract closure", () => {
  const activity = activitySchema.parse(validActivity);
  const engagement = {
    activityId: activity.activityId,
    activityVersion: activity.activityVersion,
    graphVersion: activity.graphVersion,
    objectiveId: activity.objectiveId,
    variantKey: activity.variantKey,
  };
  const assessed = {
    ...engagement,
    stepId: "ido.stage-prediction",
    submissionId: "submission.high-contract",
    attemptNumber: 1,
    hintsUsed: 0,
    revealsUsed: 0,
    scaffoldLevel: 0,
    interventionLevel: 0,
    evidenceConfidence: 1,
    timing: { wallClockMs: 1000, activeMs: 1000 },
  };

  it("separates engagement context from assessed-attempt metadata", () => {
    expect(activityEngagementMetadataSchema.parse(engagement)).not.toHaveProperty("submissionId");
    expect(activityEngagementMetadataSchema.safeParse({ ...engagement, submissionId: "not-allowed" }).success).toBe(false);
    expect(activityEvidenceMetadataSchema.safeParse(engagement).success).toBe(false);
    expect(activityEvidenceMetadataSchema.parse(assessed).submissionId).toBe("submission.high-contract");
  });

  it("uses strict kind-discriminated event payloads", () => {
    expect(activityEvidenceEventSchema.parse({
      ...engagement,
      eventId: "event.play",
      kind: "playback_started",
      occurredAt: "2026-07-10T00:00:00Z",
      payload: { positionSeconds: 12 },
    }).kind).toBe("playback_started");
    expect(activityEvidenceEventSchema.safeParse({
      ...engagement,
      eventId: "event.forged",
      kind: "playback_started",
      occurredAt: "2026-07-10T00:00:00Z",
      payload: { positionSeconds: 12, arbitrary: "not accepted" },
    }).success).toBe(false);
  });

  it("exports a strict practice envelope with required activity analytics", () => {
    const envelope = mapCheckpointAttemptToPractice(activity, {
      checkpointId: "checkpoint.stage",
      submissionId: "submission.strict-envelope",
      attemptNumber: 1,
      answer: "stage",
      verifiedResult: verifyCheckpointAnswer(activity, "checkpoint.stage", "stage"),
      submittedAt: "2026-07-10T00:01:00Z",
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 1,
      timingMs: 1000,
    });
    expect(activityPracticeSubmissionEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(activityPracticeSubmissionEnvelopeSchema.safeParse({ ...envelope, analytics: undefined }).success).toBe(false);
  });

  it("supports school and Codecamp actors without accepting an unscoped null tenant", () => {
    expect(activityActorSchema.parse({ learnerId: "learner.1", schoolId: "school.1" })).toEqual({ learnerId: "learner.1", schoolId: "school.1" });
    expect(activityActorSchema.parse({ learnerId: "learner.2", schoolId: null, tenantKey: "codecamp" })).toEqual({ learnerId: "learner.2", schoolId: null, tenantKey: "codecamp" });
    expect(activityActorSchema.safeParse({ learnerId: "learner.3", schoolId: null }).success).toBe(false);
  });

  it("requires accessible media capabilities and correctly typed alternatives", () => {
    const missingCapabilities = validateActivity({
      ...validActivity,
      resources: [{ ...validActivity.resources[0], transcriptResourceId: undefined, captionsAvailable: false }, ...validActivity.resources.slice(1)],
    });
    expect(missingCapabilities.issues.filter((issue) => issue.code === "ACCESSIBILITY_REQUIREMENT")).toHaveLength(2);

    const wrongKinds = validateActivity({
      ...validActivity,
      accessibility: { ...validActivity.accessibility, nonVideoAlternativeResourceId: "video.commit-demo" },
      resources: [{ ...validActivity.resources[0], transcriptResourceId: "diagram.commit-flow" }, ...validActivity.resources.slice(1)],
    });
    expect(wrongKinds.issues.filter((issue) => issue.code === "RESOURCE_KIND_MISMATCH")).toHaveLength(2);
  });

  it("requires approval metadata before a hosted video can hard-gate", () => {
    const result = validateActivity({
      ...validActivity,
      resources: [{ ...validActivity.resources[0], provider: "hosted", videoId: undefined, assetId: "hosted.commit-demo" }, ...validActivity.resources.slice(1)],
      checkpoints: [{ ...validActivity.checkpoints[0], gate: "answer_before_continue" }],
    });
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "HOSTED_HARD_GATE_UNAPPROVED" }));
  });
});
