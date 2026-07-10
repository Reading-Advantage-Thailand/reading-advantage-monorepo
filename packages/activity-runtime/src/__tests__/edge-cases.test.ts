import { describe, expect, it } from "vitest";
import {
  ActivityContractError,
  activitySchema,
  createInitialActivityState,
  loadActivity,
  mapCheckpointAttemptToPractice,
  mapTutorialStepResultToPractice,
  normalizeActivityAnswer,
  reduceActivityEvent,
  resolveVideoSegment,
  type ActivityEventInput,
} from "../core.js";
import { validateActivity } from "../authoring.js";
import { verifyCheckpointAnswer, verifyTutorialStepResult } from "../server.js";
import { validActivity } from "./fixtures.js";

const metadata = {
  activityId: "activity.git-commit-demo",
  activityVersion: "1.0.0",
  graphVersion: "codecamp.graph.v1",
  objectiveId: "git.commit.create",
  variantKey: "git-commit.video.v1",
  stepId: "ido.stage-prediction",
  submissionId: "submission.edge",
  attemptNumber: 1,
  hintsUsed: 0,
  revealsUsed: 0,
  interventionLevel: 0,
  evidenceConfidence: 0.6,
  timing: { wallClockMs: 1000, activeMs: 800 },
} as const;

function event(input: Omit<ActivityEventInput, keyof typeof metadata> & Partial<typeof metadata>): ActivityEventInput {
  return { ...metadata, ...input } as ActivityEventInput;
}

describe("core contract edge cases", () => {
  it("loads canonical input and reports stable missing-version and invalid-legacy failures", () => {
    expect(loadActivity(validActivity).activityId).toBe("activity.git-commit-demo");
    expect(() => loadActivity({})).toThrowError(ActivityContractError);
    try {
      loadActivity({ schemaVersion: "activity.v0", id: "missing-fields" });
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_LEGACY_ACTIVITY" });
    }
  });

  it("reports missing trusted resources and segments", () => {
    const activity = activitySchema.parse(validActivity);
    expect(() => resolveVideoSegment(activity, "missing", "segment.stage")).toThrow("Video resource not found");
    expect(() => resolveVideoSegment(activity, "video.commit-demo", "missing")).toThrow("Video segment not found");
  });

  it("normalizes arrays, strings, scalar values, empty values, and objects", () => {
    expect(normalizeActivityAnswer([" B ", "a"])).toBe("a|b");
    expect(normalizeActivityAnswer(" YES ")).toBe("yes");
    expect(normalizeActivityAnswer(3)).toBe("3");
    expect(normalizeActivityAnswer(false)).toBe("false");
    expect(normalizeActivityAnswer(null)).toBe("");
    expect(normalizeActivityAnswer({ x: 1 })).toBe('{"x":1}');
  });
});

describe("authoring referential edge cases", () => {
  it("returns schema issues for malformed and unsupported activities", () => {
    expect(validateActivity({ schemaVersion: "activity.v1" })).toMatchObject({ ok: false, issues: [{ code: "SCHEMA_INVALID" }] });
    expect(validateActivity({ schemaVersion: "activity.v7" })).toMatchObject({ ok: false, issues: [{ code: "SCHEMA_INVALID" }] });
  });

  it.each([
    ["dangling transcript", { resources: [{ ...validActivity.resources[0], transcriptResourceId: "missing" }, ...validActivity.resources.slice(1)] }, "DANGLING_RESOURCE"],
    ["dangling accessibility alternative", { accessibility: { ...validActivity.accessibility, nonVideoAlternativeResourceId: "missing" } }, "DANGLING_RESOURCE"],
    ["missing trigger resource", { checkpoints: [{ ...validActivity.checkpoints[0], trigger: { resourceId: "missing", segmentId: "segment.stage" } }] }, "DANGLING_RESOURCE"],
    ["dangling remediation segment", { checkpoints: [{ ...validActivity.checkpoints[0], remediation: [{ kind: "video_segment", resourceId: "video.commit-demo", segmentId: "missing" }] }] }, "DANGLING_SEGMENT"],
    ["invalid correct option", { checkpoints: [{ ...validActivity.checkpoints[0], question: { ...validActivity.checkpoints[0].question, correctOptionIds: ["missing"] } }] }, "INVALID_QUESTION"],
    ["duplicate reveal", { tutorialSteps: [{ ...validActivity.tutorialSteps[0], reveals: [...validActivity.tutorialSteps[0].reveals, validActivity.tutorialSteps[0].reveals[0]] }, validActivity.tutorialSteps[1]] }, "DUPLICATE_ID"]
  ])("finds %s", (_label, override, code) => {
    const result = validateActivity({ ...validActivity, ...override });
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code }));
  });
});

