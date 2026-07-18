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
  getAdminCurriculum: vi.fn(),
  getCohortOverview: vi.fn(),
  getSalesRepDetail: vi.fn(),
  markTheoryLessonComplete: vi.fn(),
  createRoleplayAttempt: vi.fn(),
  saveAttemptEvaluation: vi.fn(),
  submitRoleplayAttempt: vi.fn(),
  submitQuiz: vi.fn(),
  saveChatMessage: vi.fn(),
  approveCurriculumContent: vi.fn(),
  aiClientToEvaluateRoleplay: vi.fn(() => vi.fn()),
  buildEvaluationPrompt: vi.fn(),
  salesAccessScopeSchema: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("company"),
      applicationKey: z.literal("sales"),
      organizationId: z.string().uuid(),
      organizationKey: z.string(),
    }),
    z.strictObject({
      kind: z.literal("legacy-school"),
      applicationKey: z.literal("sales"),
      schoolId: z.string(),
    }),
  ]),
  moduleOutputSchema: z.object({ id: z.string() }),
  moduleBySlugOutputSchema: z.object({ id: z.string() }),
  lessonDetailOutputSchema: z.object({ id: z.string() }),
  scenarioDetailOutputSchema: z.object({ id: z.string() }),
  dashboardModuleOutputSchema: z.object({ id: z.string() }),
  adminCurriculumOutputSchema: z.object({
    modules: z.array(z.object({ id: z.string() })),
    rubrics: z.array(z.object({ id: z.string() })),
  }),
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
  salesCohortRepOutputSchema: z.object({ userId: z.string() }),
  salesRepDetailOutputSchema: z.object({
    rep: z.object({ userId: z.string() }),
  }),
  approveContentInputSchema: z.object({}),
  approveContentOutputSchema: z.object({ id: z.string() }),
  SalesError: class extends Error {
    code = "SALES_ERROR";
  },
  SalesAuthError: class extends Error {},
  RubricNotApprovedError: class extends Error {},
  AudioStorageError: class extends Error {},
  ScenarioNotFoundError: class extends Error {},
  ModulePrerequisiteNotMetError: class extends Error {},
  LessonPrerequisiteNotMetError: class extends Error {},
  CurriculumNotApprovedError: class extends Error {},
}));

