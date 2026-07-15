import { eq } from "drizzle-orm";
import { codecampLessons, codecampQuizQuestions } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { updateUserProgress } from "./progress.js";

export const QUIZ_PASS_THRESHOLD = 70;

/**
 * Grades a set of quiz answers for a lesson and updates progress.
 */
export async function submitQuizAnswers({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { lessonId: string; answers: { questionId: string; answer: string }[] };
}) {
  assertCan(user, "codecamp:submit", tenant);
  const rawDb = db.unscoped("Codecamp quiz questions are global curriculum rows scoped by lessonId");

  const questions = await rawDb.select().from(codecampQuizQuestions)
    .where(eq(codecampQuizQuestions.lessonId, input.lessonId)).orderBy(codecampQuizQuestions.order);
  if (questions.length === 0) throw new Error("No quiz questions found for this lesson");

  let correctCount = 0;
  const details = questions.map((q) => {
    const userAnswer = input.answers.find((a) => a.questionId === q.id)?.answer ?? "";
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;
    return { questionId: q.id, question: q.question, userAnswer, correctAnswer: q.correctAnswer, isCorrect, explanation: q.explanation };
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= QUIZ_PASS_THRESHOLD;

  await updateUserProgress({ db, user, tenant, input: { lessonId: input.lessonId, status: passed ? "completed" : "in_progress", score } });

  return { lessonId: input.lessonId, score, passed, total: questions.length, correctCount, details };
}

/**
 * Marks a theory lesson as completed for the current user.
 */
export async function markTheoryComplete({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { lessonId: string };
}) {
  assertCan(user, "codecamp:submit", tenant);
  const rawDb = db.unscoped("Codecamp theory lessons are global curriculum rows scoped by lessonId");

  const [lesson] = await rawDb.select().from(codecampLessons)
    .where(eq(codecampLessons.id, input.lessonId)).limit(1);
  if (!lesson) throw new Error("Lesson not found");
  if (lesson.type !== "theory") throw new Error("Lesson is not a theory lesson");

  return updateUserProgress({ db, user, tenant, input: { lessonId: input.lessonId, status: "completed" } });
}
