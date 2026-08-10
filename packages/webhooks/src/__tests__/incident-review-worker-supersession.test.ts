import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { enqueueReviewJob, processJob, runWorkerTick } from "../review-worker.js";

const domainMocks = vi.hoisted(() => ({
  listPriorPrReviewAttempts: vi.fn().mockResolvedValue([]),
  recordAdvisoryPrReviewAttempt: vi.fn().mockResolvedValue({
    attemptId: "attempt-stale",
    created: true,
  }),
  reviewExercise: vi.fn().mockResolvedValue({
    passed: true,
    summary: "Stale advisory result",
    comments: [],
  }),
}));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (db: unknown) => db,
}));

vi.mock("@reading-advantage/domain/codecamp", () => ({
  aiClientToGenerateReview: vi.fn(() => vi.fn()),
  isPrEvaluationCanarySelected: vi.fn(() => true),
  listPriorPrReviewAttempts: domainMocks.listPriorPrReviewAttempts,
  recordAdvisoryPrReviewAttempt: domainMocks.recordAdvisoryPrReviewAttempt,
  reviewExercise: domainMocks.reviewExercise,
  reviewResultGenerationSchema: {},
}));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(),
}));

vi.mock("../github-client", () => ({
  fetchPrCheckEvidence: vi.fn(),
  fetchPrDiff: vi.fn(),
  getInstallationTokenForRepo: vi.fn(),
  postPrComment: vi.fn(),
}));

/** Creates an enqueue DB double that exposes the durable conflict update. */
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
    reviewId: "review-existing",
    payloadJson: {},
    createdAt: new Date("2026-08-10T00:00:00.000Z"),
    updatedAt: new Date("2026-08-10T00:00:00.000Z"),
  }]);
  const onConflictDoUpdate = vi.fn((_config: { set: Record<string, unknown> }) => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));

  return {
    db: { insert } as unknown as DB,
    onConflictDoUpdate,
  };
}

/** Builds one fully identified claimed job for supersession races. */
function createClaimedJob() {
  return {
    id: "job-1",
    reviewId: "review-1",
    repoOwner: "reading-advantage-thailand",
    repoName: "reading-advantage",
    pullNumber: 2,
    status: "claimed" as const,
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date("2026-08-10T00:00:00.000Z"),
    lastError: null,
    claimedAt: new Date("2026-08-10T00:00:00.000Z"),
    claimedBy: "worker-old:bf2695de-cc96-4b94-9f36-247d16dbe738",
    deliveryId: "delivery-opened",
    payloadJson: { pull_request: { head: { sha: "a".repeat(40) } } },
    createdAt: new Date("2026-08-10T00:00:00.000Z"),
    updatedAt: new Date("2026-08-10T00:00:00.000Z"),
    prUrl: "https://github.com/Reading-Advantage-Thailand/reading-advantage/pull/2",
    enqueued: false,
  };
}

/** Creates a transactional DB double that either locks this precise lease or reports it superseded. */
function createLeaseTransactionDb(lockedRows: Array<{ id: string }>) {
  let insideTransaction = false;
  const lockForUpdate = vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue(lockedRows),
  });
  const tx = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: lockForUpdate,
        }),
      }),
    }),
  };
  const transaction = vi.fn(async (callback: (activeTx: typeof tx) => Promise<boolean>) => {
    insideTransaction = true;
    try {
      return await callback(tx);
    } finally {
      insideTransaction = false;
    }
  });

  return {
    db: { transaction } as unknown as DB,
    transaction,
    lockForUpdate,
    isInsideTransaction: () => insideTransaction,
  };
}