import {
  getModules,
  getModuleBySlug,
  submitQuiz,
  saveChatMessage,
  getCohortOverview,
  getSalesRepDetail,
  getAdminCurriculum,
  markTheoryLessonComplete,
  ModulePrerequisiteNotMetError,
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
const companyScope = {
  kind: "company" as const,
  applicationKey: "sales" as const,
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
};

const t = initTRPC
  .context<{
    tenantDb: ReturnType<typeof createTenantDB>;
    auth: {
      user: { id: string; role: string; schoolId?: string | null };
      tenant: { schoolId: string | null };
      productScope?: typeof companyScope;
    } | null;
  }>()
  .create({ transformer: superjson });

const appRouter = t.router({ sales: salesRouter });

function createCaller(
  auth: {
    user: { id: string; role: string; schoolId?: string | null };
    tenant: { schoolId: string | null };
    productScope?: typeof companyScope;
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
  it("rejects an anonymous Sales caller with UNAUTHORIZED", async () => {
    const caller = createCaller(null);
    await expect(caller.sales.modules()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("modules calls getModules domain function", async () => {
    vi.mocked(getModules).mockResolvedValue([
      {
        id: "m1",
        slug: "onboarding",
        title: "Onboarding",
        description: "d",
        phase: "Foundations",
        order: 1,
        createdAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof getModules>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });
    const result = await caller.sales.modules();
    expect(getModules).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("moduleBySlug passes slug through", async () => {
    vi.mocked(getModuleBySlug).mockResolvedValue({
      id: "m1",
      slug: "onboarding",
      title: "Onboarding",
      description: "d",
      phase: "Foundations",
      order: 1,
      createdAt: new Date(),
      lessons: [],
    } as unknown as Awaited<ReturnType<typeof getModuleBySlug>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });
    await caller.sales.moduleBySlug({ slug: "onboarding" });
    expect(getModuleBySlug).toHaveBeenCalled();
    const input = vi.mocked(getModuleBySlug).mock.calls[0][1] as {
      slug: string;
    };
    expect(input.slug).toBe("onboarding");
  });

  it("moduleBySlug maps unmet learning prerequisites to BAD_REQUEST", async () => {
    vi.mocked(getModuleBySlug).mockRejectedValue(
      new ModulePrerequisiteNotMetError("advanced", "foundations"),
    );
    const caller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });

    await expect(
      caller.sales.moduleBySlug({ slug: "advanced" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("submitQuiz returns the quiz result", async () => {
    vi.mocked(submitQuiz).mockResolvedValue({
      lessonId: "l1",
      score: 100,
      passed: true,
      results: [],
    } as unknown as Awaited<ReturnType<typeof submitQuiz>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });
    await caller.sales.submitQuiz({ lessonId: "l1", answers: {} });
    expect(submitQuiz).toHaveBeenCalled();
  });

  it("markTheoryLessonComplete uses the protected domain mutation", async () => {
    vi.mocked(markTheoryLessonComplete).mockResolvedValue({
      id: "p1",
    } as unknown as Awaited<ReturnType<typeof markTheoryLessonComplete>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });

    const result = await caller.sales.markTheoryLessonComplete({
      lessonId: "00000000-0000-4000-8000-000000000001",
    });

    expect(result).toEqual({ id: "p1" });
    expect(markTheoryLessonComplete).toHaveBeenCalledOnce();
  });

  it("saveChatMessage returns message + conversationId", async () => {
    vi.mocked(saveChatMessage).mockResolvedValue({
      message: {
        id: "m1",
        conversationId: "c1",
        role: "user",
        content: "hi",
        createdAt: new Date(),
      },
      conversationId: "c1",
    } as unknown as Awaited<ReturnType<typeof saveChatMessage>>);
    const caller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });
    const result = await caller.sales.saveChatMessage({
      role: "user",
      content: "hi",
    });
    expect(result.conversationId).toBe("c1");
  });

  it("does not expose a Sales credential-creation procedure", () => {
    const caller = createCaller({ user: salesAdmin, tenant: globalTenant, productScope: companyScope });
    expect(
      Object.prototype.hasOwnProperty.call(caller.sales.admin, "createRep"),
    ).toBe(false);
  });

  it("admin.cohortOverview requires SALES_ADMIN", async () => {
    vi.mocked(getCohortOverview).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof getCohortOverview>>,
    );
    const repCaller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });
    await expect(repCaller.sales.admin.cohortOverview()).rejects.toThrow(
      /Sales admin access required/,
    );
    const adminCaller = createCaller({
      user: salesAdmin,
      tenant: globalTenant,
      productScope: companyScope,
    });
    const result = await adminCaller.sales.admin.cohortOverview();
    expect(result).toEqual([]);
  });

  it("admin.repDetail returns the exact typed reporting contract", async () => {
    vi.mocked(getSalesRepDetail).mockResolvedValue({
      rep: { userId: "rep-1" },
    } as unknown as Awaited<ReturnType<typeof getSalesRepDetail>>);
    const adminCaller = createCaller({
      user: salesAdmin,
      tenant: globalTenant,
      productScope: companyScope,
    });
    await expect(
      adminCaller.sales.admin.repDetail({ repId: "rep-1" }),
    ).resolves.toEqual({ rep: { userId: "rep-1" } });
  });

  it("admin.curriculum exposes the full review model only to SALES_ADMIN", async () => {
    vi.mocked(getAdminCurriculum).mockResolvedValue({
      modules: [{ id: "m1" }],
      rubrics: [{ id: "r1" }],
    } as unknown as Awaited<ReturnType<typeof getAdminCurriculum>>);
    const repCaller = createCaller({ user: salesRep, tenant: globalTenant, productScope: companyScope });
    await expect(repCaller.sales.admin.curriculum()).rejects.toThrow(
      /Sales admin access required/,
    );

    const adminCaller = createCaller({
      user: salesAdmin,
      tenant: globalTenant,
      productScope: companyScope,
    });
    await expect(adminCaller.sales.admin.curriculum()).resolves.toEqual({
      modules: [{ id: "m1" }],
      rubrics: [{ id: "r1" }],
    });
  });
});
