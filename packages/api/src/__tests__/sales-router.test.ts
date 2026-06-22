import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { salesRouter } from "../routers/sales.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/sales", () => ({
  getModules: vi.fn(),
  getModuleBySlug: vi.fn(),
  getLesson: vi.fn(),
  getScenario: vi.fn(),
  getAttemptsForScenario: vi.fn(),
  getBestAttemptForScenario: vi.fn(),
  getProgressForUser: vi.fn(),
  getDashboardData: vi.fn(),
  getCohortOverview: vi.fn(),
  markTheoryLessonComplete: vi.fn(),
  createRoleplayAttempt: vi.fn(),
  saveAttemptEvaluation: vi.fn(),
  submitRoleplayAttempt: vi.fn(),
  submitQuiz: vi.fn(),
  saveChatMessage: vi.fn(),
  createRepAccount: vi.fn(),
  approveCurriculumContent: vi.fn(),
  aiClientToEvaluateRoleplay: vi.fn(() => vi.fn()),
  buildEvaluationPrompt: vi.fn(),
  moduleOutputSchema: z.object({ id: z.string() }),
  lessonOutputSchema: z.object({ id: z.string() }),
  roleplayScenarioOutputSchema: z.object({ id: z.string() }),
  rubricOutputSchema: z.object({ id: z.string() }),
  roleplayAttemptOutputSchema: z.object({ id: z.string() }),
  roleplayEvaluationResultSchema: z.object({ overallScore: z.number() }),
  quizSubmissionInputSchema: z.object({ lessonId: z.string() }),
  quizResultOutputSchema: z.object({ lessonId: z.string() }),
  progressOutputSchema: z.object({ id: z.string() }),
  chatMessageInputSchema: z.object({ content: z.string() }),
  chatMessageOutputSchema: z.object({ id: z.string() }),
  conversationOutputSchema: z.object({ id: z.string() }),
  createRepInputSchema: z.object({ username: z.string() }),
  approveContentInputSchema: z.object({}),
  SalesError: class extends Error {},
  RubricNotApprovedError: class extends Error {},
  AudioStorageError: class extends Error {},
  ScenarioNotFoundError: class extends Error {},
  ModulePrerequisiteNotMetError: class extends Error {},
  CurriculumNotApprovedError: class extends Error {},
}));

import {
  getModules,
  getModuleBySlug,
  submitQuiz,
  saveChatMessage,
  createRepAccount,
  getCohortOverview,
} from "@reading-advantage/domain/sales";

const salesRep = {
  id: "u1",
  username: "rep1",
  name: "Rep",
  role: "SALES_REP",
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

const salesAdmin = {
  ...salesRep,
  id: "a1",
  role: "SALES_ADMIN",
};

const globalTenant = { schoolId: null as string | null };

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: {
    user: { id: string; role: string; schoolId?: string | null };
    tenant: { schoolId: string | null };
  } | null;
}>().create({ transformer: superjson });

const appRouter = t.router({ sales: salesRouter });

function createCaller(
  auth: {
    user: { id: string; role: string; schoolId?: string | null };
    tenant: { schoolId: string | null };
  } | null,
) {
  const tenantDb = createTenantDB(
    {} as unknown as DB,
    auth?.tenant ?? { schoolId: null },
  );
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("salesRouter", () => {
  it("modules calls getModules domain function", async () => {
    vi.mocked(getModules).mockResolvedValue([
      { id: "m1", slug: "onboarding", title: "Onboarding", description: "d", phase: "Foundations", order: 1, createdAt: new Date() },
    ] as unknown as Awaited<ReturnType<typeof getModules>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant });
    const result = await caller.sales.modules();
    expect(getModules).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("moduleBySlug passes slug through", async () => {
    vi.mocked(getModuleBySlug).mockResolvedValue({
      id: "m1", slug: "onboarding", title: "Onboarding", description: "d", phase: "Foundations", order: 1, createdAt: new Date(), lessons: [],
    } as unknown as Awaited<ReturnType<typeof getModuleBySlug>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant });
    await caller.sales.moduleBySlug({ slug: "onboarding" });
    expect(getModuleBySlug).toHaveBeenCalled();
    const input = vi.mocked(getModuleBySlug).mock.calls[0][1] as { slug: string };
    expect(input.slug).toBe("onboarding");
  });

  it("submitQuiz returns the quiz result", async () => {
    vi.mocked(submitQuiz).mockResolvedValue({
      lessonId: "l1", score: 100, passed: true, results: [],
    } as unknown as Awaited<ReturnType<typeof submitQuiz>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant });
    await caller.sales.submitQuiz({ lessonId: "l1", answers: {} });
    expect(submitQuiz).toHaveBeenCalled();
  });

  it("saveChatMessage returns message + conversationId", async () => {
    vi.mocked(saveChatMessage).mockResolvedValue({
      message: { id: "m1", conversationId: "c1", role: "user", content: "hi", createdAt: new Date() },
      conversationId: "c1",
    } as unknown as Awaited<ReturnType<typeof saveChatMessage>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant });
    const result = await caller.sales.saveChatMessage({ role: "user", content: "hi" });
    expect(result.conversationId).toBe("c1");
  });

  it("admin.createRep requires SALES_ADMIN", async () => {
    vi.mocked(createRepAccount).mockResolvedValue({
      username: "r2", password: "password1", displayName: "R2",
    } as unknown as Awaited<ReturnType<typeof createRepAccount>>);
    const repCaller = createCaller({ user: salesRep, tenant: globalTenant });
    await expect(
      repCaller.sales.admin.createRep({ username: "r2", password: "password1", displayName: "R2" }),
    ).rejects.toThrow(/Sales admin access required/);
    const adminCaller = createCaller({ user: salesAdmin, tenant: globalTenant });
    const result = await adminCaller.sales.admin.createRep({
      username: "r2", password: "password1", displayName: "R2",
    });
    expect(result.username).toBe("r2");
  });

  it("admin.cohortOverview requires SALES_ADMIN", async () => {
    vi.mocked(getCohortOverview).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof getCohortOverview>>);
    const repCaller = createCaller({ user: salesRep, tenant: globalTenant });
    await expect(repCaller.sales.admin.cohortOverview()).rejects.toThrow(/Sales admin access required/);
    const adminCaller = createCaller({ user: salesAdmin, tenant: globalTenant });
    const result = await adminCaller.sales.admin.cohortOverview();
    expect(result).toEqual([]);
  });
});
