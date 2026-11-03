import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { AuthError } from "@reading-advantage/auth";
import { salesRouter } from "../routers/sales.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/sales", () => {
  class SalesError extends Error {
    constructor(message: string, public readonly code = "SALES_ERROR") {
      super(message);
    }
  }
  return {
    getModules: vi.fn(),
    getModuleBySlug: vi.fn(),
    getLesson: vi.fn(),
    getScenario: vi.fn(),
    getAttemptsForScenario: vi.fn(),
    getProgressForUser: vi.fn(),
    getDashboardData: vi.fn(),
    getAdminCurriculum: vi.fn(),
    getCohortOverview: vi.fn(),
    getSalesRepDetail: vi.fn(),
    markTheoryLessonComplete: vi.fn(),
    submitQuiz: vi.fn(),
    saveChatMessage: vi.fn(),
    approveCurriculumContent: vi.fn(),
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
    adminCurriculumOutputSchema: z.object({ modules: z.array(z.object({ id: z.string() })) }),
    roleplayAttemptOutputSchema: z.object({ id: z.string() }),
    quizSubmissionInputSchema: z.object({ lessonId: z.string() }),
    quizResultOutputSchema: z.object({ lessonId: z.string(), score: z.number() }),
    progressOutputSchema: z.object({ id: z.string() }),
    chatMessageInputSchema: z.object({ content: z.string() }),
    chatMessageOutputSchema: z.object({ id: z.string() }),
    salesCohortRepOutputSchema: z.object({ userId: z.string() }),
    salesRepDetailOutputSchema: z.object({ rep: z.object({ userId: z.string() }) }),
    approveContentInputSchema: z.object({ lessonId: z.string().optional(), rubricId: z.string().optional() }),
    approveContentOutputSchema: z.object({ id: z.string(), approved: z.boolean() }),
    SalesError,
    SalesAuthError: class extends SalesError {},
    RubricNotApprovedError: class extends SalesError {},
    AudioStorageError: class extends SalesError {},
    ScenarioNotFoundError: class extends SalesError {},
    ModulePrerequisiteNotMetError: class extends SalesError {},
    LessonPrerequisiteNotMetError: class extends SalesError {},
    CurriculumNotApprovedError: class extends SalesError {},
  };
});

import * as sales from "@reading-advantage/domain/sales";

const scenarioId = "30000000-0000-4000-8000-000000000001";
const lessonId = "30000000-0000-4000-8000-000000000002";
const salesRep = { id: "u1", username: "rep1", name: "Rep", role: "SALES_REP", schoolId: null };
const salesAdmin = { ...salesRep, id: "a1", role: "SALES_ADMIN" };
const companyScope = {
  kind: "company" as const,
  applicationKey: "sales" as const,
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
};
const legacySchoolId = "00000000-0000-4000-8000-000000000099";
const legacyScope = { kind: "legacy-school" as const, applicationKey: "sales" as const, schoolId: legacySchoolId };

type Auth = {
  user: { id: string; role: string; schoolId?: string | null };
  tenant: { schoolId: string | null };
  productScope?: unknown;
} | null;

const t = initTRPC.context<{ tenantDb: ReturnType<typeof createTenantDB>; auth: Auth }>().create({ transformer: superjson });
const appRouter = t.router({ sales: salesRouter });

function createCaller(auth: Auth) {
  const tenantDb = createTenantDB({} as unknown as DB, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ tenantDb, auth } as never);
}

