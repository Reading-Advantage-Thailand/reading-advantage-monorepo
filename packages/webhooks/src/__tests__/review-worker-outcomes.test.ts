import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { CodecampPrReviewContractError } from "@reading-advantage/domain/codecamp";
import {
  processJob,
  runWorkerTick,
  settleJob,
  type ReviewJobTerminalOutcome,
} from "../review-worker.js";

/**
 * Phase 2 (Red) tests for the worker outcome contract (FR-3, FR-5, FR-9).
 *
 * Behavior lands in Phase 3. Today `settleJob` returns no `outcome` or
 * `failureReason` fields, so the new-contract assertions are RED. The
 * pre-existing permanent/retry paths stay green (regression pins).
 */

interface SettleJobInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  status?: string;
}

const REVIEW_ID = "6dbf6554-9fa7-4a42-974a-b956b63a4c90";

const activeRollout = () => ({
  mode: "active" as const,
  runModel: true,
  mayPublishFeedback: true,
  canaryPercent: 100,
  approvedBy: "assessment-owner",
  approvalRequired: false,
});

function makeContractError(message: string, kind: "input_safety" | "model_shape") {
  return new CodecampPrReviewContractError(message, undefined, kind);
}

describe("Phase 2 — settleJob outcomes (FR-3, FR-5, FR-9)", () => {
  it("input_safety failure settles dead with outcome='failed_permanent' and a reason", () => {
    const settled = settleJob(
      { id: "job-1", attempts: 1, maxAttempts: 5 } as unknown as SettleJobInput,
      makeContractError("Review relationship requires a valid review ID", "input_safety"),
      { baseDelayMs: 1000, maxJitterMs: 0 },
    );

    expect(settled.status, "input_safety failure status").toBe("dead");
    expect(settled.outcome, "input_safety failure outcome").toBe<ReviewJobTerminalOutcome>("failed_permanent");
    expect(settled.failureReason, "input_safety failure reason").toBeTruthy();
    expect(settled.failureReason, "input_safety failure reason echoes the error").toMatch(
      /valid review ID/,
    );
    expect(settled.failureReason!.length, "failure reason is bounded").toBeLessThanOrEqual(240);
  });

  it("model_shape failure settles pending with backoff while attempts remain", () => {
    const settled = settleJob(
      { id: "job-1", attempts: 1, maxAttempts: 5 } as unknown as SettleJobInput,
      makeContractError(
        "Review output must cover every graph-bound objective exactly once",
        "model_shape",
      ),
      { baseDelayMs: 1000, maxJitterMs: 0 },
    );

    expect(settled.status, "model_shape failure status while attempts remain").toBe("pending");
    expect(settled.attempts, "model_shape failure increments attempts").toBe(2);
    expect(settled.outcome, "model_shape is transient — no terminal outcome").toBeUndefined();
  });

  it("exhaustion settles dead with outcome='failed_exhausted'", () => {
    const settled = settleJob(
      { id: "job-1", attempts: 5, maxAttempts: 5 } as unknown as SettleJobInput,
      new Error("persistent provider 5xx"),
      { baseDelayMs: 1000, maxJitterMs: 0 },
    );

    expect(settled.status, "exhaustion status").toBe("dead");
    expect(settled.outcome, "exhaustion outcome").toBe<ReviewJobTerminalOutcome>("failed_exhausted");
    expect(settled.failureReason, "exhaustion failure reason").toBeTruthy();
    expect(settled.lastError, "exhaustion lastError").toBe("persistent provider 5xx");
  });
});

