import { describe, expect, it } from "vitest";
import {
  ActivityContractError,
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
    expect(() => loadActivity({ ...validActivity, schemaVersion: "activity.v9" })).toThrowError(
      new ActivityContractError("UNSUPPORTED_VERSION", "Unsupported activity schema version: activity.v9")
    );
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
      resources: [],
      checkpoints: [],
      tutorialSteps: []
    });
    expect(migrated).toMatchObject({ schemaVersion: "activity.v1", activityId: "legacy.activity", title: { en: "Legacy activity" } });
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
});
