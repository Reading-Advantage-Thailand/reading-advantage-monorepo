import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueReviewJob, __resetReviewWorkerState } from "../review-worker.js";

const mockDb = vi.hoisted(() => ({
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
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
        ]),
      }),
    }),
  }),
  select: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  })),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
}));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    db: mockDb,
  };
});

const basePayload = {
  action: "opened" as const,
  prUrl: "https://github.com/org/repo/pull/1",
  payload: { pull_request: { html_url: "https://github.com/org/repo/pull/1" } },
};

describe("Phase 2 — enqueueReviewJob is idempotent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the worker's in-process dedup cache so each test starts from
    // an empty cache (the cache otherwise persists across tests and breaks
    // the duplicate-delivery assertion).
    __resetReviewWorkerState();
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

  it("duplicate delivery for the same PR head does not create a second row", async () => {
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
    expect(insertCalls, `insert call count after duplicate: ${insertCalls}`).toBe(1);
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
