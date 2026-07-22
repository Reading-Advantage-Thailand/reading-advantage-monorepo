import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Tenant, UserContext } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { requeueReviewJob } from "../codecamp/review-jobs.js";

const JOB_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER: UserContext = {
  id: "admin-1",
  username: "admin",
  name: "Admin",
  role: "ADMIN",
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};
const GLOBAL_TENANT: Tenant = { schoolId: null };

type CurrentStatus = "pending" | "claimed" | "succeeded" | "failed" | "dead";

function currentRow(status: CurrentStatus) {
  return {
    id: JOB_ID,
    prOwner: "reading-advantage",
    prRepo: "codecamp",
    prPullNumber: 42,
    prUrl: "https://github.com/reading-advantage/codecamp/pull/42",
    status,
    attempts: 3,
    maxAttempts: 5,
    nextAttemptAt: new Date("2026-07-22T00:00:00.000Z"),
    lastError: "prior failure",
    claimedAt: status === "claimed" ? new Date("2026-07-22T00:01:00.000Z") : null,
    claimedBy: status === "claimed" ? "worker-b" : null,
    reviewId: null,
    payloadJson: null,
    deliveryId: null,
    createdAt: new Date("2026-07-21T00:00:00.000Z"),
    updatedAt: new Date("2026-07-22T00:00:00.000Z"),
  };
}

function createReplayDb(status: CurrentStatus) {
  const before = currentRow(status);
  let whereParams: unknown[] = [];
  const rawDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((patch: Record<string, unknown>) => ({
        where: vi.fn().mockImplementation((condition: unknown) => {
          whereParams = new PgDialect().sqlToQuery(condition as never).params;
          return {
            returning: vi.fn().mockResolvedValue([{ ...before, ...patch }]),
          };
        }),
      })),
    }),
  };
  const tenantDb = {
    unscoped: vi.fn().mockReturnValue(rawDb),
  } as unknown as TenantDB;
  return { tenantDb, getWhereParams: () => whereParams };
}

describe("Durable worker Task 2 — current replay state limitation", () => {
  it.each<CurrentStatus>(["pending", "claimed", "succeeded", "failed", "dead"])(
    "requeues a %s job because replay predicates only on id",
    async (status) => {
      const { tenantDb, getWhereParams } = createReplayDb(status);

      const result = await requeueReviewJob({
        db: tenantDb,
        user: ADMIN_USER,
        tenant: GLOBAL_TENANT,
        input: { jobId: JOB_ID },
      });

      expect(result.status, `${status} replay status`).toBe("pending");
      expect(result.attempts, `${status} replay attempts`).toBe(0);
      expect(result.claimedAt, `${status} replay claimedAt`).toBeNull();
      expect(result.claimedBy, `${status} replay claimedBy`).toBeNull();
      expect(getWhereParams(), `${status} replay WHERE parameters`).toEqual([JOB_ID]);
    },
  );
});
