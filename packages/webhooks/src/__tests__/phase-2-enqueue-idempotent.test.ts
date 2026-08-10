import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueReviewJob } from "../review-worker.js";

const mockDb = vi.hoisted(() => {
  const returning = vi.fn().mockResolvedValue([
    {
      id: "job-1",
      prOwner: "org",
      prRepo: "repo",
      prPullNumber: 1,
      status: "pending",
      attempts: 0,
      maxAttempts: 5,
      nextAttemptAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });

  return {
    insert: vi.fn().mockReturnValue({ values }),
    values,
    onConflictDoUpdate,
    returning,
  };
});

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    db: mockDb,
  };
});

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (db: unknown) => db,
}));
vi.mock("@reading-advantage/domain/codecamp", () => ({}));
vi.mock("@reading-advantage/ai", () => ({ getAIClient: vi.fn() }));

const basePayload = {
  action: "opened" as const,
  prUrl: "https://github.com/org/repo/pull/1",
  payload: { pull_request: { html_url: "https://github.com/org/repo/pull/1" } },
};

describe("Phase 2 — enqueueReviewJob is idempotent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues exactly one pending job", async () => {
    const job = await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-1",
      ...basePayload,
    });

    expect(job.status, "new job status").toBe("pending");
    expect(job.attempts, "new job attempts").toBe(0);
    expect(mockDb.insert, "insert call count").toHaveBeenCalledTimes(1);
  });

  it("routes every duplicate delivery through the durable upsert", async () => {
    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-1",
      ...basePayload,
    });

    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-1",
      ...basePayload,
    });

    const insertCalls = mockDb.insert.mock.calls.length;
    expect(insertCalls, `durable upsert call count after duplicate: ${insertCalls}`).toBe(2);
    expect(mockDb.onConflictDoUpdate, "each delivery selects the unique-key conflict path").toHaveBeenCalledTimes(2);
  });

  it("persists the newer synchronize payload, review relationship, and PR URL", async () => {
    const openedUrl = "https://github.com/Reading-Advantage-Thailand/reading-advantage/pull/2";
    const synchronizeUrl = "https://github.com/reading-advantage-thailand/reading-advantage/pull/2";
    const latestPayload = { pull_request: { head: { sha: "b".repeat(40) } } };

    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-opened",
      action: "opened",
      prUrl: openedUrl,
      payload: { pull_request: { head: { sha: "a".repeat(40) } } },
      deliveryId: "delivery-opened",
    });
    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-synchronize",
      action: "synchronize",
      prUrl: synchronizeUrl,
      payload: latestPayload,
      deliveryId: "delivery-synchronize",
    });

    expect(mockDb.values).toHaveBeenLastCalledWith(expect.objectContaining({
      reviewId: "review-synchronize",
      prUrl: synchronizeUrl,
      payloadJson: latestPayload,
      deliveryId: "delivery-synchronize",
    }));
    expect(mockDb.onConflictDoUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      set: expect.objectContaining({
        reviewId: "review-synchronize",
        prUrl: synchronizeUrl,
        payloadJson: latestPayload,
        deliveryId: "delivery-synchronize",
      }),
    }));
  });

  it("returns promptly without awaiting a review", async () => {
    const start = Date.now();
    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-1",
      ...basePayload,
    });
    const elapsed = Date.now() - start;
    expect(elapsed, "enqueue latency ms").toBeLessThan(100);
  });
});
