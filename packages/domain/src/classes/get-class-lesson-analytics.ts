import { and, eq, exists, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceAttempts, scienceClasses, scienceClassStudents, scienceCurriculumUnits,
  scienceLessonCompletions, scienceLessonStandards, scienceLessons,
  scienceQuestionResponses, scienceQuestionStandards, scienceQuizQuestions,
  scienceStandards, scienceUnitLessons, users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

function getColorCode(p: number) { return p >= 90 ? "blue" : p >= 80 ? "green" : p >= 60 ? "yellow" : "red"; }
function truncateText(t: string, max = 50) { return t.length <= max ? t : t.substring(0, max) + "..."; }

/**
 * Gets per-lesson student + question + standards analytics for a class.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing classId and lessonId
 * @returns Class lesson analytics
 */
export async function getClassLessonAnalytics({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { classId: string; lessonId: string } }) {
  assertCan(user, "class:read", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [classRecord] = await tenantDb.select().from(scienceClasses).where(eq(scienceClasses.id, input.classId)).limit(1);
  if (!classRecord) throw new Error("Class not found");
  if (classRecord.teacherId !== user.id && user.role !== "ADMIN") throw new Error("Unauthorized");

  const studentRows = await tenantDb.select({ id: users.id, name: users.name }).from(scienceClassStudents).innerJoin(users, eq(users.id, scienceClassStudents.studentId)).where(eq(scienceClassStudents.classId, input.classId));

  const [lesson] = await tenantDb.select().from(scienceLessons).where(and(eq(scienceLessons.id, input.lessonId), exists(tenantDb.select({ id: scienceUnitLessons.lessonId }).from(scienceUnitLessons).innerJoin(scienceCurriculumUnits, eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)).where(and(eq(scienceUnitLessons.lessonId, scienceLessons.id), eq(scienceCurriculumUnits.classId, input.classId)))))).limit(1);
  if (!lesson) throw new Error("Lesson not found in this class");

  const lessonStandards = await tenantDb.select({ id: scienceStandards.id, code: scienceStandards.code, description: scienceStandards.description }).from(scienceLessonStandards).innerJoin(scienceStandards, eq(scienceStandards.id, scienceLessonStandards.standardId)).where(eq(scienceLessonStandards.lessonId, lesson.id));
  const quizQuestions = await tenantDb.select().from(scienceQuizQuestions).where(eq(scienceQuizQuestions.lessonId, lesson.id)).orderBy(scienceQuizQuestions.order);
  const questionIds = quizQuestions.map((q) => q.id);
  const questionStandardLinks = questionIds.length ? await tenantDb.select({ questionId: scienceQuestionStandards.questionId, standard: scienceStandards }).from(scienceQuestionStandards).innerJoin(scienceStandards, eq(scienceStandards.id, scienceQuestionStandards.standardId)).where(inArray(scienceQuestionStandards.questionId, questionIds)) : [];
  const standardsByQuestion = new Map<string, Array<{ id: string; code: string; description: string }>>();
  for (const row of questionStandardLinks) { const arr = standardsByQuestion.get(row.questionId) ?? []; arr.push({ id: row.standard.id, code: row.standard.code, description: row.standard.description }); standardsByQuestion.set(row.questionId, arr); }

  const studentIds = studentRows.map((s) => s.id);
  const lessonCompletions = studentIds.length > 0 ? await tenantDb.select({ completion: scienceLessonCompletions, student: { id: users.id, name: users.name } }).from(scienceLessonCompletions).innerJoin(users, eq(users.id, scienceLessonCompletions.studentId)).where(and(eq(scienceLessonCompletions.lessonId, lesson.id), inArray(scienceLessonCompletions.studentId, studentIds))) : [];
  const questionResponseRows = studentIds.length > 0 && questionIds.length > 0 ? await tenantDb.select({ response: scienceQuestionResponses, attempt: { studentId: scienceAttempts.studentId }, student: { id: users.id, name: users.name } }).from(scienceQuestionResponses).innerJoin(scienceAttempts, eq(scienceAttempts.id, scienceQuestionResponses.attemptId)).innerJoin(users, eq(users.id, scienceAttempts.studentId)).where(and(inArray(scienceQuestionResponses.questionId, questionIds), inArray(scienceAttempts.studentId, studentIds))) : [];

  const totalStudents = studentRows.length;
  const studentsCompleted = lessonCompletions.filter((lc) => lc.completion.status === "COMPLETED").length;
  const completionRate = totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0;
  const completedRows = lessonCompletions.filter((lc) => lc.completion.status === "COMPLETED");
  const averageScore = completedRows.length > 0 ? completedRows.reduce((s, lc) => s + (lc.completion.mostRecentScore || 0), 0) / completedRows.length : 0;
  const averageScorePercentage = completedRows.length > 0 ? completedRows.reduce((s, lc) => s + (lc.completion.mostRecentScorePercentage || 0), 0) / completedRows.length : 0;

  const completionByStudent = new Map(lessonCompletions.map((lc) => [lc.completion.studentId, lc.completion]));
  const studentsData = studentRows.map((student) => {
    const c = completionByStudent.get(student.id);
    return { studentId: student.id, studentName: student.name, completionStatus: c?.status || "NOT_STARTED", mostRecentScore: c?.mostRecentScore ?? null, mostRecentScorePercentage: c?.mostRecentScorePercentage ?? null, bestScore: c?.bestScore ?? null, bestScorePercentage: c?.bestScorePercentage ?? null, attempts: c?.attemptsCount || 0, totalTimeSeconds: c?.totalTimeSpentSeconds || 0, colorCode: c?.mostRecentScorePercentage != null ? getColorCode(c.mostRecentScorePercentage) : null };
  });

  const questionAnalytics = quizQuestions.map((question, index) => {
    const responses = questionResponseRows.filter((r) => r.response.questionId === question.id);
    const correct = responses.filter((r) => r.response.isCorrect);
    const incorrect = responses.filter((r) => !r.response.isCorrect);
    const pct = responses.length > 0 ? (correct.length / responses.length) * 100 : 0;
    const avgTime = responses.length > 0 ? responses.reduce((s, r) => s + r.response.timeSpentSeconds, 0) / responses.length : 0;
    const incorrectStudents = Array.from(new Set(incorrect.map((r) => r.attempt.studentId))).map((sid) => incorrect.find((r) => r.attempt.studentId === sid)?.student.name ?? "").filter(Boolean).sort();
    return { questionId: question.id, questionNumber: index + 1, questionTextTruncated: truncateText(question.text), questionType: question.type, percentCorrect: Math.round(pct * 10) / 10, averageTimeSeconds: Math.round(avgTime), totalResponses: responses.length, correctResponses: correct.length, incorrectStudents };
  }).sort((a, b) => a.percentCorrect - b.percentCorrect);

  const standardsAccumulator = new Map<string, { standardId: string; standardCode: string; standardDescription: string; questionsCount: number; responses: Array<{ studentId: string; isCorrect: boolean }> }>();
  for (const q of quizQuestions) {
    for (const s of standardsByQuestion.get(q.id) ?? []) {
      if (!standardsAccumulator.has(s.id)) standardsAccumulator.set(s.id, { standardId: s.id, standardCode: s.code, standardDescription: s.description, questionsCount: 0, responses: [] });
      standardsAccumulator.get(s.id)!.questionsCount += 1;
      for (const r of questionResponseRows.filter((r) => r.response.questionId === q.id)) standardsAccumulator.get(s.id)!.responses.push({ studentId: r.attempt.studentId, isCorrect: r.response.isCorrect });
    }
  }

  const standardsAnalytics = Array.from(standardsAccumulator.values()).map((entry) => {
    const agg = new Map<string, { correct: number; total: number }>();
    for (const r of entry.responses) { const s = agg.get(r.studentId) ?? { correct: 0, total: 0 }; s.total += 1; if (r.isCorrect) s.correct += 1; agg.set(r.studentId, s); }
    let mastered = 0;
    for (const s of agg.values()) { if ((s.correct / s.total) * 100 >= 80) mastered++; }
    const pctMastered = agg.size > 0 ? (mastered / agg.size) * 100 : 0;
    return { standardId: entry.standardId, standardCode: entry.standardCode, standardDescription: entry.standardDescription, questionsCount: entry.questionsCount, studentsMastered: mastered, percentMastered: Math.round(pctMastered * 10) / 10, flagForReteach: pctMastered < 70, colorCode: getColorCode(pctMastered) };
  });

  return {
    lesson: { id: lesson.id, title: lesson.title, order: lesson.order },
    standards: lessonStandards.map((s) => ({ code: s.code, description: s.description })),
    classStats: { totalStudents, studentsCompleted, completionRate: Math.round(completionRate * 10) / 10, averageScore: Math.round(averageScore * 10) / 10, averageScorePercentage: Math.round(averageScorePercentage * 10) / 10 },
    students: studentsData, questions: questionAnalytics, standardsPerformance: standardsAnalytics,
  };
}
