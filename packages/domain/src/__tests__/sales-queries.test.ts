import { describe, it, expect } from "vitest";
import {
  getModules,
  getModuleBySlug,
  getLesson,
  getScenario,
  getAttemptsForScenario,
  getBestAttemptForScenario,
  getProgressForUser,
  getDashboardData,
  getCohortOverview,
} from "../sales/queries.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const salesRep = {
  id: "u1",
  username: "rep1",
  name: "Rep One",
  role: "SALES_REP" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const salesAdmin = {
  ...salesRep,
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "SALES_ADMIN" as const,
};

const globalTenant = { schoolId: null };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

describe("sales queries", () => {
  it("getModules returns all modules ordered", async () => {
    const modules = [
      { id: "m1", slug: "onboarding", title: "Onboarding", description: "d", phase: "Foundations", order: 1, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: modules });
    const result = await getModules({ db: wrapDb(db), user: salesRep, tenant: globalTenant });
    expect(result).toEqual(modules);
  });

  it("getModuleBySlug returns module with lessons", async () => {
    const moduleRow = { id: "m1", slug: "onboarding", title: "Onboarding", description: "d", phase: "Foundations", order: 1, createdAt: new Date() };
    const lessons = [{ id: "l1", moduleId: "m1", title: "L1", type: "theory", content: "", order: 1, reviewStatus: "approved", createdAt: new Date() }];
    const db = createMockDb({ selectSequence: [[moduleRow], lessons] });
    const result = await getModuleBySlug({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { slug: "onboarding" });
    expect(result.id).toBe("m1");
    expect(result.lessons).toEqual(lessons);
  });

  it("getModuleBySlug throws when module not found", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      getModuleBySlug({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { slug: "nope" }),
    ).rejects.toThrow("Module not found");
  });

  it("getLesson returns a roleplay lesson with scenarios", async () => {
    const lesson = { id: "l1", moduleId: "m1", title: "Cold Call", type: "roleplay", content: "", order: 1, reviewStatus: "approved", createdAt: new Date() };
    const scenarios = [{ id: "s1", lessonId: "l1", personaName: "Dir", personaRole: "Director", situation: "s", objective: "o", prospectContextJson: {}, rubricId: "r1", order: 1, createdAt: new Date() }];
    const db = createMockDb({ selectSequence: [[lesson], scenarios] });
    const result = await getLesson({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { lessonId: "l1" });
    expect(result.id).toBe("l1");
    expect(result.scenarios).toEqual(scenarios);
  });

  it("getLesson throws CurriculumNotApprovedError for draft lessons", async () => {
    const lesson = { id: "l1", moduleId: "m1", title: "L", type: "theory", content: "", order: 1, reviewStatus: "draft", createdAt: new Date() };
    const db = createMockDb({ selectResults: [lesson] });
    await expect(
      getLesson({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { lessonId: "l1" }),
    ).rejects.toThrow(/not approved/);
  });

  it("getScenario returns scenario with rubric", async () => {
    const scenario = { id: "s1", lessonId: "l1", personaName: "Dir", personaRole: "Director", situation: "s", objective: "o", prospectContextJson: {}, rubricId: "r1", order: 1, createdAt: new Date() };
    const rubric = { id: "r1", name: "Cold Call Rubric", criteriaJson: [], reviewStatus: "approved", createdAt: new Date() };
    const db = createMockDb({ selectSequence: [[scenario], [rubric]] });
    const result = await getScenario({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { scenarioId: "s1" });
    expect(result.id).toBe("s1");
    expect(result.rubric).toEqual(rubric);
  });

  it("getScenario throws ScenarioNotFoundError", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      getScenario({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { scenarioId: "s999" }),
    ).rejects.toThrow(/not found/);
  });

  it("getAttemptsForScenario returns attempts for the user", async () => {
    const attempts = [
      { id: "a1", scenarioId: "s1", userId: "u1", audioStorageKey: "k", durationMs: 60, transcriptExcerpt: null, llmScoreJson: null, overallScore: null, passed: null, llmFeedback: null, attemptNumber: 1, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: attempts });
    const result = await getAttemptsForScenario({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { scenarioId: "s1" });
    expect(result).toEqual(attempts);
  });

  it("getBestAttemptForScenario returns the highest-scoring attempt", async () => {
    const attempts = [
      { id: "a1", scenarioId: "s1", userId: "u1", audioStorageKey: "k", durationMs: 60, transcriptExcerpt: null, llmScoreJson: null, overallScore: "70", passed: false, llmFeedback: null, attemptNumber: 1, createdAt: new Date() },
      { id: "a2", scenarioId: "s1", userId: "u1", audioStorageKey: "k", durationMs: 60, transcriptExcerpt: null, llmScoreJson: null, overallScore: "85", passed: true, llmFeedback: null, attemptNumber: 2, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: attempts });
    const result = await getBestAttemptForScenario({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { scenarioId: "s1" });
    expect(result?.id).toBe("a2");
  });

  it("getBestAttemptForScenario returns null when no attempts", async () => {
    const db = createMockDb({ selectResults: [] });
    const result = await getBestAttemptForScenario({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { scenarioId: "s1" });
    expect(result).toBeNull();
  });

  it("getProgressForUser returns the user's progress", async () => {
    const progress = [{ id: "p1", userId: "u1", lessonId: "l1", status: "completed", completedAt: new Date(), score: "90", createdAt: new Date() }];
    const db = createMockDb({ selectResults: progress });
    const result = await getProgressForUser({ db: wrapDb(db), user: salesRep, tenant: globalTenant });
    expect(result).toEqual(progress);
  });

  it("getDashboardData returns modules with progress percentages", async () => {
    const modules = [
      { id: "m1", slug: "onboarding", title: "Onboarding", description: "d", phase: "Foundations", order: 1, createdAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "L1", type: "theory", content: "", order: 1, reviewStatus: "approved", createdAt: new Date() },
      { id: "l2", moduleId: "m1", title: "L2", type: "theory", content: "", order: 2, reviewStatus: "approved", createdAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "u1", lessonId: "l1", status: "completed", completedAt: new Date(), score: null, createdAt: new Date() },
    ];
    const db = createMockDb({ selectSequence: [modules, lessons, progress] });
    const result = await getDashboardData({ db: wrapDb(db), user: salesRep, tenant: globalTenant });
    expect(result).toHaveLength(1);
    expect(result[0].lessonCount).toBe(2);
    expect(result[0].completedLessons).toBe(1);
    expect(result[0].progress).toBe(50);
  });

  it("getCohortOverview requires SALES_ADMIN", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      getCohortOverview({ db: wrapDb(db), user: salesRep, tenant: globalTenant }),
    ).rejects.toThrow(/lacks permission/);
    const result = await getCohortOverview({ db: wrapDb(db), user: salesAdmin, tenant: globalTenant });
    expect(result).toEqual([]);
  });
});
