import { scienceMasteryRuns } from "@reading-advantage/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { SCI, sciUser, seedScience } from "../../__tests__/helpers/science-fixture.js";

const holder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, get db() { return holder.db; } };
});

const { getStudentClassAnalytics } = await import("../get-student-class-analytics.js");
const { getStudentLessonAnalytics } = await import("../get-student-lesson-analytics.js");
const { getStudentLessonProgress } = await import("../get-student-lesson-progress.js");
const { getStudentMasteryProfile } = await import("../get-student-mastery-profile.js");
const { getStudentAchievements } = await import("../get-student-achievements.js");
const { getStudentAssignments } = await import("../get-student-assignments.js");

const tenant = { schoolId: SCI.school };
const teacher = sciUser("TEACHER", "sci-teacher");
const otherTeacher = sciUser("TEACHER", "sci-teacher-2");
const admin = sciUser("ADMIN", "sci-admin");
const ann = sciUser("STUDENT", "sci-ann");
const ben = sciUser("STUDENT", "sci-ben");
const outsider = sciUser("STUDENT", "sci-out");
const MISSING = "5c000000-0000-4000-8000-00000000ffff";

describe("science student reads", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
    holder.db = harness.db;
    await seedScience(harness);
  }, 120_000);
  afterAll(async () => harness.close());

  describe("getStudentClassAnalytics", () => {
    it("rejects another student before any read", async () => {
      await expect(getStudentClassAnalytics({ user: ben, tenant, input: { studentId: "sci-ann", classId: SCI.classId } })).rejects.toThrow("progress:read:all");
    });

    it("rejects a student reading the own analytics because only the owner teacher or an admin passes", async () => {
      await expect(getStudentClassAnalytics({ user: ann, tenant, input: { studentId: "sci-ann", classId: SCI.classId } })).rejects.toThrow("Unauthorized");
    });

    it("throws for a missing class, a non-owner teacher, and a student outside the class", async () => {
      await expect(getStudentClassAnalytics({ user: teacher, tenant, input: { studentId: "sci-ann", classId: MISSING } })).rejects.toThrow("Class not found");
      await expect(getStudentClassAnalytics({ user: otherTeacher, tenant, input: { studentId: "sci-ann", classId: SCI.classId } })).rejects.toThrow("Unauthorized");
      await expect(getStudentClassAnalytics({ user: admin, tenant, input: { studentId: "sci-out", classId: SCI.classId } })).rejects.toThrow("Student is not enrolled in this class");
    });

    it("summarizes lesson results and scores standards from the most recent attempt only", async () => {
      const result = await getStudentClassAnalytics({ user: teacher, tenant, input: { studentId: "sci-ann", classId: SCI.classId } });
      expect(result.student).toEqual({ id: "sci-ann", name: "Ann" });
      expect(result.class).toEqual({ id: SCI.classId, name: "Physics 5", gradeLevel: 5, standardsAlignment: "NGSS" });
      expect(result.lessonsPerformance).toEqual([
        { lessonId: SCI.lesson1, lessonTitle: "Lesson One", lessonOrder: 1, completionStatus: "completed", mostRecentScore: 100, mostRecentScorePercentage: 100, attemptsCount: 2, totalTimeSeconds: 40, colorCode: "blue" },
        { lessonId: SCI.lesson2, lessonTitle: "Lesson Two", lessonOrder: 2, completionStatus: "in_progress", mostRecentScore: null, mostRecentScorePercentage: null, attemptsCount: 1, totalTimeSeconds: 15, colorCode: null },
      ]);
      expect(result.summary).toEqual({ lessonsCompleted: 1, totalLessons: 2, averageScore: 100, averageScorePercentage: 100, totalTimeSpent: 55, totalAttempts: 3, colorCode: "blue" });
      expect(result.standardsPerformance).toEqual([
        { standardId: SCI.standard1, standardCode: "Sc1.1", standardDescription: "Living things", questionsAnswered: 1, questionsCorrect: 1, masteryPercentage: 100, colorCode: "blue", needsIntervention: false },
      ]);
    });

    it("marks a not-started student and flags standards without evidence", async () => {
      const result = await getStudentClassAnalytics({ user: admin, tenant, input: { studentId: "sci-ben", classId: SCI.classId } });
      expect(result.lessonsPerformance.map((lesson) => lesson.completionStatus)).toEqual(["completed", "not_started"]);
      expect(result.summary).toMatchObject({ lessonsCompleted: 1, averageScore: 50, colorCode: "red" });
      expect(result.standardsPerformance[0]).toMatchObject({ questionsAnswered: 1, questionsCorrect: 0, masteryPercentage: 0, needsIntervention: true });
    });
  });

  describe("getStudentLessonAnalytics", () => {
    it("throws for another student, a missing student, a non-owner teacher, and a missing lesson", async () => {
      await expect(getStudentLessonAnalytics({ user: ben, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } })).rejects.toThrow("progress:read:all");
      await expect(getStudentLessonAnalytics({ user: admin, tenant, input: { studentId: "nobody", lessonId: SCI.lesson1 } })).rejects.toThrow("Student not found");
      await expect(getStudentLessonAnalytics({ user: otherTeacher, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } })).rejects.toThrow("Unauthorized");
      await expect(getStudentLessonAnalytics({ user: admin, tenant, input: { studentId: "sci-ann", lessonId: MISSING } })).rejects.toThrow("Lesson not found");
    });

    it("rejects a student reading the own lesson analytics", async () => {
      await expect(getStudentLessonAnalytics({ user: ann, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } })).rejects.toThrow("Unauthorized");
    });

    it("hides a student of another tenant", async () => {
      await expect(getStudentLessonAnalytics({ user: sciUser("ADMIN", "x", SCI.otherSchool), tenant: { schoolId: SCI.otherSchool }, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } })).rejects.toThrow("Student not found");
    });

    it("lists attempts newest first with per-question breakdown and latest-attempt standards", async () => {
      const result = await getStudentLessonAnalytics({ user: teacher, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } });
      expect(result.student).toEqual({ id: "sci-ann", name: "Ann" });
      expect(result.attemptHistory.map((attempt) => [attempt.attemptId, attempt.attemptNumber, attempt.scorePercentage, attempt.totalTimeSeconds, attempt.colorCode, attempt.status])).toEqual([
        [SCI.attempt2, 2, 100, 30, "blue", "completed"],
        [SCI.attempt1, 1, 0, 10, "red", "completed"],
      ]);
      expect(result.attemptHistory[0]!.questionBreakdown[0]).toEqual({ questionId: SCI.question1, questionNumber: 1, questionText: expect.stringContaining("Which force"), questionType: "MULTIPLE_CHOICE", studentAnswer: "gravity", correctAnswer: "gravity", isCorrect: true, timeSpentSeconds: 10, points: 2 });
      expect(result.attemptHistory[0]!.completedAt).toBe("2026-03-02T00:10:00.000Z");
      expect(result.standardsPerformance).toEqual(expect.arrayContaining([
        { standardId: SCI.standard1, standardCode: "Sc1.1", standardDescription: "Living things", questionsCount: 1, questionsAnswered: 1, questionsCorrect: 1, masteryPercentage: 100, colorCode: "blue" },
        expect.objectContaining({ standardId: SCI.standard2, masteryPercentage: 100 }),
      ]));
    });

    it("returns empty history and zero mastery for a lesson without attempts", async () => {
      const result = await getStudentLessonAnalytics({ user: admin, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson2 } });
      expect(result).toMatchObject({ attemptHistory: [], standardsPerformance: [] });
    });
  });

  describe("getStudentLessonProgress", () => {
    it("resolves 'me' and a lesson id for the own completion", async () => {
      await expect(getStudentLessonProgress({ user: ann, tenant, input: { studentId: "me", lessonId: SCI.lesson1 } })).resolves.toEqual({
        studentId: "sci-ann", lessonId: SCI.lesson1, status: "COMPLETED", attemptsCount: 2, bestScore: 3, bestScorePercentage: 100, mostRecentScore: 3, mostRecentScorePercentage: 100, totalTimeSpentSeconds: 40, lastAttemptAt: "2026-03-02T00:10:00.000Z", completedAt: "2026-03-02T00:10:00.000Z",
      });
    });

    it("returns NOT_STARTED defaults when no completion exists", async () => {
      await expect(getStudentLessonProgress({ user: outsider, tenant, input: { studentId: "sci-out", lessonId: SCI.lesson1 } })).resolves.toMatchObject({ status: "NOT_STARTED", attemptsCount: 0, bestScore: null, lastAttemptAt: null, completedAt: null, totalTimeSpentSeconds: 0 });
    });

    it("lets the class teacher read an enrolled student's progress on a class lesson", async () => {
      await expect(getStudentLessonProgress({ user: teacher, tenant, input: { studentId: "sci-ben", lessonId: SCI.lesson1 } })).resolves.toMatchObject({ studentId: "sci-ben", status: "COMPLETED", mostRecentScorePercentage: 50 });
    });

    it("rejects another student, another teacher, a lesson outside the class, and a non-enrolled student", async () => {
      await expect(getStudentLessonProgress({ user: ben, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } })).rejects.toThrow("progress:read:all");
      await expect(getStudentLessonProgress({ user: otherTeacher, tenant, input: { studentId: "sci-ann", lessonId: SCI.lesson1 } })).rejects.toThrow("Not authorized to view progress");
      await expect(getStudentLessonProgress({ user: teacher, tenant, input: { studentId: "sci-ann", lessonId: SCI.orphanLesson } })).rejects.toThrow("Not authorized to view progress");
      await expect(getStudentLessonProgress({ user: teacher, tenant, input: { studentId: "sci-out", lessonId: SCI.lesson1 } })).rejects.toThrow("Not authorized to view progress");
    });

    it("throws for a missing student or lesson", async () => {
      await expect(getStudentLessonProgress({ user: teacher, tenant, input: { studentId: "nobody", lessonId: SCI.lesson1 } })).rejects.toThrow("Student not found");
      await expect(getStudentLessonProgress({ user: ann, tenant, input: { studentId: "me", lessonId: MISSING } })).rejects.toThrow("Lesson not found");
    });
  });

  describe("getStudentMasteryProfile", () => {
    it("rejects another student and a missing student", async () => {
      await expect(getStudentMasteryProfile({ user: ben, tenant, input: { studentId: "sci-ann" } })).rejects.toThrow("progress:read:all");
      await expect(getStudentMasteryProfile({ user: teacher, tenant, input: { studentId: "nobody" } })).rejects.toThrow("Student not found");
    });

    it("groups standards into strands sorted by weakest average with labels and colors", async () => {
      const result = await getStudentMasteryProfile({ user: ann, tenant, input: { studentId: "sci-ann" } });
      expect(result).toMatchObject({ status: "READY", student: { id: "sci-ann", name: "Ann", grade: 5 }, nextCursor: null });
      expect(result).not.toHaveProperty("retryAfterSeconds");
      expect(result.strands).toEqual([
        { code: "Sc1", title: "Living Things", masteryAverage: 0.4, standards: [{ standardId: SCI.standard1, code: "Sc1.1", titleEn: "Living things", titleTh: "Living things", masteryLevel: 0.4, masteryLabel: "Needs Support", masteryColorToken: "critical", evidenceCount: 3, lastAssessedAt: "2026-03-02T00:00:00.000Z" }] },
        { code: "Sc4", title: "Forces and Motion", masteryAverage: 0.9, standards: [expect.objectContaining({ masteryLabel: "Proficient", masteryColorToken: "strong" })] },
      ]);
    });

    it("pages by mastery id with a cursor", async () => {
      const first = await getStudentMasteryProfile({ user: teacher, tenant, input: { studentId: "sci-ann", limit: 1 } });
      expect(first.nextCursor).toBe(SCI.mastery1);
      expect(first.strands.map((strand) => strand.code)).toEqual(["Sc1"]);
      const second = await getStudentMasteryProfile({ user: teacher, tenant, input: { studentId: "sci-ann", limit: 1, cursor: SCI.mastery1 } });
      expect(second.nextCursor).toBeNull();
      expect(second.strands.map((strand) => strand.code)).toEqual(["Sc4"]);
    });

    it("filters by strand, returns no strands for an unknown strand, and adds AI annotations on request", async () => {
      const forces = await getStudentMasteryProfile({ user: teacher, tenant, input: { studentId: "sci-ann", strand: "Sc4", includeRecommendations: true } });
      expect(forces.strands.map((strand) => strand.code)).toEqual(["Sc4"]);
      expect(forces.strands[0]!.standards[0]!.aiAnnotation).toEqual({ recommended: false, traceId: "" });
      const none = await getStudentMasteryProfile({ user: teacher, tenant, input: { studentId: "sci-ann", strand: "Sc9" } });
      expect(none).toMatchObject({ status: "READY", strands: [], nextCursor: null });
    });

    it("reports CALCULATING with a retry hint while a mastery run is pending", async () => {
      await harness.db.insert(scienceMasteryRuns).values({ attemptId: SCI.attempt2, studentId: "sci-ann", schoolId: SCI.school, status: "PENDING" });
      const result = await getStudentMasteryProfile({ user: ann, tenant, input: { studentId: "sci-ann" } });
      expect(result).toMatchObject({ status: "CALCULATING", retryAfterSeconds: 10 });
    });
  });

  describe("getStudentAchievements", () => {
    it("returns the own badges newest first and lets a teacher read them", async () => {
      const expected = { achievements: [{ badgeType: "PERFECT_SCORE", unlockedAt: new Date("2026-03-02T00:00:00Z") }, { badgeType: "FIRST_LESSON", unlockedAt: new Date("2026-03-01T00:00:00Z") }] };
      await expect(getStudentAchievements({ user: ann, tenant, input: { studentId: "sci-ann" } })).resolves.toEqual(expected);
      await expect(getStudentAchievements({ user: teacher, tenant, input: { studentId: "sci-ann" } })).resolves.toEqual(expected);
    });

    it("rejects another student", async () => {
      await expect(getStudentAchievements({ user: ben, tenant, input: { studentId: "sci-ann" } })).rejects.toThrow("gamification:read:all");
    });
  });

  describe("getStudentAssignments", () => {
    it("returns assignments of the student's classes with class, lesson, and teacher", async () => {
      await expect(getStudentAssignments({ user: ann, tenant, input: { studentId: "sci-ann" } })).resolves.toEqual({ success: true, data: { assignments: [{
        id: SCI.assignment, classId: SCI.classId, className: "Physics 5", lessonId: SCI.lesson1,
        lesson: { id: SCI.lesson1, title: "Lesson One", slug: "sci-lesson-1", order: 1 },
        assignedAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-08T00:00:00.000Z", assignedBy: "sci-teacher", teacher: { id: "sci-teacher", name: "Teacher T" },
      }] } });
    });

    it("returns no assignments for a student without classes and rejects another student", async () => {
      await expect(getStudentAssignments({ user: outsider, tenant, input: { studentId: "sci-out" } })).resolves.toEqual({ success: true, data: { assignments: [] } });
      await expect(getStudentAssignments({ user: ben, tenant, input: { studentId: "sci-ann" } })).rejects.toThrow("progress:read:all");
    });
  });
});
