/**
 * Shared PGlite seed for science read-path tests (classes, students, teachers, curriculum).
 *
 * TEST-ONLY. Builds one school with a teacher-owned class, two enrolled students,
 * one outsider student, a two-lesson unit, one orphan lesson, quiz questions,
 * attempts, responses, completions, mastery, an assignment, and achievements.
 */
import type { UserContext } from "@reading-advantage/auth";
import {
  achievements,
  schools,
  scienceAssignments,
  scienceAttempts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceLessonStandards,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
  scienceStandards,
  scienceUnitLessons,
  users,
} from "@reading-advantage/db";
import type { TestDb } from "./testDb.js";

/** Stable identifiers for every seeded science row. */
export const SCI = {
  school: "5c000000-0000-4000-8000-000000000001",
  otherSchool: "5c000000-0000-4000-8000-000000000002",
  classId: "5c000000-0000-4000-8000-0000000000c1",
  emptyClassId: "5c000000-0000-4000-8000-0000000000c2",
  otherTeacherClassId: "5c000000-0000-4000-8000-0000000000c3",
  unitId: "5c000000-0000-4000-8000-0000000000a1",
  otherFrameworkUnitId: "5c000000-0000-4000-8000-0000000000a2",
  lesson1: "5c000000-0000-4000-8000-0000000000b1",
  lesson2: "5c000000-0000-4000-8000-0000000000b2",
  orphanLesson: "5c000000-0000-4000-8000-0000000000b3",
  standard1: "5c000000-0000-4000-8000-0000000000d1",
  standard2: "5c000000-0000-4000-8000-0000000000d2",
  question1: "5c000000-0000-4000-8000-0000000000e1",
  question2: "5c000000-0000-4000-8000-0000000000e2",
  attempt1: "5c000000-0000-4000-8000-0000000000f1",
  attempt2: "5c000000-0000-4000-8000-0000000000f2",
  attempt3: "5c000000-0000-4000-8000-0000000000f3",
  assignment: "5c000000-0000-4000-8000-000000000101",
  mastery1: "5c000000-0000-4000-8000-000000000201",
  mastery2: "5c000000-0000-4000-8000-000000000202",
} as const;

/** Long question text used to check truncation at 50 characters. */
export const LONG_QUESTION_TEXT = "Which force keeps the planets in orbit around the sun every year?";

/**
 * Builds a user context for a seeded science user.
 * @param role Role of the caller.
 * @param id Seeded user id.
 * @param schoolId School of the caller.
 * @returns A user context for domain calls.
 */
export function sciUser(role: UserContext["role"], id: string, schoolId: string = SCI.school): UserContext {
  return { id, username: id, name: id, role, schoolId, xp: 0, level: 1, cefrLevel: "A1" };
}

/**
 * Seeds the shared science fixture into a fresh test database.
 * @param harness PGlite harness from createTestDb.
 * @returns Completion after every row is inserted.
 */
