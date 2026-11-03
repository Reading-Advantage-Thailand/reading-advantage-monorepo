import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { LONG_QUESTION_TEXT, SCI, sciUser, seedScience } from "../../__tests__/helpers/science-fixture.js";

const holder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, get db() { return holder.db; } };
});

const { getClassDetail } = await import("../get-class.js");
const { getClassDetailWithCurriculum } = await import("../get-class-detail-with-curriculum.js");
const { getClassCurriculum } = await import("../get-class-curriculum.js");
const { getClassAnalyticsOverview } = await import("../get-class-analytics-overview.js");
const { getClassLessonAnalytics } = await import("../get-class-lesson-analytics.js");
const { listAssignments } = await import("../list-assignment.js");
const { listClassesWithCounts } = await import("../list-classes-with-counts.js");

const tenant = { schoolId: SCI.school };
const teacher = sciUser("TEACHER", "sci-teacher");
const otherTeacher = sciUser("TEACHER", "sci-teacher-2");
const admin = sciUser("ADMIN", "sci-admin");
const ann = sciUser("STUDENT", "sci-ann");
const outsider = sciUser("STUDENT", "sci-out");
const MISSING = "5c000000-0000-4000-8000-00000000ffff";

describe("science class reads", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
    holder.db = harness.db;
    await seedScience(harness);
  }, 120_000);
  afterAll(async () => harness.close());

  describe("getClassDetailWithCurriculum", () => {
    it("returns null for a missing class", async () => {
      await expect(getClassDetailWithCurriculum(MISSING, harness.tenantDb(tenant))).resolves.toBeNull();
    });

    it("lists students and only units that match the class framework and grade, with lessons in order", async () => {
      const detail = await getClassDetailWithCurriculum(SCI.classId, harness.tenantDb(tenant));
      expect(detail).toMatchObject({ id: SCI.classId, teacherId: "sci-teacher", studentCount: 2 });
      expect(detail!.students.map((student) => student.id).sort()).toEqual(["sci-ann", "sci-ben"]);
      expect(detail!.curriculumUnits.map((unit) => unit.id)).toEqual([SCI.unitId]);
      expect(detail!.curriculumUnits[0]!.lessons.map((lesson) => lesson.id)).toEqual([SCI.lesson1, SCI.lesson2]);
    });

    it("hides a class from another tenant", async () => {
      await expect(getClassDetailWithCurriculum(SCI.classId, harness.tenantDb({ schoolId: SCI.otherSchool }))).resolves.toBeNull();
    });
  });

  describe("getClassDetail", () => {
    it("returns the class to the owner, an admin, and an enrolled student", async () => {
      for (const caller of [teacher, admin, ann]) {
        const result = await getClassDetail({ user: caller, tenant, input: { classId: SCI.classId } });
        expect(result).toMatchObject({ success: true, data: { id: SCI.classId, name: "Physics 5", joinCode: "SCI001", studentCount: 2 } });
        expect(result!.data.createdAt).toBe("2026-01-01T00:00:00.000Z");
      }
    });

    it("returns null to another teacher and to an outsider student", async () => {
      await expect(getClassDetail({ user: otherTeacher, tenant, input: { classId: SCI.classId } })).resolves.toBeNull();
      await expect(getClassDetail({ user: outsider, tenant, input: { classId: SCI.classId } })).resolves.toBeNull();
    });

    it("returns null for a missing class", async () => {
      await expect(getClassDetail({ user: admin, tenant, input: { classId: MISSING } })).resolves.toBeNull();
    });
  });

  describe("getClassCurriculum", () => {
    it("throws for a missing class and for a caller who is neither owner nor student", async () => {
      await expect(getClassCurriculum({ user: teacher, tenant, input: { classId: MISSING } })).rejects.toThrow("Class not found");
      await expect(getClassCurriculum({ user: outsider, tenant, input: { classId: SCI.classId } })).rejects.toThrow("Not enrolled in this class");
      await expect(getClassCurriculum({ user: admin, tenant, input: { classId: SCI.classId } })).rejects.toThrow("Not enrolled in this class");
    });

    it("returns every class unit with the student's own lesson progress", async () => {
      const result = await getClassCurriculum({ user: ann, tenant, input: { classId: SCI.classId } });
      expect(result.class).toEqual({ id: SCI.classId, name: "Physics 5", gradeLevel: 5, standardsAlignment: "NGSS" });
      expect(result.units.map((unit) => unit.id)).toEqual([SCI.unitId, SCI.otherFrameworkUnitId]);
      const [first, second] = result.units[0]!.lessons;
      expect(first).toMatchObject({ id: SCI.lesson1, slug: SCI.lesson1, titleThai: "บทหนึ่ง", completed: true, started: true, progress: { status: "COMPLETED", attemptsCount: 2, bestScorePercentage: 100, completedAt: "2026-03-02T00:10:00.000Z" } });
      expect(second).toMatchObject({ id: SCI.lesson2, titleThai: "Lesson Two", completed: false, started: true, progress: { status: "IN_PROGRESS", lastAttemptAt: null } });
      expect(result.units[1]!.lessons).toEqual([]);
    });

    it("shows NOT_STARTED progress to the owner teacher, who has no completions", async () => {
      const result = await getClassCurriculum({ user: teacher, tenant, input: { classId: SCI.classId } });
      expect(result.units[0]!.lessons.map((lesson) => lesson.progress.status)).toEqual(["NOT_STARTED", "NOT_STARTED"]);
      expect(result.units[0]!.lessons[0]).toMatchObject({ completed: false, started: false, progress: { attemptsCount: 0, bestScore: null } });
    });
  });

  describe("getClassAnalyticsOverview", () => {
    it("throws for a missing class and for a non-owner teacher", async () => {
      await expect(getClassAnalyticsOverview({ user: teacher, tenant, input: { classId: MISSING } })).rejects.toThrow("Class not found");
      await expect(getClassAnalyticsOverview({ user: otherTeacher, tenant, input: { classId: SCI.classId } })).rejects.toThrow("Unauthorized access to class analytics");
    });

    it("computes completion, score, attempts, time, and color per lesson", async () => {
      const result = await getClassAnalyticsOverview({ user: teacher, tenant, input: { classId: SCI.classId } });
      expect(result).toMatchObject({ classId: SCI.classId, className: "Physics 5", totalStudents: 2 });
      expect(result.lessons).toEqual([
        { lessonId: SCI.lesson1, lessonTitle: "Lesson One", lessonOrder: 1, completionRate: 100, studentsCompleted: 2, averageScore: 75, averageScorePercentage: 75, averageAttempts: 1.5, averageTimeSeconds: 55, colorCode: "yellow" },
        { lessonId: SCI.lesson2, lessonTitle: "Lesson Two", lessonOrder: 2, completionRate: 0, studentsCompleted: 0, averageScore: 0, averageScorePercentage: 0, averageAttempts: 0, averageTimeSeconds: 0, colorCode: "red" },
      ]);
    });

    it("lets an admin read a class without students", async () => {
      const result = await getClassAnalyticsOverview({ user: admin, tenant, input: { classId: SCI.emptyClassId } });
      expect(result).toEqual({ classId: SCI.emptyClassId, className: "Empty 5", totalStudents: 0, lessons: [] });
    });
  });

  describe("getClassLessonAnalytics", () => {
    it("throws for a missing class, a non-owner, and a lesson outside the class", async () => {
      await expect(getClassLessonAnalytics({ user: teacher, tenant, input: { classId: MISSING, lessonId: SCI.lesson1 } })).rejects.toThrow("Class not found");
      await expect(getClassLessonAnalytics({ user: otherTeacher, tenant, input: { classId: SCI.classId, lessonId: SCI.lesson1 } })).rejects.toThrow("Unauthorized");
      await expect(getClassLessonAnalytics({ user: teacher, tenant, input: { classId: SCI.classId, lessonId: SCI.orphanLesson } })).rejects.toThrow("Lesson not found in this class");
    });

    it("builds class stats, student rows, question difficulty, and standard mastery", async () => {
      const result = await getClassLessonAnalytics({ user: teacher, tenant, input: { classId: SCI.classId, lessonId: SCI.lesson1 } });
      expect(result.lesson).toEqual({ id: SCI.lesson1, title: "Lesson One", order: 1 });
      expect(result.standards).toEqual([{ code: "Sc1.1", description: "Living things" }]);
      expect(result.classStats).toEqual({ totalStudents: 2, studentsCompleted: 2, completionRate: 100, averageScore: 2, averageScorePercentage: 75 });
      const annRow = result.students.find((student) => student.studentId === "sci-ann");
      expect(annRow).toMatchObject({ studentName: "Ann", completionStatus: "COMPLETED", attempts: 2, totalTimeSeconds: 40, colorCode: "blue" });
      expect(result.students.find((student) => student.studentId === "sci-ben")).toMatchObject({ colorCode: "red" });

      expect(result.questions.map((question) => question.questionId)).toEqual([SCI.question1, SCI.question2]);
      expect(result.questions[0]).toEqual({ questionId: SCI.question1, questionNumber: 1, questionTextTruncated: `${LONG_QUESTION_TEXT.substring(0, 50)}...`, questionType: "MULTIPLE_CHOICE", percentCorrect: 33.3, averageTimeSeconds: 15, totalResponses: 3, correctResponses: 1, incorrectStudents: ["Ann", "Ben"] });
      expect(result.questions[1]).toMatchObject({ questionTextTruncated: "Plants need light.", percentCorrect: 66.7, incorrectStudents: ["Ann"] });

      const living = result.standardsPerformance.find((standard) => standard.standardId === SCI.standard1);
      const forces = result.standardsPerformance.find((standard) => standard.standardId === SCI.standard2);
      expect(living).toEqual({ standardId: SCI.standard1, standardCode: "Sc1.1", standardDescription: "Living things", questionsCount: 1, studentsMastered: 0, percentMastered: 0, flagForReteach: true, colorCode: "red" });
      expect(forces).toMatchObject({ studentsMastered: 1, percentMastered: 50, flagForReteach: true });
    });
  });

  describe("listAssignments", () => {
    it("returns 404 for a missing class and 403 for an outsider and an admin", async () => {
      await expect(listAssignments({ user: teacher, tenant, input: { classId: MISSING } })).resolves.toEqual({ error: "Class not found", status: 404 });
      await expect(listAssignments({ user: outsider, tenant, input: { classId: SCI.classId } })).resolves.toEqual({ error: "Forbidden", status: 403 });
      await expect(listAssignments({ user: admin, tenant, input: { classId: SCI.classId } })).resolves.toEqual({ error: "Forbidden", status: 403 });
    });

    it("lists assignments with lesson and teacher to the owner and an enrolled student", async () => {
      for (const caller of [teacher, ann]) {
        const result = await listAssignments({ user: caller, tenant, input: { classId: SCI.classId } });
        expect(result).toEqual({ success: true, data: { assignments: [{
          id: SCI.assignment, classId: SCI.classId, lessonId: SCI.lesson1, assignedAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-08T00:00:00.000Z", assignedBy: "sci-teacher",
          teacher: { id: "sci-teacher", name: "Teacher T" },
          lesson: { id: SCI.lesson1, title: "Lesson One", slug: "sci-lesson-1", order: 1, gradeLevel: 5 },
          createdAt: "2026-03-01T00:00:00.000Z",
        }] } });
      }
    });
  });

  describe("listClassesWithCounts", () => {
    it("rejects a student", async () => {
      await expect(listClassesWithCounts({ user: ann, tenant, input: { page: 1, limit: 10 } })).rejects.toThrow("class:list");
    });

    it("pages only the caller's classes, newest first, with student counts", async () => {
      const first = await listClassesWithCounts({ user: teacher, tenant, input: { page: 1, limit: 1 } });
      expect(first.data.map((cls) => [cls.id, cls.studentCount])).toEqual([[SCI.emptyClassId, 0]]);
      expect(first.pagination).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
      const second = await listClassesWithCounts({ user: teacher, tenant, input: { page: 2, limit: 1 } });
      expect(second.data.map((cls) => [cls.id, cls.studentCount])).toEqual([[SCI.classId, 2]]);
    });

    it("returns an empty page for a teacher without classes", async () => {
      const result = await listClassesWithCounts({ user: sciUser("TEACHER", "nobody"), tenant, input: { page: 1, limit: 5 } });
      expect(result).toEqual({ success: true, data: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } });
    });
  });
});
