import { describe, expect, it } from "vitest";
import { validateActivity } from "../authoring.js";
import { validActivity } from "./fixtures.js";

describe("activity authoring validator", () => {
  it.each([
    ["duplicate resource IDs", { resources: [...validActivity.resources, validActivity.resources[0]] }, "DUPLICATE_ID"],
    ["duplicate step IDs", { tutorialSteps: [...validActivity.tutorialSteps, validActivity.tutorialSteps[0]] }, "DUPLICATE_ID"],
    ["duplicate checkpoint IDs", { checkpoints: [...validActivity.checkpoints, validActivity.checkpoints[0]] }, "DUPLICATE_ID"],
    ["duplicate segment IDs", { resources: [{ ...validActivity.resources[0], segments: [...validActivity.resources[0].segments, validActivity.resources[0].segments[0]] }, ...validActivity.resources.slice(1)] }, "DUPLICATE_ID"],
    ["duplicate check IDs", { tutorialSteps: [{ ...validActivity.tutorialSteps[0], checks: [...validActivity.tutorialSteps[0].checks, validActivity.tutorialSteps[0].checks[0]] }, validActivity.tutorialSteps[1]] }, "DUPLICATE_ID"],
    ["duplicate hint IDs", { tutorialSteps: [{ ...validActivity.tutorialSteps[0], hints: [...validActivity.tutorialSteps[0].hints, validActivity.tutorialSteps[0].hints[0]] }, validActivity.tutorialSteps[1]] }, "DUPLICATE_ID"],
    ["duplicate option IDs", { checkpoints: [{ ...validActivity.checkpoints[0], question: { ...validActivity.checkpoints[0].question, options: [...validActivity.checkpoints[0].question.options, validActivity.checkpoints[0].question.options[0]] } }] }, "DUPLICATE_ID"],
    ["dangling remediation", { checkpoints: [{ ...validActivity.checkpoints[0], remediation: [{ kind: "diagram", resourceId: "missing" }] }] }, "DANGLING_RESOURCE"],
    ["dangling trigger segment", { checkpoints: [{ ...validActivity.checkpoints[0], trigger: { resourceId: "video.commit-demo", segmentId: "missing" } }] }, "DANGLING_SEGMENT"],
    ["invalid segment time", { resources: [{ ...validActivity.resources[0], segments: [{ segmentId: "bad", label: { en: "Bad" }, startSeconds: 8, endSeconds: 2 }] }, ...validActivity.resources.slice(1)] }, "INVALID_TIME_RANGE"],
    ["hard-gated YouTube checkpoint", { checkpoints: [{ ...validActivity.checkpoints[0], gate: "answer_before_continue" }] }, "YOUTUBE_HARD_GATE"]
  ])("rejects %s", (_label, override, expectedCode) => {
    const result = validateActivity({ ...validActivity, ...override });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === expectedCode)).toBe(true);
  });

  it("returns a canonical activity when all references and policies are valid", () => {
    const result = validateActivity(validActivity);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.activity.tutorialSteps.map((step) => step.order)).toEqual([1, 2]);
  });

  it("allows hard-gated checkpoints only for approved hosted media", () => {
    const hosted = {
      ...validActivity,
      resources: [
        {
          ...validActivity.resources[0],
          provider: "hosted",
          videoId: undefined,
          assetId: "hosted.commit-demo",
          hardGateApproval: {
            approvalId: "approval.commit-demo.v1",
            approvedBy: "curriculum-owner",
            approvedAt: "2026-07-10T00:00:00Z"
          }
        },
        ...validActivity.resources.slice(1)
      ],
      checkpoints: [{ ...validActivity.checkpoints[0], gate: "answer_before_continue" }]
    };
    const result = validateActivity(hosted);
    expect(result.ok).toBe(true);
  });
});
