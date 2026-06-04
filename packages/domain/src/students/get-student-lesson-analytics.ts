import { and, asc, desc, eq, exists, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceAttempts, scienceClassStudents, scienceClasses, scienceLessonStandards,
  scienceLessons, scienceQuestionResponses, scienceQuestionStandards, scienceQuizQuestions, scienceStandards, users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

function getColorCode(p: number) { return p >= 90 ? "blue" : p >= 80 ? "green" : p >= 60 ? "yellow" : "red"; }

/**
 * Gets per-student, per-lesson attempt history + standards mastery.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing studentId and lessonId
 * @returns Lesson analytics with attempt history and standards performance
 */
export async function getStudentLessonAnalytics({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string; lessonId: string } }) {
  if (input.studentId !== user.id) assertCan(user, "progress:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [student] = await tenantDb.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, input.studentId)).limit(1);
  if (!student) throw new Error("Student not found");

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) {
    const matches = await tenantDb.select({ classId: scienceClasses.id }).from(scienceClasses).where(and(eq(scienceClasses.teacherId, user.id), exists(tenantDb.select({ id: scienceClassStudents.studentId }).from(scienceClassStudents).where(and(eq(scienceClassStudents.classId, scienceClasses.id), eq(scienceClassStudents.studentId, input.studentId)))))).limit(1);
    if (matches.length === 0) throw new Error("Unauthorized");
  }

  const [lesson] = await tenantDb.select().from(scienceLessons).where(eq(scienceLessons.id, input.lessonId)).limit(1);
  if (!lesson) throw new Error("Lesson not found");

  const quizQuestions = await tenantDb.select().from(scienceQuizQuestions).where(eq(scienceQuizQuestions.lessonId, lesson.id)).orderBy(asc(scienceQuizQuestions.order));
  const questionIds = quizQuestions.map((q) => q.id);

  const questionStandardLinks = questionIds.length ? await tenantDb.select({ questionId: scienceQuestionStandards.questionId, standard: scienceStandards }).from(scienceQuestionStandards).innerJoin(scienceStandards, eq(scienceStandards.id, scienceQuestionStandards.standardId)).where(inArray(scienceQuestionStandards.questionId, questionIds)) : [];
  const standardsByQuestion = new Map<string, Array<{ id: string; code: string; description: string }>>();
  for (const link of questionStandardLinks) { const arr = standardsByQuestion.get(link.questionId) ?? []; arr.push({ id: link.standard.id, code: link.standard.code, description: link.standard.description }); standardsByQuestion.set(link.questionId, arr); }

  const attempts = await tenantDb.select().from(scienceAttempts).where(and(eq(scienceAttempts.studentId, input.studentId), eq(scienceAttempts.lessonId, input.lessonId))).orderBy(desc(scienceAttempts.attemptNumber));
  const attemptIds = attempts.map((a) => a.id);
  const responses = attemptIds.length ? await tenantDb.select().from(scienceQuestionResponses).where(inArray(scienceQuestionResponses.attemptId, attemptIds)).orderBy(asc(scienceQuestionResponses.order)) : [];
  const responsesByAttempt = new Map<string, typeof scienceQuestionResponses.$inferSelect[]>();
  for (const r of responses) { const arr = responsesByAttempt.get(r.attemptId) ?? []; arr.push(r); responsesByAttempt.set(r.attemptId, arr); }
  const questionById = new Map(quizQuestions.map((q) => [q.id, q]));

  const attemptHistory = attempts.map((attempt) => {
    const ar = responsesByAttempt.get(attempt.id) ?? [];
    const totalQ = ar.length; const correct = ar.filter((r) => r.isCorrect).length;
    const scorePct = totalQ > 0 ? (correct / totalQ) * 100 : 0;
    return {
      attemptId: attempt.id, attemptNumber: attempt.attemptNumber, startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString() || null, status: attempt.completedAt ? "completed" : "in_progress",
      score: attempt.score, maxScore: attempt.maxScore, scorePercentage: Math.round(scorePct * 10) / 10,
      totalTimeSeconds: ar.reduce((s, r) => s + r.timeSpentSeconds, 0), colorCode: getColorCode(scorePct),
      questionBreakdown: ar.map((r, i) => { const q = questionById.get(r.questionId); return { questionId: r.questionId, questionNumber: i + 1, questionText: q?.text ?? "", questionType: q?.type ?? "", studentAnswer: r.studentAnswer, correctAnswer: q?.correctAnswer ?? null, isCorrect: r.isCorrect, timeSpentSeconds: r.timeSpentSeconds, points: q?.points ?? 0 }; }),
    };
  });

  const standardsMap = new Map<string, { standardId: string; standardCode: string; standardDescription: string; questionsCount: number; questionsAnswered: number; questionsCorrect: number }>();
  for (const q of quizQuestions) { for (const s of standardsByQuestion.get(q.id) ?? []) { if (!standardsMap.has(s.id)) standardsMap.set(s.id, { standardId: s.id, standardCode: s.code, standardDescription: s.description, questionsCount: 0, questionsAnswered: 0, questionsCorrect: 0 }); standardsMap.get(s.id)!.questionsCount += 1; } }
  if (attempts.length > 0) { for (const r of responsesByAttempt.get(attempts[0].id) ?? []) { for (const s of standardsByQuestion.get(r.questionId) ?? []) { const e = standardsMap.get(s.id); if (e) { e.questionsAnswered += 1; if (r.isCorrect) e.questionsCorrect += 1; } } } }

  return {
    student: { id: student.id, name: student.name },
    lesson: { id: lesson.id, title: lesson.title, order: lesson.order },
    attemptHistory,
    standardsPerformance: Array.from(standardsMap.values()).map((e) => { const mp = e.questionsAnswered > 0 ? (e.questionsCorrect / e.questionsAnswered) * 100 : 0; return { ...e, masteryPercentage: Math.round(mp * 10) / 10, colorCode: getColorCode(mp) }; }),
  };
}
