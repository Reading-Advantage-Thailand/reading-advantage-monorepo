import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueReviewJob, normalizePrKey } from "../review-worker.js";

const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
  select: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  })),
};

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>("@reading-advantage/db");
  return {
    ...actual,
    db: mockDb,
  };
});

describe("Phase 2 — PR URL normalization for idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizePrKey strips trailing slash and .git suffix and lowercases owner/repo", async () => {
    const key = normalizePrKey("https://github.com/Org/Repo.git/pull/1/");
    expect(key.owner, "normalized owner").toBe("org");
    expect(key.repo, "normalized repo").toBe("repo");
    expect(key.pullNumber, "normalized pull number").toBe(1);
  });

  it("two URL variants resolve to the same PR key", async () => {
    const variantA = normalizePrKey("https://github.com/Org/Repo/pull/1");
    const variantB = normalizePrKey("https://github.com/org/repo.git/pull/1/");

    expect(variantA, "variant A matches variant B").toEqual(variantB);
  });

  it("enqueueReviewJob upserts using the normalized key", async () => {
    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-1",
      action: "opened",
      prUrl: "https://github.com/Org/Repo/pull/1",
      payload: {},
    });

    await enqueueReviewJob({
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      reviewId: "review-1",
      action: "opened",
      prUrl: "https://github.com/org/repo.git/pull/1/",
      payload: {},
    });

    const insertCalls = mockDb.insert.mock.calls.length;
    expect(insertCalls, `insert call count after normalized duplicate: ${insertCalls}`).toBe(1);
  });
});