describe("Phase 2 — empty stripped diff skipped outcome (FR-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeClaimedJob() {
    return {
      id: "job-1",
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
      deliveryId: "delivery-empty",
      payloadJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      prUrl: "https://github.com/org/repo/pull/1",
      enqueued: false,
    } as unknown as Parameters<typeof processJob>[0];
  }

  it("settles succeeded with outcome='skipped_generated' when the stripped diff is empty", async () => {
    const job = makeClaimedJob();
    const claim = vi.fn().mockResolvedValueOnce([job]).mockResolvedValueOnce([]);
    // Spy on the model — it must NOT be invoked when the stripped diff is empty.
    const generateObject = vi.fn();
    // Spy on the comment poster — it IS called for a skip outcome so the
    // intern sees why the review was skipped (FR-4).
    const postComment = vi.fn();
    // Track what payload `applySettle` receives so we can assert outcome.
    const capturedPayloads: Array<{ status: string; outcome?: string; failureReason?: string | null }> = [];
    const applySettle = vi.fn().mockImplementation(async (_db, _id, payload) => {
      capturedPayloads.push(payload as { status: string; outcome?: string; failureReason?: string | null });
    });

    await runWorkerTick({
      claim,
      reclaim: vi.fn().mockResolvedValue([]),
      settle: vi.fn().mockImplementation(() => ({
        status: "succeeded" as const,
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        claimedAt: null,
        claimedBy: null,
      })),
      applySettle,
      deps: {
        getAIClient: () => ({ generateObject }),
        getToken: vi.fn().mockResolvedValue("token"),
        // A diff composed entirely of generated artifacts; the worker must
        // strip everything and recognize the empty result as a skip.
        fetchDiff: vi.fn().mockResolvedValue("diff --git a/dist/bundle.js b/dist/bundle.js\n@@ -1 +1 @@\n-x\n+y"),
        fetchCheckEvidence: vi.fn().mockResolvedValue({
          availability: "unavailable",
          reason: "github_check_runs_unavailable",
          checkRuns: [],
        }),
        postComment,
        updatePrReview: vi.fn(),
        resolveRollout: activeRollout,
      },
    });

    expect(generateObject, "skip path must not call the model").not.toHaveBeenCalled();
    expect(postComment, "skip path must post an advisory comment naming the ignored paths").toHaveBeenCalledTimes(1);
    expect(applySettle, "skip path must settle exactly once").toHaveBeenCalledTimes(1);
    const settledPayload = capturedPayloads[0];
    expect(settledPayload, "skip settle payload is captured").toBeDefined();
    expect(settledPayload!.status, "empty-diff terminal status").toBe("succeeded");
    expect(settledPayload!.outcome, "empty-diff terminal outcome").toBe<ReviewJobTerminalOutcome>("skipped_generated");
  });
});

describe("Phase 2 — terminal settle writes exactly one structured log line (FR-9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes exactly one terminal log line carrying event, reviewJobId, reviewId, outcome, and a reason", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const terminalPayload = {
      status: "dead" as const,
      attempts: 1,
      nextAttemptAt: new Date(),
      lastError: "Review relationship requires a valid review ID",
      claimedAt: null,
      claimedBy: null,
      outcome: "failed_permanent" as ReviewJobTerminalOutcome,
      failureReason: "Review relationship requires a valid review ID",
    };
    const settle = vi.fn().mockReturnValue(terminalPayload);
    const applySettle = vi.fn().mockResolvedValue(undefined);

    const job = {
      id: "job-1",
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
      deliveryId: "delivery-terminal",
      payloadJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      prUrl: "https://github.com/org/repo/pull/1",
      enqueued: false,
    } as unknown as Parameters<typeof processJob>[0];

    await runWorkerTick({
      claim: vi.fn().mockResolvedValueOnce([job]).mockResolvedValueOnce([]),
      reclaim: vi.fn().mockResolvedValue([]),
      settle,
      applySettle,
      deps: {
        getAIClient: () => ({ generateObject: vi.fn() }),
        getToken: vi.fn().mockResolvedValue("token"),
        fetchDiff: vi.fn().mockResolvedValue("diff --git a/README.md b/README.md\n@@ -1 +1 @@\n-x\n+y"),
        fetchCheckEvidence: vi.fn().mockResolvedValue({
          availability: "unavailable",
          reason: "github_check_runs_unavailable",
          checkRuns: [],
        }),
        postComment: vi.fn(),
        updatePrReview: vi.fn().mockResolvedValue({ id: REVIEW_ID, reviewStatus: "reviewed" }),
        resolveRollout: activeRollout,
        isCurrentClaim: vi.fn().mockResolvedValue(true),
      },
    });

    const totalLogs = logSpy.mock.calls.length + errorSpy.mock.calls.length;
    expect(totalLogs, "terminal settle must write exactly one log line").toBe(1);

    const loggedAt = logSpy.mock.calls[0] ?? errorSpy.mock.calls[0];
    const payload = loggedAt?.[0] as Record<string, unknown> | string | undefined;
    expect(payload, "terminal log must be a structured object, not a free-form string").toBeTypeOf("object");
    const structured = payload as Record<string, unknown>;
    expect(structured.event, "structured log must carry event").toBe("reviewJob.settled");
    expect(structured.reviewJobId, "structured log must carry reviewJobId").toBe("job-1");
    expect(structured.reviewId, "structured log must carry reviewId").toBe(REVIEW_ID);
    expect(structured.outcome, "structured log must carry outcome").toBe("failed_permanent");
    expect(typeof structured.reason, "structured log must carry a truncated reason").toBe("string");

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
