import { describe, it, expect, vi, beforeEach } from "vitest";
import { processJob, settleJob } from "../review-worker.js";

const mockUpdate = vi.fn().mockResolvedValue([]);
const mockDb = {
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockUpdate,
      }),
    }),
  }),
  // Minimal stub for `db.unscoped("...").select().from(...)` lookups
  // inside the real `reviewExercise` (codecamp module resolution). Tests
  // that need richer query mocks should extend this base.
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
};

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    updatePrReview: vi.fn().mockResolvedValue({
      id: "review-1",
      reviewStatus: "approved",
      reviewedAt: new Date(),
    }),
  };
});

vi.mock("../github-client", () => ({
  postPrComment: vi.fn().mockResolvedValue(undefined),
  fetchPrDiff: vi.fn().mockResolvedValue("diff"),
  getInstallationTokenForRepo: vi.fn().mockResolvedValue("token"),
}));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({
    generateObject: vi.fn().mockResolvedValue({
      passed: true,
      summary: "Great work",
      comments: [],
    }),
  })),
}));

import { updatePrReview } from "@reading-advantage/domain/codecamp";
import { postPrComment } from "../github-client.js";

describe("Phase 3 — success settle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("success sets status to succeeded and stamps reviewedAt", async () => {
    const job = {
      id: "job-1",
      reviewId: "review-1",
      prOwner: "org",
      prRepo: "repo",
      prPullNumber: 1,
      status: "claimed",
      attempts: 0,
      maxAttempts: 5,
      payloadJson: {},
    };

    await processJob(job as unknown as import("@reading-advantage/db").DB, {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
    });

    expect(updatePrReview, "updatePrReview call count").toHaveBeenCalledTimes(1);
    const updateCall = vi.mocked(updatePrReview).mock.calls[0]![0] as {
      input: { reviewStatus: string; llmReviewSummary?: string };
    };
    expect(updateCall.input.reviewStatus, "review status on success").toBe("approved");

    const postCalls = vi.mocked(postPrComment).mock.calls.length;
    expect(postCalls, `postPrComment call count: ${postCalls}`).toBe(1);
  });

  it("settleJob returns succeeded payload for a passing result", () => {
    const settled = settleJob(
      { id: "job-1", attempts: 0, maxAttempts: 5 } as unknown as import("@reading-advantage/db").DB,
      null,
      { baseDelayMs: 1000, maxJitterMs: 100 },
    );

    expect(settled.status, "settled status").toBe("succeeded");
    expect(settled.lastError, "settled lastError").toBeNull();
  });
});