const repCaller = () => createCaller({ user: salesRep, tenant: { schoolId: null }, productScope: companyScope });
const adminCaller = () => createCaller({ user: salesAdmin, tenant: { schoolId: null }, productScope: companyScope });

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("sales scope middleware", () => {
  it.each(["STUDENT", "TEACHER", "ADMIN", "SYSTEM"])("forbids role %s from rep procedures", async (role) => {
    const caller = createCaller({ user: { ...salesRep, role }, tenant: { schoolId: null }, productScope: companyScope });

    await expect(caller.sales.progress()).rejects.toMatchObject({ code: "FORBIDDEN", message: "Sales access required" });
    expect(sales.getProgressForUser).not.toHaveBeenCalled();
  });

  it("rejects a rep without a product scope", async () => {
    const caller = createCaller({ user: salesRep, tenant: { schoolId: null } });

    await expect(caller.sales.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN", message: "Verified Sales scope required" });
    expect(sales.getDashboardData).not.toHaveBeenCalled();
  });

  it("rejects a company scope used inside a school tenant", async () => {
    const caller = createCaller({ user: salesRep, tenant: { schoolId: legacySchoolId }, productScope: companyScope });

    await expect(caller.sales.progress()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a legacy-school scope in company mode", async () => {
    const caller = createCaller({ user: salesRep, tenant: { schoolId: null }, productScope: legacyScope });

    await expect(caller.sales.progress()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a scope with an extra field", async () => {
    const caller = createCaller({ user: salesRep, tenant: { schoolId: null }, productScope: { ...companyScope, schoolId: legacySchoolId } });

    await expect(caller.sales.progress()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an anonymous admin caller with UNAUTHORIZED", async () => {
    await expect(createCaller(null).sales.admin.cohortOverview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an admin without a verified scope", async () => {
    const caller = createCaller({ user: salesAdmin, tenant: { schoolId: null }, productScope: { kind: "company" } });

    await expect(caller.sales.admin.approveContent({ lessonId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(sales.approveCurriculumContent).not.toHaveBeenCalled();
  });

  it("passes the parsed scope, user and tenant to the domain", async () => {
    vi.mocked(sales.getProgressForUser).mockResolvedValue([{ id: "p1" }] as never);
    const caller = createCaller({ user: salesRep, tenant: { schoolId: legacySchoolId }, productScope: legacyScope });

    await expect(caller.sales.progress()).resolves.toEqual([{ id: "p1" }]);
    expect(sales.getProgressForUser).toHaveBeenCalledWith(expect.objectContaining({
      user: salesRep,
      tenant: { schoolId: legacySchoolId },
      scope: legacyScope,
    }));
  });
});

describe("sales read procedures", () => {
  it("lesson passes the lesson id", async () => {
    vi.mocked(sales.getLesson).mockResolvedValue({ id: lessonId } as never);

    await expect(repCaller().sales.lesson({ lessonId })).resolves.toEqual({ id: lessonId });
    expect(sales.getLesson).toHaveBeenCalledWith(expect.objectContaining({ scope: companyScope }), { lessonId });
  });

  it("lesson rejects a non-uuid id before the domain", async () => {
    await expect(repCaller().sales.lesson({ lessonId: "abc" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(sales.getLesson).not.toHaveBeenCalled();
  });

  it("scenario passes the scenario id", async () => {
    vi.mocked(sales.getScenario).mockResolvedValue({ id: scenarioId } as never);

    await expect(repCaller().sales.scenario({ scenarioId })).resolves.toEqual({ id: scenarioId });
    expect(sales.getScenario).toHaveBeenCalledWith(expect.anything(), { scenarioId });
  });

  it("attemptHistory returns the attempts of one scenario", async () => {
    vi.mocked(sales.getAttemptsForScenario).mockResolvedValue([{ id: "at1" }] as never);

    await expect(repCaller().sales.attemptHistory({ scenarioId })).resolves.toEqual([{ id: "at1" }]);
    expect(sales.getAttemptsForScenario).toHaveBeenCalledWith(expect.objectContaining({ user: salesRep }), { scenarioId });
  });

  it("dashboard returns the dashboard modules", async () => {
    vi.mocked(sales.getDashboardData).mockResolvedValue([{ id: "m1" }] as never);

    await expect(adminCaller().sales.dashboard()).resolves.toEqual([{ id: "m1" }]);
  });

  it("rejects a domain result that breaks the output contract", async () => {
    vi.mocked(sales.getDashboardData).mockResolvedValue([{ title: "no id" }] as never);

    await expect(repCaller().sales.dashboard()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("admin.repDetail passes the rep id", async () => {
    vi.mocked(sales.getSalesRepDetail).mockResolvedValue({ rep: { userId: "u9" } } as never);

    await expect(adminCaller().sales.admin.repDetail({ repId: "u9" })).resolves.toEqual({ rep: { userId: "u9" } });
    expect(sales.getSalesRepDetail).toHaveBeenCalledWith(expect.anything(), { repId: "u9" });
  });

  it("admin.repDetail forbids a sales rep", async () => {
    await expect(repCaller().sales.admin.repDetail({ repId: "u9" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(sales.getSalesRepDetail).not.toHaveBeenCalled();
  });
});

describe("sales write procedures", () => {
  it("submitQuiz returns the graded result of the domain", async () => {
    vi.mocked(sales.submitQuiz).mockResolvedValue({ lessonId, score: 80 } as never);

    await expect(repCaller().sales.submitQuiz({ lessonId } as never)).resolves.toEqual({ lessonId, score: 80 });
    expect(sales.submitQuiz).toHaveBeenCalledWith(expect.objectContaining({ user: salesRep, scope: companyScope }), { lessonId });
  });

  it("admin.approveContent approves content for a SALES_ADMIN", async () => {
    vi.mocked(sales.approveCurriculumContent).mockResolvedValue({ id: lessonId, approved: true } as never);

    await expect(adminCaller().sales.admin.approveContent({ lessonId })).resolves.toEqual({ id: lessonId, approved: true });
    expect(sales.approveCurriculumContent).toHaveBeenCalledWith(
      expect.objectContaining({ user: salesAdmin, scope: companyScope }),
      { lessonId },
    );
  });

  it("admin.approveContent forbids a sales rep and writes nothing", async () => {
    await expect(repCaller().sales.admin.approveContent({ lessonId })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Sales admin access required" });
    expect(sales.approveCurriculumContent).not.toHaveBeenCalled();
  });
});

describe("sales error mapping", () => {
  const cases: Array<[string, () => unknown, string, string]> = [
    ["AuthError", () => new AuthError("no permission", "FORBIDDEN"), "FORBIDDEN", "Sales access denied"],
    ["SalesAuthError", () => new sales.SalesAuthError("other company"), "FORBIDDEN", "Sales resource unavailable"],
    ["ScenarioNotFoundError", () => new sales.ScenarioNotFoundError("gone"), "NOT_FOUND", "Scenario not found"],
    ["RubricNotApprovedError", () => new sales.RubricNotApprovedError("draft"), "BAD_REQUEST", "Sales curriculum prerequisite not met"],
    ["CurriculumNotApprovedError", () => new sales.CurriculumNotApprovedError("draft"), "BAD_REQUEST", "Sales curriculum prerequisite not met"],
    ["LessonPrerequisiteNotMetError", () => new sales.LessonPrerequisiteNotMetError(lessonId, scenarioId), "BAD_REQUEST", "Sales curriculum prerequisite not met"],
    ["AudioStorageError", () => new sales.AudioStorageError("bucket down"), "INTERNAL_SERVER_ERROR", "Sales service temporarily unavailable"],
    ["a generic SalesError", () => new sales.SalesError("quota", "QUOTA_EXCEEDED"), "BAD_REQUEST", "Sales request could not be completed"],
    ["a not found Error that is not typed", () => new Error("Database connection not found"), "INTERNAL_SERVER_ERROR", "Sales service temporarily unavailable"],
  ];

  it.each(cases)("maps %s", async (_name, make, code, message) => {
    vi.mocked(sales.saveChatMessage).mockRejectedValue(make());

    await expect(repCaller().sales.saveChatMessage({ content: "hi" } as never)).rejects.toMatchObject({ code, message });
  });

  it("does not leak the internal error detail to the caller", async () => {
    vi.mocked(sales.getScenario).mockRejectedValue(new Error("password=hunter2 at db-7"));

    const error = await repCaller().sales.scenario({ scenarioId }).catch((e: unknown) => e);

    expect(String((error as Error).message)).not.toContain("db-7");
  });

  it("logs a structured event with the sales code", async () => {
    vi.mocked(sales.markTheoryLessonComplete).mockRejectedValue(new sales.SalesError("quota", "QUOTA_EXCEEDED"));

    await expect(repCaller().sales.markTheoryLessonComplete({ lessonId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(JSON.parse(String(errorSpy.mock.calls[0][0]))).toEqual({
      level: "error",
      event: "sales_operation_failed",
      errorName: "Error",
      salesCode: "QUOTA_EXCEEDED",
      detail: "quota",
    });
  });

  it("rethrows a non-Error value, which tRPC reports as INTERNAL_SERVER_ERROR", async () => {
    vi.mocked(sales.getAdminCurriculum).mockRejectedValue("plain string");

    await expect(adminCaller().sales.admin.curriculum()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(JSON.parse(String(errorSpy.mock.calls[0][0]))).toMatchObject({ errorName: "UnknownError", detail: "plain string" });
  });

  it("maps errors from admin.cohortOverview and admin.repDetail", async () => {
    vi.mocked(sales.getCohortOverview).mockRejectedValue(new sales.SalesAuthError("x"));
    vi.mocked(sales.getSalesRepDetail).mockRejectedValue(new sales.ScenarioNotFoundError("x"));

    await expect(adminCaller().sales.admin.cohortOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminCaller().sales.admin.repDetail({ repId: "u2" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("maps errors from every rep procedure", async () => {
    const rejectWith = new sales.ModulePrerequisiteNotMetError("advanced", "basics");
    for (const fn of [sales.getModules, sales.getModuleBySlug, sales.getLesson, sales.getAttemptsForScenario, sales.getProgressForUser, sales.getDashboardData, sales.submitQuiz, sales.approveCurriculumContent]) {
      vi.mocked(fn).mockRejectedValue(rejectWith);
    }
    const rep = repCaller();
    const admin = adminCaller();

    await expect(rep.sales.modules()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(rep.sales.moduleBySlug({ slug: "s" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(rep.sales.lesson({ lessonId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(rep.sales.attemptHistory({ scenarioId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(rep.sales.progress()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(rep.sales.dashboard()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(rep.sales.submitQuiz({ lessonId } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin.sales.admin.approveContent({ lessonId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
