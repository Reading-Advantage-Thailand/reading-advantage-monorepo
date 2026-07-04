import { describe, it, expect, vi, beforeEach } from "vitest";
import { processJob, settleJob } from "../review-worker.js";

interface SettleJobInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  status?: string;
}

const mockDb = {
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
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
    updatePrReview: vi.fn().mockResolvedValue({ id: "review-1" }),
  };
});

vi.mock("../github-client", () => ({
  postPrComment: vi.fn().mockResolvedValue(undefined),
  fetchPrDiff: vi.fn().mockRejectedValue(new Error("diff unavailable")),
  getInstallationTokenForRepo: vi.fn().mockResolvedValue("token"),
}));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({
    generateObject: vi.fn().mockRejectedValue(new Error("model error")),
  })),
}));

import { updatePrReview } from "@reading-advantage/domain/codecamp";
import { postPrComment } from "../github-client.js";

describe("Phase 3 — exhaust to dead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("settleJob marks the job dead after max attempts", () => {
    const maxAttempts = 5;
    const job = {
      id: "job-1",
      attempts: maxAttempts,
      maxAttempts,
    } as unknown as SettleJobInput;

    const settled = settleJob(job, new Error("persistent failure"), {
      baseDelayMs: 1000,
      maxJitterMs: 0,
    });

    expect(settled.status, "dead status").toBe("dead");
    expect(settled.attempts, "dead attempts remain at max").toBe(maxAttempts);
    expect(settled.lastError, "dead lastError").toBe("persistent failure");
  });

  it("processJob does not call updatePrReview with reviewStatus: reviewed on exhaustion", async () => {
    const job = {
      id: "job-1",
      reviewId: "review-1",
      prOwner: "org",
      prRepo: "repo",
      prPullNumber: 1,
      status: "claimed",
      attempts: 5,
      maxAttempts: 5,
      payloadJson: {},
    };

    try {
      await processJob(job as unknown as Parameters<typeof processJob>[0], {
        db: mockDb as unknown as import("@reading-advantage/db").DB,
      });
    } catch {
      // Exhaustion may surface as a thrown terminal error or a settled job.
    }

    const reviewedCalls = vi.mocked(updatePrReview).mock.calls.filter((call) => {
      const input = (call[0] as { input?: { reviewStatus?: string } }).input;
      return input?.reviewStatus === "reviewed";
    });

    expect(reviewedCalls.length, `updatePrReview(reviewStatus: reviewed) call count: ${reviewedCalls.length}`).toBe(0);

    const postCalls = vi.mocked(postPrComment).mock.calls.length;
    expect(postCalls, `postPrComment call count on dead: ${postCalls}`).toBe(0);
  });
});
