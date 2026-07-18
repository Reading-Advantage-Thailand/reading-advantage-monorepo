// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import {
  deriveSalesLearningAccess,
  getDashboardData,
  getLesson,
  getModuleBySlug,
  getRoleplayEvaluationContext,
  getScenario,
  LessonPrerequisiteNotMetError,
  ModulePrerequisiteNotMetError,
} from "../sales/index.js";
import { createMockDb } from "./mock-db.js";

const salesRep = {
  id: "rep-1",
  username: "rep1",
  name: "Rep One",
  role: "SALES_REP" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const tenant = { schoolId: null };

const modules = [
  { id: "module-1", slug: "foundations", order: 1 },
  { id: "module-3", slug: "discovery", order: 3 },
];

const lessons = [
  { id: "lesson-1", moduleId: "module-1", order: 1 },
  { id: "lesson-2", moduleId: "module-1", order: 2 },
  { id: "lesson-3", moduleId: "module-3", order: 1 },
  { id: "lesson-4", moduleId: "module-3", order: 2 },
];

describe("deriveSalesLearningAccess", () => {
  it("locks the highest-order following module while an earlier lesson is incomplete", () => {
    const access = deriveSalesLearningAccess({
      modules,
      lessons,
      completedLessonIds: new Set(["lesson-1"]),
    });

    expect(access.moduleAccessById["module-1"]).toEqual({
      isLocked: false,
      prerequisiteModuleSlug: null,
    });
    expect(access.moduleAccessById["module-3"]).toEqual({
      isLocked: true,
      prerequisiteModuleSlug: "foundations",
    });
    expect(access.lessonAccessById["lesson-3"]?.isLocked).toBe(true);
  });

  it("unlocks lessons one at a time after the preceding approved lessons are complete", () => {
    const access = deriveSalesLearningAccess({
      modules,
      lessons,
      completedLessonIds: new Set(["lesson-1", "lesson-2", "lesson-3"]),
    });

    expect(access.moduleAccessById["module-3"]?.isLocked).toBe(false);
    expect(access.lessonAccessById["lesson-3"]).toEqual({
      isLocked: false,
      prerequisiteLessonId: null,
    });
    expect(access.lessonAccessById["lesson-4"]).toEqual({
      isLocked: false,
      prerequisiteLessonId: null,
    });
  });

  it("identifies the earliest incomplete prior lesson as the next prerequisite", () => {
    const access = deriveSalesLearningAccess({
      modules: [modules[0]],
      lessons: lessons.slice(0, 2),
      completedLessonIds: new Set(),
    });

    expect(access.lessonAccessById["lesson-1"]?.isLocked).toBe(false);
    expect(access.lessonAccessById["lesson-2"]).toEqual({
      isLocked: true,
      prerequisiteLessonId: "lesson-1",
    });
  });
});

describe("Sales learning route boundaries", () => {
  it("returns server-derived module lock state on the dashboard", async () => {
    const dashboardModules = modules.map((module) => ({
      ...module,
      title: module.slug,
      description: module.slug,
      phase: "Foundations",
      createdAt: new Date(),
    }));
    const dashboardLessons = lessons.map((lesson) => ({
      ...lesson,
      title: lesson.id,
      type: "theory" as const,
      content: "",
      reviewStatus: "approved" as const,
      createdAt: new Date(),
    }));
    const db = createMockDb({
      selectSequence: [
        dashboardModules,
        dashboardLessons,
        [{ lessonId: "lesson-1", status: "completed" }],
      ],
    });

    const result = await getDashboardData({
      db: db as unknown as DB,
      user: salesRep,
      tenant,
    });

    expect(result[0]?.isLocked).toBe(false);
    expect(result[1]).toMatchObject({
      isLocked: true,
      prerequisiteModuleSlug: "foundations",
    });
  });

  it("rejects direct module access while the preceding module is incomplete", async () => {
    const db = createMockDb({
      selectSequence: [
        modules,
        lessons,
        [{ lessonId: "lesson-1", status: "completed" }],
      ],
    });

    await expect(
      getModuleBySlug(
        { db: db as unknown as DB, user: salesRep, tenant },
        { slug: "discovery" },
      ),
    ).rejects.toBeInstanceOf(ModulePrerequisiteNotMetError);
  });

  it("rejects direct lesson access while an earlier lesson is incomplete", async () => {
    const targetLesson = {
      ...lessons[1],
      title: "Second lesson",
      type: "theory" as const,
      content: "content",
      reviewStatus: "approved" as const,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[targetLesson], [modules[0]], lessons.slice(0, 2), []],
    });

    await expect(
      getLesson(
        { db: db as unknown as DB, user: salesRep, tenant },
        { lessonId: "lesson-2" },
      ),
    ).rejects.toBeInstanceOf(LessonPrerequisiteNotMetError);
  });

  it("rejects direct roleplay-scenario access when its lesson is locked", async () => {
    const scenario = {
      id: "scenario-1",
      lessonId: "lesson-2",
      rubricId: "rubric-1",
      order: 1,
    };
    const targetLesson = {
      ...lessons[1],
      title: "Locked roleplay",
      type: "roleplay" as const,
      content: "content",
      reviewStatus: "approved" as const,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [
        [scenario],
        [targetLesson],
        [modules[0]],
        lessons.slice(0, 2),
        [],
      ],
    });

    await expect(
      getScenario(
        { db: db as unknown as DB, user: salesRep, tenant },
        { scenarioId: "scenario-1" },
      ),
    ).rejects.toBeInstanceOf(LessonPrerequisiteNotMetError);
  });

  it("rejects roleplay evaluation context for a locked lesson before provider work", async () => {
    const scenario = {
      id: "scenario-1",
      lessonId: "lesson-2",
      rubricId: "rubric-1",
      order: 1,
    };
    const targetLesson = {
      ...lessons[1],
      title: "Locked roleplay",
      type: "roleplay" as const,
      content: "content",
      reviewStatus: "approved" as const,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [
        [scenario],
        [targetLesson],
        [modules[0]],
        lessons.slice(0, 2),
        [],
      ],
    });

    await expect(
      getRoleplayEvaluationContext(
        { db: db as unknown as DB, user: salesRep, tenant },
        { scenarioId: "scenario-1" },
      ),
    ).rejects.toBeInstanceOf(LessonPrerequisiteNotMetError);
  });
});
