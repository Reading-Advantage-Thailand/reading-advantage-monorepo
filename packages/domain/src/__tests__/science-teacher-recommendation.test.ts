import { articles, scienceAttempts } from "@reading-advantage/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { SCI, sciUser, seedScience } from "./helpers/science-fixture.js";

const holder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, get db() { return holder.db; } };
});

const { getTeacherDashboard } = await import("../teachers/get-teacher-dashboard.js");
const { getRecommendation } = await import("../ai/get-recommendation.js");

const tenant = { schoolId: SCI.school };
const teacher = sciUser("TEACHER", "sci-teacher");
const otherTeacher = sciUser("TEACHER", "sci-teacher-2");
const ann = sciUser("STUDENT", "sci-ann");
const ben = sciUser("STUDENT", "sci-ben");
const MISSING = "5c000000-0000-4000-8000-00000000ffff";
const PENDING_ATTEMPT = "5c000000-0000-4000-8000-0000000000f9";

describe("teacher dashboard and recommendation", () => {
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

  describe("getTeacherDashboard", () => {
    it("rejects a student", async () => {
      await expect(getTeacherDashboard({ user: ann, tenant })).rejects.toThrow("teachers:read:own");
    });

    it("returns empty sections for a teacher without classes", async () => {
      await expect(getTeacherDashboard({ user: sciUser("TEACHER", "nobody"), tenant })).resolves.toEqual({ classProgress: [], studentsNeedingAttention: 0, recentCompletions: [] });
    });

    it("computes class progress, low-mastery students, and recent completions", async () => {
      const result = await getTeacherDashboard({ user: teacher, tenant });
      expect(result.classProgress).toHaveLength(2);
      expect(result.classProgress.find((row) => row.classId === SCI.classId)).toEqual({ classId: SCI.classId, className: "Physics 5", completionRate: 100, averageScore: 75, activeStudents: 2 });
      expect(result.classProgress.find((row) => row.classId === SCI.emptyClassId)).toEqual({ classId: SCI.emptyClassId, className: "Empty 5", completionRate: 0, averageScore: 0, activeStudents: 0 });
      expect(result.studentsNeedingAttention).toBe(1);
      expect(result.recentCompletions).toEqual([
        { studentName: "Ben", lessonTitle: "Lesson One", score: 50, completedAt: "2026-03-03T00:10:00.000Z" },
        { studentName: "Ann", lessonTitle: "Lesson One", score: 100, completedAt: "2026-03-02T00:10:00.000Z" },
      ]);
    });

    it("returns zero attention and no completions when the classes have no students", async () => {
      await expect(getTeacherDashboard({ user: otherTeacher, tenant })).resolves.toEqual({
        classProgress: [{ classId: SCI.otherTeacherClassId, className: "Other", completionRate: 0, averageScore: 0, activeStudents: 0 }],
        studentsNeedingAttention: 0,
        recentCompletions: [],
      });
    });
  });

  describe("getRecommendation", () => {
    function deps(overrides: Record<string, unknown> = {}) {
      return {
        assertRateLimit: vi.fn().mockResolvedValue(undefined),
        buildRecommendationContext: vi.fn().mockResolvedValue({ traceId: "trace-1", masteryVersion: 7 }),
        generateRecommendation: vi.fn().mockResolvedValue({ recommendation: { next: "review" }, modelUsed: "model-x", fallbackUsed: false }),
        cacheGet: vi.fn().mockReturnValue(undefined),
        cacheSet: vi.fn(),
        cacheTtlMs: 60_000,
        devAuthEnabled: false,
        ...overrides,
      };
    }

    it("returns 404 for a missing attempt and for another tenant's attempt", async () => {
      await expect(getRecommendation({ user: ann, tenant, input: { attemptId: MISSING }, deps: deps() })).resolves.toEqual({ error: "Attempt not found", status: 404 });
      await expect(getRecommendation({ user: sciUser("STUDENT", "sci-ann", SCI.otherSchool), tenant: { schoolId: SCI.otherSchool }, input: { attemptId: SCI.attempt1 }, deps: deps() })).resolves.toEqual({ error: "Attempt not found", status: 404 });
    });

    it("returns 409 while the attempt is still grading", async () => {
      await expect(getRecommendation({ user: ben, tenant, input: { attemptId: PENDING_ATTEMPT }, deps: deps() })).resolves.toEqual({ error: "Attempt still grading", status: 409 });
    });

    it("returns 403 to another student and to a teacher without dev impersonation", async () => {
      const d = deps();
      await expect(getRecommendation({ user: ben, tenant, input: { attemptId: SCI.attempt1 }, deps: d })).resolves.toEqual({ error: "Forbidden", status: 403 });
      await expect(getRecommendation({ user: teacher, tenant, input: { attemptId: SCI.attempt1 }, deps: d })).resolves.toEqual({ error: "Forbidden", status: 403 });
      expect(d.assertRateLimit).not.toHaveBeenCalled();
    });

    it("loads the attempt with relations, generates, and caches a recommendation for the owner", async () => {
      const d = deps();
      const result = await getRecommendation({ user: ann, tenant, input: { attemptId: SCI.attempt1 }, deps: d });
      expect(d.assertRateLimit).toHaveBeenCalledWith("sci-ann");
      const { attempt } = d.buildRecommendationContext.mock.calls[0]![0];
      expect(attempt).toMatchObject({ id: SCI.attempt1, studentId: "sci-ann", lessonId: SCI.lesson1, score: 0, maxScore: 3, student: { id: "sci-ann", gradeLevel: 5 } });
      expect(attempt.lesson).toMatchObject({ id: SCI.lesson1, title: "Lesson One", lessonType: "LESSON", gradeLevel: 5, order: 1, standards: [{ id: SCI.standard1, code: "Sc1.1", description: "Living things", framework: "NGSS" }], curriculumUnits: [{ id: SCI.unitId, title: "Unit One", order: 1, framework: "NGSS" }] });
      expect(attempt.questionResponses).toHaveLength(2);
      expect(attempt.questionResponses).toEqual(expect.arrayContaining([
        expect.objectContaining({ isCorrect: false, question: { id: SCI.question1, standards: [{ id: SCI.standard1, code: "Sc1.1" }] } }),
        expect.objectContaining({ isCorrect: false, question: { id: SCI.question2, standards: [{ id: SCI.standard2, code: "Sc4.2" }] } }),
      ]));
      expect(d.cacheGet).toHaveBeenCalledWith(`sci-ann:${SCI.attempt1}:7`);
      expect(result).toEqual({ recommendation: { success: true, recommendation: { next: "review" }, model: "model-x", fallbackUsed: false, traceId: "trace-1", generatedAt: expect.any(String) } });
      expect(d.cacheSet).toHaveBeenCalledWith(`sci-ann:${SCI.attempt1}:7`, (result as { recommendation: unknown }).recommendation, 60_000);
    });

    it("serves a fresh cache entry and regenerates after expiry", async () => {
      const fresh = deps({ cacheGet: vi.fn().mockReturnValue({ expiresAt: Date.now() + 60_000, response: { cached: true } }) });
      await expect(getRecommendation({ user: ann, tenant, input: { attemptId: SCI.attempt1 }, deps: fresh })).resolves.toEqual({ recommendation: { cached: true } });
      expect(fresh.generateRecommendation).not.toHaveBeenCalled();
      const stale = deps({ cacheGet: vi.fn().mockReturnValue({ expiresAt: Date.now() - 1, response: { cached: true } }) });
      await getRecommendation({ user: ann, tenant, input: { attemptId: SCI.attempt1 }, deps: stale });
      expect(stale.generateRecommendation).toHaveBeenCalledTimes(1);
    });

    it("lets a teacher impersonate when dev auth is on", async () => {
      const d = deps({ devAuthEnabled: true });
      await expect(getRecommendation({ user: teacher, tenant, input: { attemptId: SCI.attempt1 }, deps: d })).resolves.toMatchObject({ recommendation: { success: true } });
      expect(d.assertRateLimit).toHaveBeenCalledWith("sci-ann");
    });

    it("stops before any AI call when the rate limit throws", async () => {
      const d = deps({ assertRateLimit: vi.fn().mockRejectedValue(new Error("rate limited")) });
      await expect(getRecommendation({ user: ann, tenant, input: { attemptId: SCI.attempt1 }, deps: d })).rejects.toThrow("rate limited");
      expect(d.buildRecommendationContext).not.toHaveBeenCalled();
      expect(d.generateRecommendation).not.toHaveBeenCalled();
    });
  });
});
