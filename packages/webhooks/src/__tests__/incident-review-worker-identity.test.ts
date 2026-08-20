import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { processJob } from "../review-worker.js";

const mocks = vi.hoisted(() => ({
  reviewExercise: vi.fn(),
  listPriorPrReviewAttempts: vi.fn(),
  recordAdvisoryPrReviewAttempt: vi.fn(),
  updatePrReview: vi.fn(),
  aiClientToGenerateReview: vi.fn(() => vi.fn()),
  isPrEvaluationCanarySelected: vi.fn(() => true),
}));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (db: unknown) => db,
}));

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    ...mocks,
    reviewResultGenerationSchema: {},
  };
});

vi.mock("@reading-advantage/ai", () => ({ getAIClient: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({
  reviewJobs: { prOwner: "prOwner", prRepo: "prRepo", prPullNumber: "prPullNumber" },
}));

const activeRollout = () => ({
  mode: "active" as const,
  runModel: true,
  mayPublishFeedback: true,
  canaryPercent: 100,
  approvedBy: "assessment-owner",
  approvalRequired: false,
});

describe("incident repair — worker review identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reviewExercise.mockResolvedValue({
      passed: false,
      summary: "Advisory feedback.",
      comments: [],
      objectiveEvidence: [],
    });
    mocks.listPriorPrReviewAttempts.mockResolvedValue([]);
    mocks.recordAdvisoryPrReviewAttempt.mockResolvedValue({ attemptId: "attempt-1", created: true });
    mocks.updatePrReview.mockResolvedValue({ id: "review-1", reviewStatus: "reviewed" });
  });

  it("forwards the durable review relationship and never reconstructs curriculum identity from the normalized queue URL", async () => {
    await processJob({
      id: "job-1",
      reviewId: "review-1",
      repoOwner: "reading-advantage-thailand",
      repoName: "reading-advantage",
      pullNumber: 2,
      status: "claimed",
      attempts: 0,
      maxAttempts: 5,
      payloadJson: {},
    } as Parameters<typeof processJob>[0], {
      db: {} as DB,
      getAIClient: () => ({ generateObject: vi.fn() }),
      getToken: vi.fn().mockResolvedValue(undefined),
      fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md\n@@ -1 +1 @@\n-old\n+new"),
      fetchCheckEvidence: vi.fn().mockResolvedValue({
        availability: "unavailable",
        reason: "missing_head_sha",
        checkRuns: [],
      }),
      postComment: vi.fn().mockResolvedValue(undefined),
      resolveRollout: activeRollout,
    });

    const reviewInput = mocks.reviewExercise.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reviewInput.reviewId).toBe("review-1");
    expect(reviewInput).not.toHaveProperty("repoUrl");
  });
});