export async function seedScience(harness: TestDb): Promise<void> {
  const { db } = harness;
  const school = SCI.school;
  await db.insert(schools).values([{ id: school, name: "Science School" }, { id: SCI.otherSchool, name: "Other School" }]);
  await db.insert(users).values([
    { id: "sci-teacher", username: "sci-teacher", displayUsername: "sci-teacher", name: "Teacher T", role: "TEACHER", schoolId: school },
    { id: "sci-teacher-2", username: "sci-teacher-2", displayUsername: "sci-teacher-2", name: "Teacher Two", role: "TEACHER", schoolId: school },
    { id: "sci-admin", username: "sci-admin", displayUsername: "sci-admin", name: "Admin", role: "ADMIN", schoolId: school },
    { id: "sci-ann", username: "sci-ann", displayUsername: "sci-ann", name: "Ann", role: "STUDENT", schoolId: school, gradeLevel: 5 },
    { id: "sci-ben", username: "sci-ben", displayUsername: "sci-ben", name: "Ben", role: "STUDENT", schoolId: school, gradeLevel: 5 },
    { id: "sci-out", username: "sci-out", displayUsername: "sci-out", name: "Outsider", role: "STUDENT", schoolId: school },
  ]);
  await db.insert(scienceClasses).values([
    { id: SCI.classId, name: "Physics 5", gradeLevel: 5, standardsAlignment: "NGSS", joinCode: "SCI001", teacherId: "sci-teacher", schoolId: school, createdAt: new Date("2026-01-01T00:00:00Z") },
    { id: SCI.emptyClassId, name: "Empty 5", gradeLevel: 5, standardsAlignment: "NGSS", joinCode: "SCI002", teacherId: "sci-teacher", schoolId: school, createdAt: new Date("2026-02-01T00:00:00Z") },
    { id: SCI.otherTeacherClassId, name: "Other", gradeLevel: 5, standardsAlignment: "NGSS", joinCode: "SCI003", teacherId: "sci-teacher-2", schoolId: school },
  ]);
  await db.insert(scienceClassStudents).values([
    { classId: SCI.classId, studentId: "sci-ann", schoolId: school },
    { classId: SCI.classId, studentId: "sci-ben", schoolId: school },
  ]);
  await db.insert(scienceStandards).values([
    { id: SCI.standard1, framework: "NGSS", code: "Sc1.1", description: "Living things", gradeLevel: 5, schoolId: school },
    { id: SCI.standard2, framework: "NGSS", code: "Sc4.2", description: "Forces", gradeLevel: 5, schoolId: school },
  ]);
  await db.insert(scienceLessons).values([
    { id: SCI.lesson1, slug: "sci-lesson-1", title: "Lesson One", titleThai: "บทหนึ่ง", description: "Objective one", content: "Body one", gradeLevel: 5, order: 1, schoolId: school },
    { id: SCI.lesson2, slug: "sci-lesson-2", title: "Lesson Two", structuredContent: { blocks: [] }, gradeLevel: 5, order: 2, schoolId: school },
    { id: SCI.orphanLesson, slug: "sci-orphan", title: "Orphan", gradeLevel: 5, order: 3, schoolId: school },
  ]);
  await db.insert(scienceCurriculumUnits).values([
    { id: SCI.unitId, slug: "sci-unit-1", title: "Unit One", description: "First unit", framework: "NGSS", gradeLevel: 5, order: 1, classId: SCI.classId, schoolId: school },
    { id: SCI.otherFrameworkUnitId, slug: "sci-unit-x", title: "Other Framework", framework: "THAI", gradeLevel: 5, order: 2, classId: SCI.classId, schoolId: school },
  ]);
  await db.insert(scienceUnitLessons).values([
    { unitId: SCI.unitId, lessonId: SCI.lesson2, schoolId: school },
    { unitId: SCI.unitId, lessonId: SCI.lesson1, schoolId: school },
  ]);
  await db.insert(scienceLessonStandards).values([{ lessonId: SCI.lesson1, standardId: SCI.standard1, schoolId: school }]);
  await db.insert(scienceQuizQuestions).values([
    { id: SCI.question1, slug: "sci-q1", lessonId: SCI.lesson1, type: "MULTIPLE_CHOICE", text: LONG_QUESTION_TEXT, correctAnswer: "gravity", points: 2, order: 1, schoolId: school },
    { id: SCI.question2, slug: "sci-q2", lessonId: SCI.lesson1, type: "TRUE_FALSE", text: "Plants need light.", correctAnswer: true, order: 2, schoolId: school },
  ]);
  await db.insert(scienceQuestionStandards).values([
    { questionId: SCI.question1, standardId: SCI.standard1, schoolId: school },
    { questionId: SCI.question2, standardId: SCI.standard2, schoolId: school },
  ]);
  await db.insert(scienceAttempts).values([
    { id: SCI.attempt1, studentId: "sci-ann", lessonId: SCI.lesson1, schoolId: school, score: 0, maxScore: 3, attemptNumber: 1, startedAt: new Date("2026-03-01T00:00:00Z"), completedAt: new Date("2026-03-01T00:10:00Z") },
    { id: SCI.attempt2, studentId: "sci-ann", lessonId: SCI.lesson1, schoolId: school, score: 3, maxScore: 3, attemptNumber: 2, startedAt: new Date("2026-03-02T00:00:00Z"), completedAt: new Date("2026-03-02T00:10:00Z") },
    { id: SCI.attempt3, studentId: "sci-ben", lessonId: SCI.lesson1, schoolId: school, score: 1, maxScore: 3, attemptNumber: 1, startedAt: new Date("2026-03-03T00:00:00Z"), completedAt: new Date("2026-03-03T00:10:00Z") },
  ]);
  await db.insert(scienceQuestionResponses).values([
    { attemptId: SCI.attempt1, questionId: SCI.question1, studentAnswer: "magnetism", isCorrect: false, timeSpentSeconds: 5, order: 1, schoolId: school },
    { attemptId: SCI.attempt1, questionId: SCI.question2, studentAnswer: false, isCorrect: false, timeSpentSeconds: 5, order: 2, schoolId: school },
    { attemptId: SCI.attempt2, questionId: SCI.question1, studentAnswer: "gravity", isCorrect: true, timeSpentSeconds: 10, order: 1, schoolId: school },
    { attemptId: SCI.attempt2, questionId: SCI.question2, studentAnswer: true, isCorrect: true, timeSpentSeconds: 20, order: 2, schoolId: school },
    { attemptId: SCI.attempt3, questionId: SCI.question1, studentAnswer: "friction", isCorrect: false, timeSpentSeconds: 30, order: 1, schoolId: school },
    { attemptId: SCI.attempt3, questionId: SCI.question2, studentAnswer: true, isCorrect: true, timeSpentSeconds: 40, order: 2, schoolId: school },
  ]);
  await db.insert(scienceLessonCompletions).values([
    { studentId: "sci-ann", lessonId: SCI.lesson1, schoolId: school, status: "COMPLETED", attemptsCount: 2, bestScore: 3, bestScorePercentage: 100, mostRecentScore: 3, mostRecentScorePercentage: 100, totalTimeSpentSeconds: 40, lastAttemptAt: new Date("2026-03-02T00:10:00Z"), completedAt: new Date("2026-03-02T00:10:00Z") },
    { studentId: "sci-ben", lessonId: SCI.lesson1, schoolId: school, status: "COMPLETED", attemptsCount: 1, bestScore: 1, bestScorePercentage: 50, mostRecentScore: 1, mostRecentScorePercentage: 50, totalTimeSpentSeconds: 70, lastAttemptAt: new Date("2026-03-03T00:10:00Z"), completedAt: new Date("2026-03-03T00:10:00Z") },
    { studentId: "sci-ann", lessonId: SCI.lesson2, schoolId: school, status: "IN_PROGRESS", attemptsCount: 1, totalTimeSpentSeconds: 15 },
  ]);
  await db.insert(scienceAssignments).values([
    { id: SCI.assignment, classId: SCI.classId, lessonId: SCI.lesson1, assignedBy: "sci-teacher", schoolId: school, assignedAt: new Date("2026-03-01T00:00:00Z"), dueAt: new Date("2026-03-08T00:00:00Z"), createdAt: new Date("2026-03-01T00:00:00Z") },
  ]);
  await db.insert(scienceStandardMastery).values([
    { id: SCI.mastery1, studentId: "sci-ann", standardId: SCI.standard1, schoolId: school, masteryLevel: "0.40", evidenceCount: 3, lastAssessedAt: new Date("2026-03-02T00:00:00Z") },
    { id: SCI.mastery2, studentId: "sci-ann", standardId: SCI.standard2, schoolId: school, masteryLevel: "0.90", evidenceCount: 5, lastAssessedAt: new Date("2026-03-02T00:00:00Z") },
  ]);
  await db.insert(achievements).values([
    { userId: "sci-ann", schoolId: school, badgeType: "FIRST_LESSON", unlockedAt: new Date("2026-03-01T00:00:00Z") },
    { userId: "sci-ann", schoolId: school, badgeType: "PERFECT_SCORE", unlockedAt: new Date("2026-03-02T00:00:00Z") },
  ]);
}