describe("incident repair — superseded review jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not publish or persist an in-flight result after a newer delivery supersedes its durable claim", async () => {
    const isCurrentClaim = vi.fn().mockResolvedValue(false);
    const updatePrReview = vi.fn().mockResolvedValue({
      id: "review-1",
      reviewStatus: "reviewed",
    });
    const postComment = vi.fn().mockResolvedValue(undefined);
    const staleJob = createClaimedJob();

    const completed = await processJob(staleJob as unknown as Parameters<typeof processJob>[0], {
      db: {} as DB,
      getAIClient: () => ({ generateObject: vi.fn() }),
      getToken: vi.fn().mockResolvedValue("github-token"),
      fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md"),
      fetchCheckEvidence: vi.fn().mockResolvedValue({
        availability: "unavailable",
        reason: "github_check_runs_unavailable",
        checkRuns: [],
      }),
      postComment,
      updatePrReview,
      resolveRollout: () => ({
        mode: "active",
        runModel: true,
        mayPublishFeedback: true,
        canaryPercent: 100,
        approvedBy: "assessment-owner",
        approvalRequired: false,
      }),
      workerId: "worker-old",
      isCurrentClaim,
    } as Parameters<typeof processJob>[1]);

    expect.soft(isCurrentClaim, "durable claim identity check").toHaveBeenCalledWith({
      id: "job-1",
      claimedBy: "worker-old:bf2695de-cc96-4b94-9f36-247d16dbe738",
      deliveryId: "delivery-opened",
      status: "claimed",
    });
    expect.soft(completed, "superseded work must not be settled as the current claim").toBe(false);
    expect.soft(
      domainMocks.recordAdvisoryPrReviewAttempt,
      "stale result must not create an advisory attempt",
    ).not.toHaveBeenCalled();
    expect.soft(updatePrReview, "stale result must not mark the review reviewed").not.toHaveBeenCalled();
    expect.soft(postComment, "stale result must not post learner-visible feedback").not.toHaveBeenCalled();
  });

  it("does not settle an old job when processing reports that its claim was superseded", async () => {
    const staleJob = createClaimedJob();
    const claim = vi.fn()
      .mockResolvedValueOnce([staleJob])
      .mockResolvedValueOnce([]);
    const settle = vi.fn();
    const applySettle = vi.fn().mockResolvedValue(undefined);

    await runWorkerTick({
      claim,
      reclaim: vi.fn().mockResolvedValue([]),
      settle,
      applySettle,
      deps: {
        getAIClient: () => ({ generateObject: vi.fn() }),
        getToken: vi.fn().mockResolvedValue("github-token"),
        fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md"),
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
        workerId: "worker-old",
        isCurrentClaim: vi.fn().mockResolvedValue(false),
      },
    });

    expect(settle, "stale worker must not calculate a success settlement").not.toHaveBeenCalled();
    expect(applySettle, "stale worker must not settle a newer pending or re-claimed row").not.toHaveBeenCalled();
  });

  it("passes the complete lease identity into settlement for a current claim", async () => {
    const claimedJob = createClaimedJob();
    const claim = vi.fn()
      .mockResolvedValueOnce([claimedJob])
      .mockResolvedValueOnce([]);
    const settled = {
      status: "succeeded" as const,
      attempts: 0,
      nextAttemptAt: new Date("2026-08-10T00:01:00.000Z"),
      lastError: null,
      claimedAt: null,
      claimedBy: null,
    };
    const applySettle = vi.fn().mockResolvedValue(undefined);

    await runWorkerTick({
      claim,
      reclaim: vi.fn().mockResolvedValue([]),
      settle: vi.fn().mockReturnValue(settled),
      applySettle,
      deps: {
        getAIClient: () => ({ generateObject: vi.fn() }),
        getToken: vi.fn().mockResolvedValue(undefined),
        fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md"),
        fetchCheckEvidence: vi.fn().mockResolvedValue({
          availability: "unavailable",
          reason: "github_check_runs_unavailable",
          checkRuns: [],
        }),
        updatePrReview: vi.fn().mockResolvedValue({ id: "review-1", reviewStatus: "reviewed" }),
        resolveRollout: () => ({
          mode: "active",
          runModel: true,
          mayPublishFeedback: true,
          canaryPercent: 100,
          approvedBy: "assessment-owner",
          approvalRequired: false,
        }),
        workerId: "worker-old",
        isCurrentClaim: vi.fn().mockResolvedValue(true),
      },
    });

    expect(applySettle).toHaveBeenCalledWith(undefined, "job-1", settled, {
      id: "job-1",
      status: "claimed",
      claimedBy: "worker-old:bf2695de-cc96-4b94-9f36-247d16dbe738",
      deliveryId: "delivery-opened",
    });
  });

  it.each([
    ["omitted", undefined],
    ["explicitly null", null],
  ])("preserves an existing review relationship when a conflicting enqueue is %s", async (_label, reviewId) => {
    const { db, onConflictDoUpdate } = createEnqueueDb();
    const latestPrUrl = "https://github.com/reading-advantage-thailand/reading-advantage/pull/2";
    const latestPayload = { pull_request: { head: { sha: "b".repeat(40) } } };

    const job = await enqueueReviewJob({
      db,
      reviewId,
      action: "synchronize",
      prUrl: latestPrUrl,
      payload: latestPayload,
      deliveryId: "delivery-synchronize",
    } as Parameters<typeof enqueueReviewJob>[0]);

    const conflictUpdate = onConflictDoUpdate.mock.calls[0]![0];
    expect.soft(conflictUpdate.set).toEqual(expect.objectContaining({
      prUrl: latestPrUrl,
      payloadJson: latestPayload,
      deliveryId: "delivery-synchronize",
    }));
    expect.soft(
      conflictUpdate.set.reviewId,
      "a missing incoming reviewId must not clear the persisted relationship",
    ).not.toBeNull();
    expect.soft(job.reviewId, "the durable upsert returns the preserved relationship").toBe("review-existing");
  });

  it("runs learner-visible and durable review effects only under a row-locked exact lease transaction", async () => {
    const leaseDb = createLeaseTransactionDb([{ id: "job-1" }]);
    const writeScopes: boolean[] = [];
    const updatePrReview = vi.fn().mockImplementation(async () => {
      writeScopes.push(leaseDb.isInsideTransaction());
      return { id: "review-1", reviewStatus: "reviewed" };
    });
    const postComment = vi.fn().mockImplementation(async () => {
      writeScopes.push(leaseDb.isInsideTransaction());
    });
    domainMocks.recordAdvisoryPrReviewAttempt.mockImplementation(async () => {
      writeScopes.push(leaseDb.isInsideTransaction());
      return { attemptId: "attempt-current", created: true };
    });

    const completed = await processJob(createClaimedJob() as Parameters<typeof processJob>[0], {
      db: leaseDb.db,
      getAIClient: () => ({ generateObject: vi.fn() }),
      getToken: vi.fn().mockResolvedValue("github-token"),
      fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md"),
      fetchCheckEvidence: vi.fn().mockResolvedValue({
        availability: "unavailable",
        reason: "github_check_runs_unavailable",
        checkRuns: [],
      }),
      postComment,
      updatePrReview,
      resolveRollout: () => ({
        mode: "active",
        runModel: true,
        mayPublishFeedback: true,
        canaryPercent: 100,
        approvedBy: "assessment-owner",
        approvalRequired: false,
      }),
      workerId: "worker-old",
    });

    expect(completed, "current exact lease completes").toBe(true);
    expect(leaseDb.transaction, "side effects must enter one durable transaction").toHaveBeenCalledOnce();
    expect(leaseDb.lockForUpdate, "the exact lease row must be locked before side effects").toHaveBeenCalledWith("update");
    expect(writeScopes, "attempt, review update, and comment all execute while that lock is held").toEqual([true, true, true]);
  });

  it("publishes no attempt, review update, or comment when the durable lease was superseded", async () => {
    const leaseDb = createLeaseTransactionDb([]);
    const updatePrReview = vi.fn();
    const postComment = vi.fn();

    const completed = await processJob(createClaimedJob() as Parameters<typeof processJob>[0], {
      db: leaseDb.db,
      getAIClient: () => ({ generateObject: vi.fn() }),
      getToken: vi.fn().mockResolvedValue("github-token"),
      fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md"),
      fetchCheckEvidence: vi.fn().mockResolvedValue({
        availability: "unavailable",
        reason: "github_check_runs_unavailable",
        checkRuns: [],
      }),
      postComment,
      updatePrReview,
      resolveRollout: () => ({
        mode: "active",
        runModel: true,
        mayPublishFeedback: true,
        canaryPercent: 100,
        approvedBy: "assessment-owner",
        approvalRequired: false,
      }),
      workerId: "worker-old",
    });

    expect(completed, "superseded lease does not complete").toBe(false);
    expect(leaseDb.transaction, "supersession is checked under a durable transaction").toHaveBeenCalledOnce();
    expect(leaseDb.lockForUpdate, "the absent lease is checked under a row lock").toHaveBeenCalledWith("update");
    expect(domainMocks.recordAdvisoryPrReviewAttempt, "no stale advisory attempt").not.toHaveBeenCalled();
    expect(updatePrReview, "no stale editorial update").not.toHaveBeenCalled();
    expect(postComment, "no stale learner-visible comment").not.toHaveBeenCalled();
  });
});
