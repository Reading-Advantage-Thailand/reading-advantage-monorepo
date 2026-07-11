import { describe, expect, it, vi } from "vitest";
import { activitySchema } from "../core.js";
import { assessAndRecordCheckpoint, assessAndRecordTutorialStep } from "../server.js";
import { validActivity } from "./fixtures.js";

const actor = { learnerId: "learner-1", schoolId: "school-1" } as const;
const base = {
  eventId: "event-1",
  submissionId: "submission-1",
  attemptNumber: 1,
  submittedAt: "2026-07-10T00:00:00Z",
  hintsUsed: 0,
  revealsUsed: 0,
  interventionLevel: 0,
  evidenceConfidence: 1,
  timingMs: 1000,
};

describe("server activity evidence sink", () => {
  it("records only the server-verified checkpoint submission as correctness evidence", async () => {
    const sink = { recordAssessment: vi.fn().mockResolvedValue(undefined), recordEngagement: vi.fn() };
    const result = await assessAndRecordCheckpoint(actor, activitySchema.parse(validActivity), {
      ...base, checkpointId: "checkpoint.stage", answer: "stage",
    }, sink);
    expect(result.submission.contractVersion).toBe("practice.v1");
    expect(result.submission.parts[0]?.isCorrect).toBe(true);
    expect(sink.recordAssessment).toHaveBeenCalledWith(actor, result.submission);
    expect(sink.recordEngagement).not.toHaveBeenCalled();
  });

  it("records deterministic tutorial results without trusting caller-supplied checks", async () => {
    const sink = { recordAssessment: vi.fn().mockResolvedValue(undefined), recordEngagement: vi.fn() };
    const result = await assessAndRecordTutorialStep(actor, activitySchema.parse(validActivity), {
      ...base, eventId: "event-2", stepId: "wedo.stage",
    }, () => true, sink);
    expect(result.submission.parts[0]?.isCorrect).toBe(true);
    expect(sink.recordAssessment).toHaveBeenCalledOnce();
    expect(sink.recordEngagement).not.toHaveBeenCalled();
  });
});
