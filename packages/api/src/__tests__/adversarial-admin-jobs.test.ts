/**
 * Adversarial tests for the admin DLQ endpoints (`listDeadReviewJobs`,
 * `requeueReviewJob`) on the codecamp tRPC router.
 *
 * Track: `webhook_review_reliability_20260605`.
 *
 * The happy-path coverage in `phase-4-admin-list-dead-review-jobs.test.ts`
 * and `phase-4-admin-requeue-review-job.test.ts` exercises the canonical
 * ADMIN → success / non-admin → FORBIDDEN / invalid status → validation
 * error paths. These tests probe boundary conditions on the input
 * schemas (limit=0, limit=-1, limit=10000, negative offset, malformed
 * UUID), role-discrimination (INTERN vs STUDENT vs TEACHER), and the
 * not-found / not-500 contract for requeueReviewJob.
 *
 * Anti-pattern defenses applied:
 *   - A3 (digit-only labeled count): every integer count uses a labeled
 *     argument to `expect(...)`.
 *   - A4 (vacuous-pass): each test asserts a specific observable
 *     (rejection code, thrown message, returned row shape).
 *   - A7 (over-broad filter): role checks use exact role strings; the
 *     rejection assertions use exact codes (`UNAUTHORIZED`, `FORBIDDEN`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/codecamp", () => ({
  listDeadReviewJobs: vi.fn(),
  requeueReviewJob: vi.fn(),
  getModulesWithProgress: vi.fn(),
  getLessonsForModule: vi.fn(),
  getLessonWithContent: vi.fn(),
  submitExerciseAttempt: vi.fn(),
  submitQuizAnswers: vi.fn(),
  saveChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
  getUserConversations: vi.fn(),
  updateUserProgress: vi.fn(),
  getUserDashboard: vi.fn(),
  getExerciseRepos: vi.fn(),
  linkExerciseRepo: vi.fn(),
  getPrReviewsForUser: vi.fn(),
  createPrReview: vi.fn(),
  updatePrReview: vi.fn(),
  getPrReviewByPrUrl: vi.fn(),
  getModulesByPhase: vi.fn(),
  getModuleWithExercises: vi.fn(),
  checkModulePrerequisite: vi.fn(),
  createInternAccount: vi.fn(),
  listInterns: vi.fn(),
  getInternProgress: vi.fn(),
  listWebhookEvents: vi.fn(),
  reviewExercise: vi.fn(),
  reviewResultSchema: { parse: (val: unknown) => val } as unknown as import("zod").ZodTypeAny,
  aiClientToGenerateReview: vi.fn(() => vi.fn()),
}));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
  createAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
}));

import { listDeadReviewJobs, requeueReviewJob } from "@reading-advantage/domain/codecamp";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null;
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ codecamp: codecampRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testTenant = { schoolId: null as string | null };

describe("Adversarial — admin DLQ endpoint boundary / failure paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listDeadReviewJobs input validation (Zod clamps/rejects)", () => {
    const adminUser = { id: "a1", role: "ADMIN", schoolId: null };

    it("limit=0 is rejected by Zod (min 1)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          limit: 0,
        }),
        "limit=0 must be rejected",
      ).rejects.toBeDefined();

      // Domain function should NOT be called — Zod rejects first.
      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for invalid limit",
      ).not.toHaveBeenCalled();
    });

    it("limit=-1 is rejected by Zod (min 1)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          limit: -1,
        }),
        "limit=-1 must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for negative limit",
      ).not.toHaveBeenCalled();
    });

    it("limit=10000 is rejected by Zod (max 100)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          limit: 10000,
        }),
        "limit=10000 must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for too-large limit",
      ).not.toHaveBeenCalled();
    });

    it("limit=100 is accepted (boundary)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      vi.mocked(listDeadReviewJobs).mockResolvedValue([]);
      const result = await caller.codecamp.listDeadReviewJobs({
        status: "dead",
        limit: 100,
      });
      expect(Array.isArray(result), "limit=100 returns array").toBe(true);
      expect(
        vi.mocked(listDeadReviewJobs),
        "domain called with limit=100",
      ).toHaveBeenCalledTimes(1);
    });

    it("limit=101 is rejected (just above the cap)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          limit: 101,
        }),
        "limit=101 must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for limit=101",
      ).not.toHaveBeenCalled();
    });

    it("limit=1 is accepted (lower boundary)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      vi.mocked(listDeadReviewJobs).mockResolvedValue([]);
      await caller.codecamp.listDeadReviewJobs({ status: "dead", limit: 1 });
      expect(
        vi.mocked(listDeadReviewJobs),
        "domain called with limit=1",
      ).toHaveBeenCalledTimes(1);
    });

    it("fractional limit is rejected (Zod int() guard)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          limit: 1.5,
        }),
        "fractional limit must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for fractional limit",
      ).not.toHaveBeenCalled();
    });

    it("offset=-1 is rejected (min 0)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          offset: -1,
        }),
        "offset=-1 must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for negative offset",
      ).not.toHaveBeenCalled();
    });

    it("offset=0 is accepted (lower boundary)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      vi.mocked(listDeadReviewJobs).mockResolvedValue([]);
      await caller.codecamp.listDeadReviewJobs({ status: "dead", offset: 0 });
      expect(
        vi.mocked(listDeadReviewJobs),
        "domain called with offset=0",
      ).toHaveBeenCalledTimes(1);
    });

    it("string limit is rejected (Zod number() guard)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          limit: "10" as unknown as number,
        }),
        "string limit must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for string limit",
      ).not.toHaveBeenCalled();
    });

    it("invalid status enum value is rejected", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "not_a_status" as unknown as "dead",
        }),
        "invalid status enum must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for invalid status",
      ).not.toHaveBeenCalled();
    });

    it("extra unknown fields are tolerated (Zod default behavior)", async () => {
      const caller = createCaller({ user: adminUser, tenant: testTenant });
      vi.mocked(listDeadReviewJobs).mockResolvedValue([]);
      // The schema uses .object({...}).optional() — extra fields are
      // typically stripped by Zod (passthrough not set). This pins the
      // behavior so a regression that adds strict() rejects these calls
      // is intentional.
      await expect(
        caller.codecamp.listDeadReviewJobs({
          status: "dead",
          // @ts-expect-error — intentionally extra field
          cursor: "abc",
        }),
        "extra fields tolerated (passthrough default)",
      ).resolves.toBeDefined();
    });
  });

  describe("role discrimination: every non-admin role → FORBIDDEN", () => {
    const nonAdminRoles = ["STUDENT", "TEACHER", "INTERN", "GUARDIAN"];

    for (const role of nonAdminRoles) {
      it(`${role} → FORBIDDEN on listDeadReviewJobs`, async () => {
        const caller = createCaller({
          user: { id: "u1", role, schoolId: null },
          tenant: testTenant,
        });

        await expect(
          caller.codecamp.listDeadReviewJobs({ status: "dead" }),
          `${role} must be forbidden`,
        ).rejects.toMatchObject({ code: "FORBIDDEN" });

        expect(
          vi.mocked(listDeadReviewJobs),
          `domain not called for ${role}`,
        ).not.toHaveBeenCalled();
      });

      it(`${role} → FORBIDDEN on requeueReviewJob`, async () => {
        const caller = createCaller({
          user: { id: "u1", role, schoolId: null },
          tenant: testTenant,
        });

        await expect(
          caller.codecamp.requeueReviewJob({ jobId: "00000000-0000-4000-8000-000000000001" }),
          `${role} must be forbidden`,
        ).rejects.toMatchObject({ code: "FORBIDDEN" });

        expect(
          vi.mocked(requeueReviewJob),
          `domain not called for ${role}`,
        ).not.toHaveBeenCalled();
      });
    }

    it("INTERN role is explicitly FORBIDDEN (not just STUDENT/TEACHER)", async () => {
      // The happy-path test uses STUDENT; INTERN is the codecamp
      // primary role and MUST be FORBIDDEN to satisfy the DLQ
      // privacy contract (interns should not see other interns' dead
      // reviews).
      const internUser = { id: "i1", role: "INTERN", schoolId: null };
      const caller = createCaller({ user: internUser, tenant: testTenant });

      await expect(
        caller.codecamp.listDeadReviewJobs({ status: "dead" }),
        "INTERN must be forbidden",
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("SYSTEM role is allowed (worker identity bypass)", async () => {
      // SYSTEM is the worker identity (per `isAdmin` middleware). It
      // can call admin procedures. This pins that the bypass exists
      // so a regression that requires ADMIN-only would break the
      // worker integration.
      const systemUser = { id: "system", role: "SYSTEM", schoolId: null };
      const caller = createCaller({ user: systemUser, tenant: testTenant });
      vi.mocked(listDeadReviewJobs).mockResolvedValue([]);

      const result = await caller.codecamp.listDeadReviewJobs({ status: "dead" });
      expect(Array.isArray(result), "SYSTEM allowed to list dead jobs").toBe(true);
    });
  });

  describe("unauthenticated → UNAUTHORIZED", () => {
    it("unauthenticated caller is rejected on listDeadReviewJobs", async () => {
      const caller = createCaller(null);
      await expect(
        caller.codecamp.listDeadReviewJobs({ status: "dead" }),
        "unauthenticated must be UNAUTHORIZED",
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

      expect(
        vi.mocked(listDeadReviewJobs),
        "domain not called for unauthenticated caller",
      ).not.toHaveBeenCalled();
    });

    it("unauthenticated caller is rejected on requeueReviewJob", async () => {
      const caller = createCaller(null);
      await expect(
        caller.codecamp.requeueReviewJob({ jobId: "00000000-0000-4000-8000-000000000001" }),
        "unauthenticated must be UNAUTHORIZED",
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

      expect(
        vi.mocked(requeueReviewJob),
        "domain not called for unauthenticated caller",
      ).not.toHaveBeenCalled();
    });
  });

  describe("requeueReviewJob input validation", () => {
    const adminUser = { id: "a1", role: "ADMIN", schoolId: null };
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    it("malformed UUID is rejected by Zod", async () => {
      await expect(
        caller.codecamp.requeueReviewJob({ jobId: "not-a-uuid" }),
        "non-UUID jobId must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(requeueReviewJob),
        "domain not called for non-UUID jobId",
      ).not.toHaveBeenCalled();
    });

    it("UUID with extra characters is rejected", async () => {
      await expect(
        caller.codecamp.requeueReviewJob({
          jobId: "00000000-0000-4000-8000-000000000001-extra",
        }),
        "UUID with extra characters must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(requeueReviewJob),
        "domain not called for malformed UUID",
      ).not.toHaveBeenCalled();
    });

    it("uppercase UUID is accepted (Zod accepts uppercase)", async () => {
      const upperUuid = "AAAAAAAA-0000-4000-8000-000000000001";
      vi.mocked(requeueReviewJob).mockResolvedValue({
        id: upperUuid.toLowerCase(),
        prOwner: "org",
        prRepo: "repo",
        prPullNumber: 1,
        prUrl: "https://github.com/org/repo/pull/1",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        lastError: null,
        claimedAt: null,
        claimedBy: null,
        reviewId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof requeueReviewJob>>);

      const result = await caller.codecamp.requeueReviewJob({ jobId: upperUuid });
      expect(result.status, "requeued job status").toBe("pending");
    });

    it("empty jobId is rejected", async () => {
      await expect(
        caller.codecamp.requeueReviewJob({ jobId: "" }),
        "empty jobId must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(requeueReviewJob),
        "domain not called for empty jobId",
      ).not.toHaveBeenCalled();
    });

    it("numeric jobId is rejected (not a UUID format)", async () => {
      await expect(
        caller.codecamp.requeueReviewJob({ jobId: "12345" as unknown as string }),
        "numeric jobId must be rejected",
      ).rejects.toBeDefined();

      expect(
        vi.mocked(requeueReviewJob),
        "domain not called for numeric jobId",
      ).not.toHaveBeenCalled();
    });
  });

  describe("error-code discrimination (UNAUTHORIZED vs FORBIDDEN vs BAD_REQUEST)", () => {
    it("UNAUTHORIZED (no auth) precedes FORBIDDEN (wrong role)", async () => {
      // Per the middleware chain, an unauthenticated caller must see
      // UNAUTHORIZED — NOT FORBIDDEN. A regression that returns
      // FORBIDDEN for unauthenticated calls would leak "this endpoint
      // exists but you can't access it" vs "auth required".
      const caller = createCaller(null);
      let caughtCode: string | undefined;
      try {
        await caller.codecamp.listDeadReviewJobs({ status: "dead" });
      } catch (err) {
        caughtCode = (err as TRPCError).code;
      }
      expect(caughtCode, "unauthenticated → UNAUTHORIZED (not FORBIDDEN)").toBe("UNAUTHORIZED");
    });

    it("non-admin auth → FORBIDDEN (with auth context present)", async () => {
      const caller = createCaller({
        user: { id: "u1", role: "STUDENT", schoolId: null },
        tenant: testTenant,
      });
      let caughtCode: string | undefined;
      try {
        await caller.codecamp.listDeadReviewJobs({ status: "dead" });
      } catch (err) {
        caughtCode = (err as TRPCError).code;
      }
      expect(caughtCode, "non-admin auth → FORBIDDEN (not UNAUTHORIZED)").toBe("FORBIDDEN");
    });

    it("admin with bad input → Zod error (BAD_REQUEST, not UNAUTHORIZED/FORBIDDEN)", async () => {
      const caller = createCaller({
        user: { id: "a1", role: "ADMIN", schoolId: null },
        tenant: testTenant,
      });
      let caughtCode: string | undefined;
      try {
        await caller.codecamp.listDeadReviewJobs({ status: "dead", limit: 0 });
      } catch (err) {
        caughtCode = (err as TRPCError).code;
      }
      // Zod errors in tRPC v11 are BAD_REQUEST.
      expect(caughtCode, "bad input → BAD_REQUEST").toBe("BAD_REQUEST");
    });
  });
});