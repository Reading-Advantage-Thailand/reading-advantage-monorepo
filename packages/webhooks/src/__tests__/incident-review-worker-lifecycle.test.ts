import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import {
  enqueueReviewJob,
  processJob,
  settleJob,
} from "../review-worker.js";

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (db: unknown) => db,
}));

vi.mock("@reading-advantage/ai", () => ({ getAIClient: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({
  reviewJobs: { prOwner: "prOwner", prRepo: "prRepo", prPullNumber: "prPullNumber" },
}));

/** Builds a minimal durable job insert mock with an observable upsert call. */
function createEnqueueDb() {
  const returning = vi.fn().mockResolvedValue([{
    id: "job-1",
    prOwner: "reading-advantage-thailand",
    prRepo: "reading-advantage",
    prPullNumber: 2,
    prUrl: "https://github.com/Reading-Advantage-Thailand/reading-advantage/pull/2",
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date("2026-08-10T00:00:00.000Z"),
    lastError: null,
    claimedAt: null,
    claimedBy: null,
    reviewId: "review-1",
    createdAt: new Date("2026-08-10T00:00:00.000Z"),
    updatedAt: new Date("2026-08-10T00:00:00.000Z"),
  }]);
  const onConflictDoUpdate = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  return {
    insert: vi.fn(() => ({ values })),
  } as unknown as DB;
}

describe("incident repair — worker lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dead-letters a domain-marked permanent review contract failure on its first failed attempt", () => {
    const permanentContractFailure = Object.assign(
      new Error("The evaluator output violates the graph-bound objective contract."),
      {
        code: "CODECAMP_PR_REVIEW_CONTRACT_VIOLATION",
        retryable: false,
      },
    );

    expect(settleJob(
      { id: "job-1", attempts: 0, maxAttempts: 5 },
      permanentContractFailure,
      { now: new Date("2026-08-10T00:00:00.000Z"), maxJitterMs: 0 },
    )).toMatchObject({
      status: "dead",
      attempts: 1,
      lastError: permanentContractFailure.message,
    });
  });

  it("rejects a missing review relationship before model work and settles it dead on the first attempt", async () => {
    const getAIClient = vi.fn();
    const job = {
      id: "job-missing-review",
      reviewId: null,
      repoOwner: "reading-advantage-thailand",
      repoName: "reading-advantage",
      pullNumber: 2,
      status: "claimed",
      attempts: 0,
      maxAttempts: 5,
      payloadJson: {},
    } as Parameters<typeof processJob>[0];

    let failure: unknown;
    try {
      await processJob(job, {
        db: {} as DB,
        getAIClient,
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: "CODECAMP_PR_REVIEW_CONTRACT_VIOLATION",
      retryable: false,
    });
    expect(getAIClient).not.toHaveBeenCalled();
    expect(settleJob(job, failure as Error, {
      now: new Date("2026-08-10T00:00:00.000Z"),
      maxJitterMs: 0,
    })).toMatchObject({
      status: "dead",
      attempts: 1,
    });
  });

  it("keeps transient upstream failures on bounded retry backoff", () => {
    expect(settleJob(
      { id: "job-1", attempts: 0, maxAttempts: 5 },
      new Error("OpenRouter request timed out"),
      { now: new Date("2026-08-10T00:00:00.000Z"), baseDelayMs: 1_000, maxJitterMs: 0 },
    )).toMatchObject({
      status: "pending",
      attempts: 1,
      lastError: "OpenRouter request timed out",
    });
  });

  it("durably upserts a later synchronize delivery on a warm instance instead of discarding it from process memory", async () => {
    const db = createEnqueueDb();
    const prUrl = "https://github.com/Reading-Advantage-Thailand/reading-advantage/pull/2";

    await enqueueReviewJob({
      db,
      reviewId: "review-1",
      action: "opened",
      prUrl,
      payload: { pull_request: { head: { sha: "a".repeat(40) } } },
      deliveryId: "delivery-opened",
    });
    await enqueueReviewJob({
      db,
      reviewId: "review-1",
      action: "synchronize",
      prUrl,
      payload: { pull_request: { head: { sha: "b".repeat(40) } } },
      deliveryId: "delivery-synchronize",
    });

    const insert = (db as unknown as { insert: ReturnType<typeof vi.fn> }).insert;
    expect(insert).toHaveBeenCalledTimes(2);
  });
});
