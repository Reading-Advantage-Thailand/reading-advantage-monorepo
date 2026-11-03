import { articles, scienceAttempts } from "@reading-advantage/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TenantDB } from "../db-contract.js";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { SCI, sciUser, seedScience } from "./helpers/science-fixture.js";

const holder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, get db() { return holder.db; } };
});

const { getLessonBySlug } = await import("../curriculum/get-lesson-by-slug.js");
const { getSystemDashboardData, systemDashboardQuerySchema } = await import("../reading/get-system-dashboard.js");

const tenant = { schoolId: SCI.school };
const teacher = sciUser("TEACHER", "sci-teacher");
const otherTeacher = sciUser("TEACHER", "sci-teacher-2");
const admin = sciUser("ADMIN", "sci-admin");
const ann = sciUser("STUDENT", "sci-ann");
const outsider = sciUser("STUDENT", "sci-out");
const MISSING = "5c000000-0000-4000-8000-00000000ffff";
const PENDING_ATTEMPT = "5c000000-0000-4000-8000-0000000000f9";

describe("lesson by id and system dashboard", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
    holder.db = harness.db;
    await seedScience(harness);
    await harness.db.insert(scienceAttempts).values({ id: PENDING_ATTEMPT, studentId: "sci-ben", lessonId: SCI.lesson1, schoolId: SCI.school, maxScore: 3, attemptNumber: 2 });
    await harness.db.insert(articles).values([
      { title: "a", content: "a", raLevel: 3, createdAt: new Date("2099-03-02T12:00:00Z") },
      { title: "b", content: "b", raLevel: 3, createdAt: new Date("2099-02-01T12:00:00Z") },
      { title: "c", content: "c", raLevel: 5, createdAt: new Date("2099-03-03T12:00:00Z") },
      { title: "d", content: "d", raLevel: 5, createdAt: new Date("2099-03-04T12:00:00Z") },
    ]);
  }, 120_000);
  afterAll(async () => harness.close());

  describe("getLessonBySlug by lesson id", () => {
    it("returns null for an unknown lesson id", async () => {
      await expect(getLessonBySlug({ user: admin, tenant, input: { lessonSlug: MISSING } })).resolves.toBeNull();
    });

    it("forbids a lesson that no class curriculum links, even for an admin", async () => {
      await expect(getLessonBySlug({ user: admin, tenant, input: { lessonSlug: SCI.orphanLesson } })).resolves.toBe("FORBIDDEN");
    });

    it("returns a legacy lesson with standards to the admin, the class teacher, and an enrolled student", async () => {
      for (const caller of [admin, teacher, ann]) {
        await expect(getLessonBySlug({ user: caller, tenant, input: { lessonSlug: SCI.lesson1 } })).resolves.toEqual({
          lesson: { id: SCI.lesson1, slug: SCI.lesson1, title: "Lesson One", titleThai: "บทหนึ่ง", content: "Body one", contentThai: "Body one", objectives: ["Objective one"], objectivesThai: ["Objective one"], structuredContent: undefined, contentType: "legacy", contentVersion: undefined },
          standards: [{ id: SCI.standard1, code: "Sc1.1", description: "Living things", descriptionThai: "Living things", framework: "NGSS", gradeLevel: 5 }],
        });
      }
    });

    it("marks structured content and empty objectives", async () => {
      const result = await getLessonBySlug({ user: teacher, tenant, input: { lessonSlug: SCI.lesson2 } });
      expect(result).toMatchObject({ lesson: { titleThai: "Lesson Two", content: "", objectives: [], objectivesThai: [], structuredContent: { blocks: [] }, contentType: "structured", contentVersion: 1 }, standards: [] });
    });

    it("forbids another teacher and a student outside the class", async () => {
      await expect(getLessonBySlug({ user: otherTeacher, tenant, input: { lessonSlug: SCI.lesson1 } })).resolves.toBe("FORBIDDEN");
      await expect(getLessonBySlug({ user: outsider, tenant, input: { lessonSlug: SCI.lesson1 } })).resolves.toBe("FORBIDDEN");
    });
  });

  describe("getSystemDashboardData", () => {
    const system = sciUser("SYSTEM", "system", SCI.school);

    it("validates YYYY-MM-DD dates", () => {
      expect(systemDashboardQuerySchema.parse({ startDate: "2099-03-02" })).toEqual({ startDate: "2099-03-02" });
      expect(() => systemDashboardQuerySchema.parse({ endDate: "03/02/2099" })).toThrow("endDate must be in YYYY-MM-DD format");
    });

    it("rejects a non-SYSTEM caller", async () => {
      await expect(getSystemDashboardData({ user: admin, tenant, input: {} })).rejects.toThrow("system:dashboard:read");
    });

    it("counts articles per level across tenants inside an inclusive date range", async () => {
      const result = await getSystemDashboardData({ user: system, tenant, input: { startDate: "2099-03-02", endDate: "2099-03-03" } });
      expect(Object.keys(result.data)).toHaveLength(18);
      expect(result.data[3]).toBe(1);
      expect(result.data[5]).toBe(1);
      expect(result.data[1]).toBe(0);
      expect(result.dataRange).toEqual({ start_date: "2099-03-02", end_date: "2099-03-03" });
    });

    it("applies only the bound that is given and reports null for the other", async () => {
      const fromStart = await getSystemDashboardData({ db: harness.tenantDb({ schoolId: null }), user: system, tenant: { schoolId: null }, input: { startDate: "2099-03-03" } });
      expect([fromStart.data[3], fromStart.data[5]]).toEqual([0, 2]);
      expect(fromStart.dataRange).toEqual({ start_date: "2099-03-03", end_date: null });
    });

    it("reports zero for a level whose count query fails", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const failing = { unscoped: () => ({ select: () => ({ from: () => ({ where: () => Promise.reject(new Error("db down")) }) }) }) } as unknown as TenantDB;
      const result = await getSystemDashboardData({ db: failing, user: system, tenant, input: {} });
      expect(Object.values(result.data)).toEqual(new Array(18).fill(0));
      expect(error).toHaveBeenCalledTimes(18);
      error.mockRestore();
    });
  });
});
