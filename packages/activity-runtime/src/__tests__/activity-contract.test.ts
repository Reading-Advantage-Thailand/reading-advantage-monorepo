import { describe, expect, it } from "vitest";
import {
  ActivityContractError,
  activityEvidenceEventSchema,
  activityEvidenceMetadataSchema,
  activitySchema,
  loadActivity,
  resourceRefSchema,
  resolveVideoSegment
} from "../core.js";
import { validActivity } from "./fixtures.js";

describe("activity.v1 contract", () => {
  it("validates an explicit bilingual video, checkpoint, tutorial, accessibility, and evidence contract", () => {
    const parsed = activitySchema.parse(validActivity);
    expect(parsed.schemaVersion).toBe("activity.v1");
    expect(parsed.checkpoints[0]?.evidence).toEqual({ behavior: "assessed", weight: 0.5 });
    expect(parsed.accessibility.transcriptRequired).toBe(true);
  });

  it("rejects unknown versions with an actionable error", () => {
    try {
      loadActivity({ ...validActivity, schemaVersion: "activity.v9" });
      throw new Error("expected loadActivity to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ActivityContractError);
      expect(error).toMatchObject({ code: "UNSUPPORTED_VERSION", message: "Unsupported activity schema version: activity.v9" });
    }
  });

  it("migrates the bounded activity.v0 shape and rejects other legacy input", () => {
    const migrated = loadActivity({
      schemaVersion: "activity.v0",
      id: "legacy.activity",
      version: "1",
      graphVersion: "graph.v1",
      objectiveId: "objective.legacy",
      variantKey: "legacy.v1",
      mode: "teaching",
      title: "Legacy activity",
      resources: [{
        kind: "video",
        resourceId: "video.legacy",
        provider: "hosted",
        assetId: "legacy-video-asset",
        segments: [{ segmentId: "legacy.intro", label: { en: "Introduction" }, startSeconds: 0, endSeconds: 10 }]
      }],
      checkpoints: [],
      tutorialSteps: []
    });
    expect(migrated).toMatchObject({
      schemaVersion: "activity.v1",
      activityId: "legacy.activity",
      title: { en: "Legacy activity" },
      resources: [{ resourceId: "video.legacy", provider: "hosted", assetId: "legacy-video-asset" }]
    });
    expect(() => loadActivity({ schemaVersion: "activity.v0", id: "incomplete" })).toThrow(ActivityContractError);
  });

  it("resolves authoritative timestamps only from trusted resource and segment IDs", () => {
    const activity = activitySchema.parse(validActivity);
    expect(resolveVideoSegment(activity, "video.commit-demo", "segment.stage")).toEqual({
      resourceId: "video.commit-demo",
      segmentId: "segment.stage",
      startSeconds: 12,
      endSeconds: 35,
      label: { en: "Stage files" }
    });
    expect(resourceRefSchema.safeParse({ kind: "video_segment", segmentId: "segment.stage", startSeconds: 999 }).success).toBe(false);
    expect(resourceRefSchema.safeParse({ kind: "repository_location", filePath: "/etc/passwd" }).success).toBe(false);
  });

  it("strictly rejects unknown contract keys at root and nested boundaries", () => {
    expect(activitySchema.safeParse({ ...validActivity, hallucinatedPath: "/tmp/nope" }).success).toBe(false);
    expect(activitySchema.safeParse({
      ...validActivity,
      resources: [{ ...validActivity.resources[0], providerUrl: "https://untrusted.invalid" }, ...validActivity.resources.slice(1)]
    }).success).toBe(false);
  });

  it("requires complete versioned evidence metadata and bounded event context", () => {
    const metadata = activityEvidenceMetadataSchema.parse({
      schemaVersion: "activity-evidence.v1",
      activityId: "activity.git-commit-demo",
      activityVersion: "1.0.0",
      graphVersion: "codecamp.graph.v1",
      objectiveId: "git.commit.create",
      variantKey: "git-commit.checkpoint.v1",
      stepId: "ido.stage-prediction",
      submissionId: "submission.1",
      attemptNumber: 2,
      hintsUsed: 1,
      revealsUsed: 0,
      interventionLevel: 1,
      evidenceConfidence: 0.8,
      timing: { wallClockMs: 24000, activeMs: 22000 }
    });
    expect(metadata.attemptNumber).toBe(2);
    expect(activityEvidenceMetadataSchema.safeParse({ ...metadata, objectiveId: undefined }).success).toBe(false);
    expect(activityEvidenceEventSchema.parse({
      ...metadata,
      eventId: "event.1",
      kind: "checkpoint_answered",
      occurredAt: "2026-07-10T00:01:00Z",
      payload: { checkpointId: "checkpoint.stage", answer: "stage" }
    }).submissionId).toBe("submission.1");
  });
});
