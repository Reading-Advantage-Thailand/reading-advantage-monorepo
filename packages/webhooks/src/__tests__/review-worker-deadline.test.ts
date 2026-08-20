import { describe, it, expect, vi } from "vitest";
import {
  runWorkerTick,
  type CreateReviewWorkerOptions,
  type ReviewJob,
} from "../review-worker.js";

/**
 * Phase 2 (Red) tests for `runWorkerTick` deadline (FR-7).
 *
 * Behavior lands in Phase 3. Today `CreateReviewWorkerOptions` has no
 * `deadlineMs` field, so the new-deadline assertions are RED. The
 * existing MAX_ITERATIONS_PER_RUN guard caps the loop and keeps the
 * regression pins deterministic.
 */

interface SettleJobInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  status?: string;
}

const REVIEW_ID = "6dbf6554-9fa7-4a42-974a-b956b63a4c90";

function makeClaimedJob(id: string): ReviewJob {
  return {
    id,
    reviewId: REVIEW_ID,
    repoOwner: "org",
    repoName: "repo",
    pullNumber: 1,
    status: "claimed" as const,
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date(),
    lastError: null,
    claimedAt: new Date(),
    claimedBy: "worker:test",
    deliveryId: `delivery-${id}`,
    payloadJson: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    prUrl: "https://github.com/org/repo/pull/1",
    enqueued: false,
  };
}

describe("Phase 2 — runWorkerTick deadline (FR-7)", () => {
  it("stops claiming new batches once the deadline passes and returns cleanly", async () => {
    const job = makeClaimedJob("job-1");
    const claim = vi
      .fn()
      .mockResolvedValueOnce([job])
      .mockResolvedValueOnce([job])
      .mockResolvedValueOnce([job])
      .mockImplementation(() => new Promise(() => {})); // hang forever after the first three
    const reclaim = vi.fn().mockResolvedValue([]);
    const settle = vi.fn().mockReturnValue({
      status: "succeeded" as const,
      attempts: 0,
      nextAttemptAt: new Date(),
      lastError: null,
      claimedAt: null,
      claimedBy: null,
    });
    const applySettle = vi.fn().mockResolvedValue(undefined);

    const opts = {
      claim,
      reclaim,
      settle,
      applySettle,
      deps: {
        getAIClient: () => ({ generateObject: vi.fn() }),
        getToken: vi.fn().mockResolvedValue(undefined),
        fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md\n@@ -1 +1 @@\n-x\n+y"),
        fetchCheckEvidence: vi.fn().mockResolvedValue({
          availability: "unavailable",
          reason: "github_check_runs_unavailable",
          checkRuns: [],
        }),
        postComment: vi.fn(),
        updatePrReview: vi.fn(),
        resolveRollout: () => ({
          mode: "active",
          runModel: true,
          mayPublishFeedback: true,
          canaryPercent: 100,
          approvedBy: "assessment-owner",
          approvalRequired: false,
        }),
        isCurrentClaim: vi.fn().mockResolvedValue(true),
      },
    } as unknown as CreateReviewWorkerOptions & { deadlineMs: number };

    // Deadline set so small that the third claim attempt (or later) is
    // already past it. The worker must observe the deadline and exit
    // instead of hanging forever on the fourth claim.
    await expect(
      Promise.race([
        runWorkerTick({ ...opts, deadlineMs: 1 } as unknown as CreateReviewWorkerOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error("runWorkerTick did not honor the deadline")), 500)),
      ]),
    ).resolves.toBeUndefined();

    expect(claim, "tick must stop claiming once the deadline passes").toHaveBeenCalledTimes(3);
  });

  it("a job already claimed before the deadline still settles even when the deadline is exhausted mid-batch", async () => {
    const claimedJob = makeClaimedJob("job-claimed");
    const secondJob = makeClaimedJob("job-second");
    const claim = vi
      .fn()
      .mockResolvedValueOnce([claimedJob])
      .mockResolvedValueOnce([secondJob])
      .mockImplementation(() => new Promise(() => {}));
    const reclaim = vi.fn().mockResolvedValue([]);
    const settle = vi.fn().mockReturnValue({
      status: "succeeded" as const,
      attempts: 0,
      nextAttemptAt: new Date(),
      lastError: null,
      claimedAt: null,
      claimedBy: null,
    });
    const settledJobs: string[] = [];
    const applySettle = vi.fn().mockImplementation(async (_db, jobId) => {
      settledJobs.push(jobId);
    });

    const opts = {
      claim,
      reclaim,
      settle,
      applySettle,
      deps: {
        getAIClient: () => ({ generateObject: vi.fn() }),
        getToken: vi.fn().mockResolvedValue(undefined),
        fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md\n@@ -1 +1 @@\n-x\n+y"),
        fetchCheckEvidence: vi.fn().mockResolvedValue({
          availability: "unavailable",
          reason: "github_check_runs_unavailable",
          checkRuns: [],
        }),
        postComment: vi.fn(),
        updatePrReview: vi.fn(),
        resolveRollout: () => ({
          mode: "active",
          runModel: true,
          mayPublishFeedback: true,
          canaryPercent: 100,
          approvedBy: "assessment-owner",
          approvalRequired: false,
        }),
        isCurrentClaim: vi.fn().mockResolvedValue(true),
      },
    } as unknown as CreateReviewWorkerOptions & { deadlineMs: number };

    await Promise.race([
      runWorkerTick({ ...opts, deadlineMs: 1 } as unknown as CreateReviewWorkerOptions),
      new Promise((_, reject) => setTimeout(() => reject(new Error("runWorkerTick did not honor the deadline")), 500)),
    ]);

    expect(settledJobs, "the claimed-before-deadline job must still settle").toContain("job-claimed");
    expect(settledJobs, "the second batch must NOT settle after the deadline passes").not.toContain("job-second");
  });

  it("the default deadline is 120,000 milliseconds", async () => {
    const workerModule = await import("../review-worker.js");
    const defaultDeadline = (workerModule as unknown as { DEFAULT_TICK_DEADLINE_MS?: number }).DEFAULT_TICK_DEADLINE_MS;
    expect(defaultDeadline, "DEFAULT_TICK_DEADLINE_MS must equal 120,000 ms").toBe(120_000);
  });
});