describe("state transition edge cases", () => {
  it("applies pause, seek, resource, reveal, intervention, and duplicate completion transitions", () => {
    const inputs: ActivityEventInput[] = [
      event({ eventId: "pause", kind: "playback_paused", occurredAt: "2026-07-10T00:00:00Z", positionSeconds: 4 }),
      event({ eventId: "seek", kind: "playback_seeked", occurredAt: "2026-07-10T00:00:01Z", positionSeconds: 9 }),
      event({ eventId: "resource", kind: "resource_opened", occurredAt: "2026-07-10T00:00:02Z", resourceId: "diagram.commit-flow" }),
      event({ eventId: "resource-2", kind: "resource_opened", occurredAt: "2026-07-10T00:00:03Z", resourceId: "diagram.commit-flow" }),
      event({ eventId: "reveal", kind: "reveal_used", occurredAt: "2026-07-10T00:00:04Z", stepId: "wedo.stage", revealId: "reveal.command", revealsUsed: 1 }),
      event({ eventId: "intervention", kind: "intervention_used", occurredAt: "2026-07-10T00:00:05Z", level: 2, interventionLevel: 2 }),
      event({ eventId: "complete-step", kind: "tutorial_step_completed", occurredAt: "2026-07-10T00:00:06Z", stepId: "wedo.stage" }),
      event({ eventId: "complete-step-2", kind: "tutorial_step_completed", occurredAt: "2026-07-10T00:00:07Z", stepId: "wedo.stage" })
    ];
    const state = inputs.reduce(reduceActivityEvent, createInitialActivityState("activity.git-commit-demo"));
    expect(state).toMatchObject({ positionSeconds: 9, support: { revealsUsed: 1, interventionLevel: 2 } });
    expect(state.openedResourceIds).toEqual(["diagram.commit-flow"]);
    expect(state.completedStepIds).toEqual(["wedo.stage"]);
  });
});

describe("server verification and practice mapping edge cases", () => {
  const activity = activitySchema.parse(validActivity);
  const baseCheckpointInput = {
    checkpointId: "checkpoint.stage",
    submissionId: "submission.edge",
    attemptNumber: 1,
    answer: "publish",
    submittedAt: "2026-07-10T00:01:00Z",
    hintsUsed: 0,
    revealsUsed: 0,
    interventionLevel: 0,
    evidenceConfidence: 0.4,
    timingMs: 1000,
  } as const;

  it("verifies incorrect choice and free-text answers on the server", () => {
    expect(verifyCheckpointAnswer(activity, "checkpoint.stage", "publish").isCorrect).toBe(false);
    const freeText = activitySchema.parse({
      ...validActivity,
      checkpoints: [{
        ...validActivity.checkpoints[0],
        question: { kind: "free_text", prompt: { en: "Command?" }, acceptedAnswers: ["git add README.md"] }
      }]
    });
    expect(verifyCheckpointAnswer(freeText, "checkpoint.stage", " GIT ADD README.MD ").isCorrect).toBe(true);
    expect(() => verifyCheckpointAnswer(activity, "missing", "answer")).toThrow("Checkpoint not found");
  });

  it("rejects missing or engagement-only checkpoints and maps low-confidence verified scoring", () => {
    expect(() => mapCheckpointAttemptToPractice(activity, { ...baseCheckpointInput, checkpointId: "missing", verifiedResult: { source: "server", isCorrect: false } })).toThrow("Checkpoint not found");
    const engagementOnly = activitySchema.parse({
      ...validActivity,
      checkpoints: [{ ...validActivity.checkpoints[0], evidence: { behavior: "engagement", weight: 0 } }]
    });
    expect(() => mapCheckpointAttemptToPractice(engagementOnly, { ...baseCheckpointInput, verifiedResult: { source: "server", isCorrect: false } })).toThrow("not assessed");
    const envelope = mapCheckpointAttemptToPractice(activity, {
      ...baseCheckpointInput,
      verifiedResult: { source: "server", isCorrect: true, score: 0.5 }
    });
    expect(envelope.parts[0]?.score).toBe(0.25);
    expect(envelope.timing?.confidence).toBe("low");
  });

  it("verifies tutorial omissions, failures, missing steps, and low-confidence mapping", () => {
    expect(() => verifyTutorialStepResult(activity, "missing", [])).toThrow("Tutorial step not found");
    expect(() => verifyTutorialStepResult(activity, "wedo.stage", [])).toThrow("omit");
    const failed = verifyTutorialStepResult(activity, "wedo.stage", [{ checkId: "check.staged", passed: false }]);
    expect(failed).toMatchObject({ isCorrect: false, score: 0 });
    expect(() => mapTutorialStepResultToPractice(activity, {
      stepId: "missing",
      submissionId: "tutorial.missing",
      attemptNumber: 1,
      checkResults: [{ checkId: "missing", passed: false }],
      verifiedResult: failed,
      submittedAt: "2026-07-10T00:02:00Z",
      hintsUsed: 0,
      revealsUsed: 0,
      interventionLevel: 0,
      evidenceConfidence: 0.4,
      timingMs: 1000
    })).toThrow("Tutorial step not found");
    const envelope = mapTutorialStepResultToPractice(activity, {
      stepId: "wedo.stage",
      submissionId: "tutorial.failed",
      attemptNumber: 2,
      checkResults: [{ checkId: "check.staged", passed: false }],
      verifiedResult: failed,
      submittedAt: "2026-07-10T00:02:00Z",
      hintsUsed: 0,
      revealsUsed: 1,
      interventionLevel: 2,
      evidenceConfidence: 0.4,
      timingMs: 1000
    });
    expect(envelope).toMatchObject({ attemptNumber: 2, timing: { confidence: "low" } });
    expect(envelope.parts[0]).toMatchObject({ isCorrect: false, score: 0 });
  });
});
