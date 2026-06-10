import { eq, and } from "drizzle-orm";
import { codecampModules, codecampLessons, codecampExercises, codecampQuizQuestions, codecampUserProgress } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Retrieves all lessons for a published module with per-lesson user progress.
 */
export async function getLessonsForModule({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const [module] = await db.select().from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId)).limit(1);
  if (!module || module.status !== "published") throw new Error("Module not found");

  const lessons = await db.select().from(codecampLessons)
    .where(eq(codecampLessons.moduleId, input.moduleId)).orderBy(codecampLessons.order);

  const progress = await db.select().from(codecampUserProgress)
    .where(and(eq(codecampUserProgress.userId, user.id), eq(codecampUserProgress.moduleId, input.moduleId)));

  return lessons.map((lesson) => {
    const lp = progress.find((p) => p.lessonId === lesson.id);
    return { id: lesson.id, moduleId: lesson.moduleId, title: lesson.title, description: lesson.description, order: lesson.order, type: lesson.type, userStatus: lp?.status ?? "not_started", userScore: lp?.score ?? null, createdAt: lesson.createdAt, updatedAt: lesson.updatedAt };
  });
}

/**
 * Retrieves a single lesson with its full content, exercises, and quiz questions.
 */
export async function getLessonWithContent({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { lessonId: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const [lesson] = await db.select().from(codecampLessons)
    .where(eq(codecampLessons.id, input.lessonId)).limit(1);
  if (!lesson) throw new Error("Lesson not found");

  const [module] = await db.select().from(codecampModules)
    .where(eq(codecampModules.id, lesson.moduleId)).limit(1);
  if (!module || module.status !== "published") throw new Error("Lesson not found");

  const exercises = await db.select().from(codecampExercises)
    .where(eq(codecampExercises.lessonId, input.lessonId)).orderBy(codecampExercises.order);
  const quizQuestions = await db.select().from(codecampQuizQuestions)
    .where(eq(codecampQuizQuestions.lessonId, input.lessonId)).orderBy(codecampQuizQuestions.order);

  const [progress] = await db.select().from(codecampUserProgress)
    .where(and(eq(codecampUserProgress.userId, user.id), eq(codecampUserProgress.lessonId, input.lessonId))).limit(1);

  const { contentJson, ...lessonRest } = lesson;
  const safeContent = typeof contentJson === "object" && contentJson !== null ? (contentJson as Record<string, unknown>) : {};

  return {
    ...lessonRest,
    moduleSlug: module.slug,
    content: safeContent,
    exercises: exercises.map((e) => ({ ...e, hints: Array.isArray(e.hintsJson) ? (e.hintsJson as string[]) : [] })),
    quizQuestions: quizQuestions.map((q) => ({ id: q.id, question: q.question, options: Array.isArray(q.optionsJson) ? (q.optionsJson as string[]) : [], order: q.order })),
    userStatus: progress?.status ?? "not_started",
    userScore: progress?.score ?? null,
  };
}
