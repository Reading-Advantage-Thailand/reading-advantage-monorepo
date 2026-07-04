import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTRPC } from "@trpc/server";
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

import { requeueReviewJob } from "@reading-advantage/domain/codecamp";

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

describe("Phase 4 — admin requeue dead review job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requeueReviewJob resets a dead job to pending with attempts=0", async () => {
    const adminUser = { id: "a1", role: "ADMIN", schoolId: null };
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    vi.mocked(requeueReviewJob).mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
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

    const result = await caller.codecamp.requeueReviewJob({ jobId: "00000000-0000-4000-8000-000000000001" });

    expect(result.status, "requeued job status").toBe("pending");
    expect(result.attempts, "requeued job attempts").toBe(0);
  });

  it("rejects non-admin callers", async () => {
    const studentUser = { id: "u1", role: "STUDENT", schoolId: null };
    const caller = createCaller({ user: studentUser, tenant: testTenant });

    await expect(
      caller.codecamp.requeueReviewJob({ jobId: "00000000-0000-4000-8000-000000000001" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("validates the jobId input", async () => {
    const adminUser = { id: "a1", role: "ADMIN", schoolId: null };
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    await expect(
      caller.codecamp.requeueReviewJob({ jobId: "not-a-uuid" as unknown as string })
    ).rejects.toBeDefined();
  });
});
