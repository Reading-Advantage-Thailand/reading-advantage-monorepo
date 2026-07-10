import { describe, expect, it } from "vitest";
import { validateActivity } from "../authoring.js";
import { validActivity } from "./fixtures.js";

describe("activity authoring validator", () => {
  it.each([
    ["duplicate resource IDs", { resources: [...validActivity.resources, validActivity.resources[0]] }, "DUPLICATE_ID"],
    ["duplicate step IDs", { tutorialSteps: [...validActivity.tutorialSteps, validActivity.tutorialSteps[0]] }, "DUPLICATE_ID"],
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
});
