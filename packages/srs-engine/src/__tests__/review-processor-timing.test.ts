import { describe, expect, it } from "vitest";
import { processReview } from "../srs/review-processor.js";
import { createCard } from "../srs/scheduler.js";
import type {
  PracticeSubmissionEnvelope,
  PracticeTimingBaseline,
  PracticeTimingSummary,
} from "../srs/contract.js";

const NOW = "2026-11-03T00:00:00.000Z";

const timing: PracticeTimingSummary = {
  startedAt: NOW,
  submittedAt: NOW,
  wallClockMs: 40000,
  activeMs: 40000,
  idleMs: 0,
  pauseCount: 0,
  focusLossCount: 0,
  visibilityHiddenCount: 0,
  confidence: "high",
};

const baseline: PracticeTimingBaseline = {
  variantKey: "v",
  sampleCount: 50,
  medianActiveMs: 40000,
  lastComputedAt: NOW,
  minSamplesMet: true,
};

function submission(extra: Partial<PracticeSubmissionEnvelope> = {}): PracticeSubmissionEnvelope {
  return {
    contractVersion: "practice.v1",
    activityId: "act" as PracticeSubmissionEnvelope["activityId"],
    mode: "independent_practice",
    status: "submitted",
    attemptNumber: 3,
    submittedAt: NOW,
    answers: {},
    parts: [{ partId: "p1", rawAnswer: 1, isCorrect: true }],
    ...extra,
  };
}

const card = () => createCard({ studentId: "s1", objectiveId: "o1", now: NOW });

describe("processReview timing evidence", () => {
  it("prefixes timing_missing when the submission has no timing", () => {
    const result = processReview({ card: card(), submission: submission(), now: NOW });
    expect(result.reviewLog.evidence.reasons[0]).toBe("timing_missing");
    expect(result.rating).toBe("Good");
  });

  it("omits timing_missing when timing has no baseline", () => {
    const result = processReview({ card: card(), submission: submission({ timing }), now: NOW });
    expect(result.reviewLog.evidence.reasons).not.toContain("timing_missing");
  });

  it("uses timing and baseline without timing_missing", () => {
    const result = processReview({ card: card(), submission: submission({ timing }), baseline, now: NOW });
    expect(result.reviewLog.evidence.reasons).not.toContain("timing_missing");
    expect(result.reviewLog.reviewedAt).toBe(NOW);
  });

  it("logs the submission id, card id, and before and after state", () => {
    const c = card();
    const result = processReview({ card: c, submission: submission(), now: NOW });
    expect(result.reviewLog.submissionId).toBe("act-3");
    expect(result.reviewLog.cardId).toBe(c.cardId);
    expect(result.reviewLog.studentId).toBe("s1");
    expect(result.reviewLog.stateBefore).toEqual({ stability: 0, difficulty: 0, state: "new", reps: 0, lapses: 0 });
    expect(result.reviewLog.stateAfter.reps).toBe(1);
    expect(result.updatedCard.reps).toBe(1);
  });

  it("rates an empty part list Again", () => {
    expect(processReview({ card: card(), submission: submission({ parts: [] }), now: NOW }).rating).toBe("Again");
  });

  it("gives each review a distinct id", () => {
    const a = processReview({ card: card(), submission: submission(), now: NOW });
    const b = processReview({ card: card(), submission: submission(), now: NOW });
    expect(a.reviewLog.reviewId).toMatch(/^rev_[0-9a-f]{32}$/);
    expect(a.reviewLog.reviewId).not.toBe(b.reviewLog.reviewId);
  });
});
