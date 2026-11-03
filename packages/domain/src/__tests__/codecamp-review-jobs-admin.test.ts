import { describe, it, expect, vi } from "vitest";
import type { TenantDB } from "../db-contract.js";
import { listDeadReviewJobs, requeueReviewJob } from "../codecamp/review-jobs.js";

const tenant = { schoolId: "school-1" };
const admin = { id: "a1", role: "ADMIN" as const, schoolId: "school-1" };
const teacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const at = new Date("2026-06-01T00:00:00.000Z");
const row = {
  id: "job-1", prOwner: "o", prRepo: "r", prPullNumber: 7, prUrl: "https://example.test/pr/7", status: "dead",
  attempts: 5, maxAttempts: 5, nextAttemptAt: at, lastError: "timeout", claimedAt: null, claimedBy: null,
  reviewId: null, createdAt: at, updatedAt: at, extraColumn: "dropped",
};

/**
 * Builds a TenantDB stub whose unscoped select chain records its calls.
 * @param rows Rows the select chain resolves to.
 * @returns The stub and its chain spies.
 */
function selectDb(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  };
  const unscoped = vi.fn(() => ({ select: vi.fn(() => chain) }));
  return { db: { unscoped } as unknown as TenantDB, chain, unscoped };
}

/**
 * Builds a TenantDB stub whose unscoped update chain records its calls.
 * @param rows Rows the update chain returns.
 * @returns The stub and the set spy.
 */
function updateDb(rows: unknown[]) {
  const set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(rows) }) });
  const unscoped = vi.fn(() => ({ update: vi.fn(() => ({ set })) }));
  return { db: { unscoped } as unknown as TenantDB, set };
}

describe("listDeadReviewJobs", () => {
  it("throws for a teacher before touching the database", async () => {
    const { db, unscoped } = selectDb([]);
    await expect(listDeadReviewJobs({ db, user: teacher, tenant })).rejects.toThrow();
    expect(unscoped).not.toHaveBeenCalled();
  });

  it("defaults to 25 rows from offset 0 and maps only the public columns", async () => {
    const { db, chain } = selectDb([row]);
    const rows = await listDeadReviewJobs({ db, user: admin, tenant });
    expect(chain.limit).toHaveBeenCalledWith(25);
    expect(chain.offset).toHaveBeenCalledWith(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("extraColumn");
    expect(rows[0]).toMatchObject({ id: "job-1", status: "dead", attempts: 5, lastError: "timeout" });
  });

  it.each([
    [{ limit: 0, offset: -5 }, 1, 0],
    [{ limit: 500, offset: 40 }, 100, 40],
    [{ limit: 10 }, 10, 0],
  ])("clamps paging %j", async (input, limit, offset) => {
    const { db, chain } = selectDb([]);
    await listDeadReviewJobs({ db, user: admin, tenant, input });
    expect(chain.limit).toHaveBeenCalledWith(limit);
    expect(chain.offset).toHaveBeenCalledWith(offset);
  });
});

describe("requeueReviewJob", () => {
  it("throws for a teacher", async () => {
    const { db, set } = updateDb([row]);
    await expect(requeueReviewJob({ db, user: teacher, tenant, input: { jobId: "job-1" } })).rejects.toThrow();
    expect(set).not.toHaveBeenCalled();
  });

  it("resets the job to a clean pending run", async () => {
    const { db, set } = updateDb([{ ...row, status: "pending", attempts: 0, lastError: null }]);
    const res = await requeueReviewJob({ db, user: admin, tenant, input: { jobId: "job-1" } });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending", attempts: 0, lastError: null, claimedAt: null, claimedBy: null,
    }));
    expect(res).toMatchObject({ id: "job-1", status: "pending", attempts: 0 });
    expect(res).not.toHaveProperty("extraColumn");
  });

  it("throws when the job does not exist", async () => {
    const { db } = updateDb([]);
    await expect(requeueReviewJob({ db, user: admin, tenant, input: { jobId: "nope" } })).rejects.toThrow("Review job not found");
  });
});
