import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceAttempts, scienceClassStudents, scienceClasses, scienceCurriculumUnits,
  scienceLessonCompletions, scienceLessonStandards, scienceLessons,
  scienceQuestionResponses, scienceQuestionStandards, scienceStandards, scienceUnitLessons, users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

function getColorCode(p: number) { return p >= 90 ? "blue" : p >= 80 ? "green" : p >= 60 ? "yellow" : "red"; }

/**
 * Gets per-student, per-class analytics: lesson performance + standards mastery.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing studentId and classId
 * @returns Class analytics with lessons performance and standards performance
 */
export async function getStudentClassAnalytics({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string; classId: string } }) {
  if (input.studentId !== user.id) assertCan(user, "progress:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [classRecord] = await tenantDb.select().from(scienceClasses).where(eq(scienceClasses.id, input.classId)).limit(1);
  if (!classRecord) throw new Error("Class not found");
  if (classRecord.teacherId !== user.id && user.role !== "ADMIN") throw new Error("Unauthorized");

  const [enrollment] = await tenantDb.select({ id: users.id, name: users.name }).from(scienceClassStudents).innerJoin(users, eq(users.id, scienceClassStudents.studentId)).where(and(eq(scienceClassStudents.classId, input.classId), eq(scienceClassStudents.studentId, input.studentId))).limit(1);
  if (!enrollment) throw new Error("Student is not enrolled in this class");

  const lessonRows = await tenantDb.select({ lesson: scienceLessons }).from(scienceLessons).innerJoin(scienceUnitLessons, eq(scienceUnitLessons.lessonId, scienceLessons.id)).innerJoin(scienceCurriculumUnits, eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)).where(eq(scienceCurriculumUnits.classId, input.classId)).orderBy(asc(scienceLessons.order));
  const lessons = Array.from(new Map(lessonRows.map((r) => [r.lesson.id, r.lesson])).values()).sort((a, b) => a.order - b.order);
  const lessonIds = lessons.map((l) => l.id);

  const completions = lessonIds.length ? await tenantDb.select().from(scienceLessonCompletions).where(and(eq(scienceLessonCompletions.studentId, input.studentId), inArray(scienceLessonCompletions.lessonId, lessonIds))) : [];
  const completionByLesson = new Map(completions.map((c) => [c.lessonId, c]));

  const completedAttempts = lessonIds.length ? await tenantDb.select().from(scienceAttempts).where(and(eq(scienceAttempts.studentId, input.studentId), inArray(scienceAttempts.lessonId, lessonIds), isNotNull(scienceAttempts.completedAt))).orderBy(desc(scienceAttempts.completedAt)) : [];
  const attemptsByLesson = new Map<string, typeof completedAttempts>();
  for (const a of completedAttempts) { const arr = attemptsByLesson.get(a.lessonId) ?? []; arr.push(a); attemptsByLesson.set(a.lessonId, arr); }

  const mostRecentAttemptIds = Array.from(attemptsByLesson.values()).map((arr) => arr[0]?.id).filter((v): v is string => Boolean(v));
  const recentResponses = mostRecentAttemptIds.length ? await tenantDb.select({ attemptId: scienceQuestionResponses.attemptId, questionId: scienceQuestionResponses.questionId, isCorrect: scienceQuestionResponses.isCorrect }).from(scienceQuestionResponses).where(inArray(scienceQuestionResponses.attemptId, mostRecentAttemptIds)) : [];

  const lessonStandardLinks = lessonIds.length ? await tenantDb.select({ lessonId: scienceLessonStandards.lessonId, standard: scienceStandards }).from(scienceLessonStandards).innerJoin(scienceStandards, eq(scienceStandards.id, scienceLessonStandards.standardId)).where(inArray(scienceLessonStandards.lessonId, lessonIds)) : [];
  const responseQuestionIds = recentResponses.map((r) => r.questionId);
  const questionStandardLinks = responseQuestionIds.length ? await tenantDb.select({ questionId: scienceQuestionStandards.questionId, standardId: scienceQuestionStandards.standardId }).from(scienceQuestionStandards).where(inArray(scienceQuestionStandards.questionId, responseQuestionIds)) : [];
  const standardsByQuestion = new Map<string, string[]>();
  for (const link of questionStandardLinks) { const arr = standardsByQuestion.get(link.questionId) ?? []; arr.push(link.standardId); standardsByQuestion.set(link.questionId, arr); }

  const lessonsPerformance = lessons.map((lesson) => {
    const completion = completionByLesson.get(lesson.id);
    const completionStatus = completion?.status === "COMPLETED" ? "completed" : completion?.status === "IN_PROGRESS" ? "in_progress" : "not_started";
    const mostRecentScore = completion?.mostRecentScorePercentage ?? null;
    return { lessonId: lesson.id, lessonTitle: lesson.title, lessonOrder: lesson.order, completionStatus, mostRecentScore, mostRecentScorePercentage: mostRecentScore, attemptsCount: completion?.attemptsCount ?? 0, totalTimeSeconds: completion?.totalTimeSpentSeconds ?? 0, colorCode: mostRecentScore !== null ? getColorCode(mostRecentScore) : null };
  });

  const completedLessons = lessonsPerformance.filter((lp) => lp.completionStatus === "completed");
  const averageScore = completedLessons.length > 0 ? completedLessons.reduce((sum, lp) => sum + (lp.mostRecentScore || 0), 0) / completedLessons.length : 0;

  const standardsMap = new Map<string, { standardId: string; standardCode: string; standardDescription: string; questionsAnswered: number; questionsCorrect: number }>();
  for (const link of lessonStandardLinks) { if (!standardsMap.has(link.standard.id)) standardsMap.set(link.standard.id, { standardId: link.standard.id, standardCode: link.standard.code, standardDescription: link.standard.description, questionsAnswered: 0, questionsCorrect: 0 }); }
  for (const lesson of lessons) {
    const lessonAttempts = attemptsByLesson.get(lesson.id) ?? [];
    if (lessonAttempts.length === 0) continue;
    for (const r of recentResponses.filter((r) => r.attemptId === lessonAttempts[0].id)) {
      for (const sid of standardsByQuestion.get(r.questionId) ?? []) { const entry = standardsMap.get(sid); if (entry) { entry.questionsAnswered += 1; if (r.isCorrect) entry.questionsCorrect += 1; } }
    }
  }

  const standardsPerformance = Array.from(standardsMap.values()).map((e) => {
    const mp = e.questionsAnswered > 0 ? (e.questionsCorrect / e.questionsAnswered) * 100 : 0;
    return { ...e, masteryPercentage: Math.round(mp * 10) / 10, colorCode: getColorCode(mp), needsIntervention: mp < 60 };
  }).sort((a, b) => a.masteryPercentage - b.masteryPercentage);

  return {
    student: { id: enrollment.id, name: enrollment.name },
    class: { id: classRecord.id, name: classRecord.name, gradeLevel: classRecord.gradeLevel, standardsAlignment: classRecord.standardsAlignment },
    summary: { lessonsCompleted: completedLessons.length, totalLessons: lessons.length, averageScore: Math.round(averageScore * 10) / 10, averageScorePercentage: Math.round(averageScore * 10) / 10, totalTimeSpent: lessonsPerformance.reduce((s, l) => s + l.totalTimeSeconds, 0), totalAttempts: lessonsPerformance.reduce((s, l) => s + l.attemptsCount, 0), colorCode: getColorCode(averageScore) },
    lessonsPerformance, standardsPerformance,
  };
}
