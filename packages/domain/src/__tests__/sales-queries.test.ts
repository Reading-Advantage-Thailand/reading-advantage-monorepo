import { describe, it, expect } from "vitest";
import {
  getModules,
  getAdminCurriculum,
  getModuleBySlug,
  getLesson,
  getScenario,
  getAttemptsForScenario,
  getBestAttemptForScenario,
  getProgressForUser,
  getDashboardData,
  getCohortOverview,
  getSalesRepDetail,
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

function accessibleScenarioSequence(attempts: unknown[]) {
  const moduleRow = {
    id: "m1",
    slug: "onboarding",
    title: "Onboarding",
    description: "d",
    phase: "Foundations",
    order: 1,
    createdAt: new Date(),
  };
  const lesson = {
    id: "l1",
    moduleId: moduleRow.id,
    title: "Roleplay",
    type: "roleplay",
    content: "Practice",
    order: 1,
    reviewStatus: "approved",
    createdAt: new Date(),
  };
  const scenario = {
    id: "s1",
    lessonId: lesson.id,
    personaName: "Prospect",
    personaRole: "Director",
    situation: "Discovery",
    objective: "Qualify",
    prospectContextJson: {},
    rubricId: "r1",
    order: 1,
    createdAt: new Date(),
  };
  const rubric = {
    id: "r1",
    name: "Discovery",
    criteriaJson: [],
    reviewStatus: "approved",
    createdAt: new Date(),
  };
  return [[scenario], [lesson], [moduleRow], [lesson], [], [rubric], attempts];
}

describe("sales queries", () => {
  it("getModules returns all modules ordered", async () => {
    const modules = [
      {
        id: "m1",
        slug: "onboarding",
        title: "Onboarding",
        description: "d",
        phase: "Foundations",
        order: 1,
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectResults: modules });
    const result = await getModules({
      db: wrapDb(db),
      user: salesRep,
      tenant: globalTenant,
    });
    expect(result).toEqual(modules);
  });

  it("getModuleBySlug returns module with lessons", async () => {
    const moduleRow = {
      id: "m1",
      slug: "onboarding",
      title: "Onboarding",
      description: "d",
      phase: "Foundations",
      order: 1,
      createdAt: new Date(),
    };
    const lessons = [
      {
        id: "l1",
        moduleId: "m1",
        title: "L1",
        type: "theory",
        content: "",
        order: 1,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectSequence: [[moduleRow], lessons, []] });
    const result = await getModuleBySlug(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { slug: "onboarding" },
    );
    expect(result.id).toBe("m1");
    expect(result.lessons).toEqual([
      expect.objectContaining({
        ...lessons[0],
        completed: false,
        bestScore: null,
        isLocked: false,
        prerequisiteLessonId: null,
      }),
    ]);
  });

  it("getModuleBySlug throws when module not found", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      getModuleBySlug(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { slug: "nope" },
      ),
    ).rejects.toThrow("Module not found");
  });

  it("getLesson returns a roleplay lesson with scenarios", async () => {
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Cold Call",
      type: "roleplay",
      content: "",
      order: 1,
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const scenarios = [
      {
        id: "s1",
        lessonId: "l1",
        personaName: "Dir",
        personaRole: "Director",
        situation: "s",
        objective: "o",
        prospectContextJson: {},
        rubricId: "r1",
        order: 1,
        createdAt: new Date(),
      },
    ];
    const moduleRow = { id: "m1", slug: "onboarding", order: 1 };
    const db = createMockDb({
      selectSequence: [
        [lesson],
        [moduleRow],
        [lesson],
        [],
        scenarios,
        [{ id: "r1" }],
      ],
    });
    const result = await getLesson(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { lessonId: "l1" },
    );
    expect(result.id).toBe("l1");
    expect(result.scenarios).toEqual(scenarios);
  });

  it("getLesson hides roleplay scenarios whose rubric is not approved", async () => {
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Cold Call",
      type: "roleplay",
      content: "",
      order: 1,
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const scenarios = [
      {
        id: "s1",
        lessonId: "l1",
        personaName: "Dir",
        personaRole: "Director",
        situation: "s",
        objective: "o",
        prospectContextJson: {},
        rubricId: "r-draft",
        order: 1,
        createdAt: new Date(),
      },
    ];
    const moduleRow = { id: "m1", slug: "onboarding", order: 1 };
    const db = createMockDb({
      selectSequence: [[lesson], [moduleRow], [lesson], [], scenarios, []],
    });

    const result = await getLesson(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { lessonId: "l1" },
    );

    expect(result.scenarios).toEqual([]);
  });

  it("getLesson throws CurriculumNotApprovedError for draft lessons", async () => {
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "L",
      type: "theory",
      content: "",
      order: 1,
      reviewStatus: "draft",
      createdAt: new Date(),
    };
    const db = createMockDb({ selectResults: [lesson] });
    await expect(
      getLesson(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { lessonId: "l1" },
      ),
    ).rejects.toThrow(/not approved/);
  });

  it("getScenario returns scenario with rubric", async () => {
    const scenario = {
      id: "s1",
      lessonId: "l1",
      personaName: "Dir",
      personaRole: "Director",
      situation: "s",
      objective: "o",
      prospectContextJson: {},
      rubricId: "r1",
      order: 1,
      createdAt: new Date(),
    };
    const moduleRow = { id: "m1", slug: "onboarding", order: 1 };
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Cold Call",
      type: "roleplay",
      content: "",
      order: 1,
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const rubric = {
      id: "r1",
      name: "Cold Call Rubric",
      criteriaJson: [],
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [
        [scenario],
        [lesson],
        [moduleRow],
        [lesson],
        [],
        [rubric],
      ],
    });
    const result = await getScenario(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1" },
    );
    expect(result.id).toBe("s1");
    expect(result.rubric).toEqual(rubric);
  });

  it("getScenario throws ScenarioNotFoundError", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      getScenario(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { scenarioId: "s999" },
      ),
    ).rejects.toThrow(/not found/);
  });

  it("getAttemptsForScenario returns attempts for the user", async () => {
    const attempts = [
      {
        id: "a1",
        scenarioId: "s1",
        userId: "u1",
        audioStorageKey: "k",
        durationMs: 60,
        transcriptExcerpt: null,
        llmScoreJson: null,
        overallScore: null,
        passed: null,
        llmFeedback: null,
        attemptNumber: 1,
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({
      selectSequence: accessibleScenarioSequence(attempts),
    });
    const result = await getAttemptsForScenario(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1" },
    );
    expect(result).toEqual(attempts);
  });

  it("getBestAttemptForScenario returns the highest-scoring attempt", async () => {
    const attempts = [
      {
        id: "a1",
        scenarioId: "s1",
        userId: "u1",
        audioStorageKey: "k",
        durationMs: 60,
        transcriptExcerpt: null,
        llmScoreJson: null,
        overallScore: "70",
        passed: false,
        llmFeedback: null,
        attemptNumber: 1,
        createdAt: new Date(),
      },
      {
        id: "a2",
        scenarioId: "s1",
        userId: "u1",
        audioStorageKey: "k",
        durationMs: 60,
        transcriptExcerpt: null,
        llmScoreJson: null,
        overallScore: "85",
        passed: true,
        llmFeedback: null,
        attemptNumber: 2,
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({
      selectSequence: accessibleScenarioSequence(attempts),
    });
    const result = await getBestAttemptForScenario(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1" },
    );
    expect(result?.id).toBe("a2");
  });

  it("getBestAttemptForScenario returns null when no attempts", async () => {
    const db = createMockDb({
      selectSequence: accessibleScenarioSequence([]),
    });
    const result = await getBestAttemptForScenario(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1" },
    );
    expect(result).toBeNull();
  });

  it("getProgressForUser returns the user's progress", async () => {
    const progress = [
      {
        id: "p1",
        userId: "u1",
        lessonId: "l1",
        status: "completed",
        completedAt: new Date(),
        score: "90",
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectResults: progress });
    const result = await getProgressForUser({
      db: wrapDb(db),
      user: salesRep,
      tenant: globalTenant,
    });
    expect(result).toEqual(progress);
  });

  it("getDashboardData returns modules with progress percentages", async () => {
    const modules = [
      {
        id: "m1",
        slug: "onboarding",
        title: "Onboarding",
        description: "d",
        phase: "Foundations",
        order: 1,
        createdAt: new Date(),
      },
    ];
    const lessons = [
      {
        id: "l1",
        moduleId: "m1",
        title: "L1",
        type: "theory",
        content: "",
        order: 1,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "L2",
        type: "theory",
        content: "",
        order: 2,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
    ];
    const progress = [
      {
        id: "p1",
        userId: "u1",
        lessonId: "l1",
        status: "completed",
        completedAt: new Date(),
        score: null,
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectSequence: [modules, lessons, progress] });
    const result = await getDashboardData({
      db: wrapDb(db),
      user: salesRep,
      tenant: globalTenant,
    });
    expect(result).toHaveLength(1);
    expect(result[0].lessonCount).toBe(2);
    expect(result[0].completedLessons).toBe(1);
    expect(result[0].progress).toBe(50);
  });

  it("getCohortOverview requires SALES_ADMIN", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      getCohortOverview({
        db: wrapDb(db),
        user: salesRep,
        tenant: globalTenant,
      }),
    ).rejects.toThrow(/lacks permission/);
    const result = await getCohortOverview({
      db: wrapDb(db),
      user: salesAdmin,
      tenant: globalTenant,
    });
    expect(result).toEqual([]);
  });

  it("getCohortOverview includes tenant reps with zero progress", async () => {
    const schoolId = "00000000-0000-4000-8000-000000000001";
    const rep = {
      id: "rep-zero",
      username: "zero",
      name: "Zero Rep",
      schoolId,
    };
    const moduleRow = {
      id: "m1",
      slug: "foundation",
      title: "Foundation",
      description: "d",
      phase: "Foundations",
      order: 1,
      createdAt: new Date(),
    };
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Theory",
      type: "theory",
      content: "",
      order: 1,
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[rep], [moduleRow], [lesson], [], [], [], []],
    });
    const admin = { ...salesAdmin, schoolId };
    const result = await getCohortOverview({
      db: createTenantDB(db as unknown as DB, { schoolId }),
      user: admin,
      tenant: { schoolId },
    });
    expect(result).toEqual([
      expect.objectContaining({
        userId: "rep-zero",
        modulesCompleted: 0,
        totalModules: 1,
        avgRoleplayScore: null,
        avgQuizScore: null,
        roleplayAttemptCount: 0,
        lastActive: null,
      }),
    ]);
  });

  it("getCohortOverview excludes draft lessons and draft-only modules", async () => {
    const schoolId = "00000000-0000-4000-8000-000000000001";
    const rep = { id: "rep-1", username: "rep", name: "Rep", schoolId };
    const modules = [
      {
        id: "m-approved",
        slug: "approved",
        title: "Approved",
        description: "d",
        phase: "Foundations",
        order: 1,
        createdAt: new Date(),
      },
      {
        id: "m-draft",
        slug: "draft",
        title: "Draft",
        description: "d",
        phase: "Foundations",
        order: 2,
        createdAt: new Date(),
      },
    ];
    const lessons = [
      {
        id: "l-approved",
        moduleId: "m-approved",
        title: "Visible",
        type: "quiz",
        content: "",
        order: 1,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: "l-draft",
        moduleId: "m-draft",
        title: "Hidden",
        type: "quiz",
        content: "",
        order: 1,
        reviewStatus: "draft",
        createdAt: new Date(),
      },
    ];
    const approvedActivity = new Date("2026-07-18T01:00:00Z");
    const progress = [
      {
        id: "p-approved",
        userId: rep.id,
        lessonId: "l-approved",
        status: "completed",
        completedAt: new Date("2026-07-17T00:00:00Z"),
        score: "80",
        createdAt: new Date("2026-07-17T00:00:00Z"),
        updatedAt: approvedActivity,
      },
      {
        id: "p-draft",
        userId: rep.id,
        lessonId: "l-draft",
        status: "completed",
        completedAt: new Date("2026-07-18T02:00:00Z"),
        score: "100",
        createdAt: new Date("2026-07-18T02:00:00Z"),
        updatedAt: new Date("2026-07-18T03:00:00Z"),
      },
    ];
    const db = createMockDb({
      selectSequence: [[rep], modules, lessons, [], [], progress, []],
    });
    const admin = { ...salesAdmin, schoolId };

    const result = await getCohortOverview({
      db: createTenantDB(db as unknown as DB, { schoolId }),
      user: admin,
      tenant: { schoolId },
    });

    expect(result[0]).toMatchObject({
      totalModules: 1,
      modulesCompleted: 1,
      avgQuizScore: 80,
      lastActive: approvedActivity,
    });
  });

  it("getSalesRepDetail exposes retries and the best attempt", async () => {
    const schoolId = "00000000-0000-4000-8000-000000000001";
    const rep = { id: "rep-1", username: "rep", name: "Rep", schoolId };
    const moduleRow = {
      id: "m1",
      slug: "foundation",
      title: "Foundation",
      description: "d",
      phase: "Foundations",
      order: 1,
      createdAt: new Date(),
    };
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Discovery",
      type: "roleplay",
      content: "",
      order: 1,
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const scenario = {
      id: "s1",
      lessonId: "l1",
      personaName: "Director",
      personaRole: "Director",
      situation: "Discovery",
      objective: "Qualify",
      prospectContextJson: {},
      rubricId: "r1",
      order: 1,
      createdAt: new Date(),
    };
    const rubric = {
      id: "r1",
      name: "Approved rubric",
      criteriaJson: [],
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const attempts = [
      {
        id: "a2",
        scenarioId: "s1",
        userId: "rep-1",
        audioStorageKey: null,
        durationMs: 1,
        transcriptExcerpt: null,
        llmScoreJson: null,
        overallScore: "90",
        passed: true,
        llmFeedback: null,
        attemptNumber: 2,
        createdAt: new Date(),
      },
      {
        id: "a1",
        scenarioId: "s1",
        userId: "rep-1",
        audioStorageKey: null,
        durationMs: 1,
        transcriptExcerpt: null,
        llmScoreJson: null,
        overallScore: "60",
        passed: false,
        llmFeedback: null,
        attemptNumber: 1,
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({
      selectSequence: [
        [rep],
        [moduleRow],
        [lesson],
        [rubric],
        [],
        [scenario],
        attempts,
      ],
    });
    const admin = { ...salesAdmin, schoolId };
    const result = await getSalesRepDetail(
      {
        db: createTenantDB(db as unknown as DB, { schoolId }),
        user: admin,
        tenant: { schoolId },
      },
      { repId: rep.id },
    );
    expect(result.scenarios[0]).toMatchObject({
      attemptCount: 2,
      retryCount: 1,
      bestAttempt: { id: "a2" },
    });
  });

  it("getSalesRepDetail reports only approved learner-visible modules", async () => {
    const schoolId = "00000000-0000-4000-8000-000000000001";
    const rep = { id: "rep-1", username: "rep", name: "Rep", schoolId };
    const modules = [
      {
        id: "m-visible",
        slug: "visible",
        title: "Visible",
        description: "d",
        phase: "Foundations",
        order: 1,
        createdAt: new Date(),
      },
      {
        id: "m-hidden",
        slug: "hidden",
        title: "Hidden",
        description: "d",
        phase: "Foundations",
        order: 2,
        createdAt: new Date(),
      },
    ];
    const lessons = [
      {
        id: "l-visible",
        moduleId: "m-visible",
        title: "Visible lesson",
        type: "theory",
        content: "",
        order: 1,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: "l-hidden",
        moduleId: "m-hidden",
        title: "Hidden lesson",
        type: "theory",
        content: "",
        order: 1,
        reviewStatus: "reviewed",
        createdAt: new Date(),
      },
    ];
    const progress = [
      {
        id: "p-visible",
        userId: rep.id,
        lessonId: "l-visible",
        status: "completed",
        completedAt: new Date(),
        score: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "p-hidden",
        userId: rep.id,
        lessonId: "l-hidden",
        status: "completed",
        completedAt: new Date(),
        score: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const db = createMockDb({
      selectSequence: [[rep], modules, lessons, [], progress, [], []],
    });
    const admin = { ...salesAdmin, schoolId };

    const result = await getSalesRepDetail(
      {
        db: createTenantDB(db as unknown as DB, { schoolId }),
        user: admin,
        tenant: { schoolId },
      },
      { repId: rep.id },
    );

    expect(result.summary).toMatchObject({
      totalModules: 1,
      modulesCompleted: 1,
    });
    expect(result.modules.map((module) => module.moduleId)).toEqual([
      "m-visible",
    ]);
  });

  it("getAdminCurriculum includes draft lessons and rubrics for review", async () => {
    const moduleRow = {
      id: "m1",
      slug: "onboarding",
      title: "Onboarding",
      description: "d",
      phase: "Foundations",
      order: 1,
      createdAt: new Date(),
    };
    const draftLesson = {
      id: "l1",
      moduleId: "m1",
      title: "Draft",
      type: "theory",
      content: "",
      order: 1,
      reviewStatus: "draft",
      createdAt: new Date(),
    };
    const draftRubric = {
      id: "r1",
      name: "Draft rubric",
      criteriaJson: [],
      reviewStatus: "reviewed",
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[moduleRow], [draftLesson], [draftRubric]],
    });

    const result = await getAdminCurriculum({
      db: wrapDb(db),
      user: salesAdmin,
      tenant: globalTenant,
    });

    expect(result.modules[0]?.lessons).toEqual([draftLesson]);
    expect(result.rubrics).toEqual([draftRubric]);
  });
});
