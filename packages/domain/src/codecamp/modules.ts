import { eq, and, inArray, lt, desc } from "drizzle-orm";
import { codecampModules, codecampLessons, codecampUserProgress, codecampExerciseRepos } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Retrieves a published codecamp module by its slug, including its lessons
 * with per-lesson user progress and overall completion stats.
 */
export async function getModuleBySlug({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { slug: string };
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = db.unscoped("Codecamp curriculum and learner progress are scoped by published module and userId");

  const [module] = await rawDb
    .select().from(codecampModules)
    .where(eq(codecampModules.slug, input.slug)).limit(1);

  if (!module || module.status !== "published") {
    throw new Error("Module not found");
  }

  const lessons = await rawDb.select().from(codecampLessons)
    .where(eq(codecampLessons.moduleId, module.id)).orderBy(codecampLessons.order);

  const progress = await rawDb.select().from(codecampUserProgress)
    .where(and(eq(codecampUserProgress.userId, user.id), eq(codecampUserProgress.moduleId, module.id)));

  const completed = progress.filter((p) => p.status === "completed").length;

  return {
    ...module,
    lessons: lessons.map((lesson) => {
      const lp = progress.find((p) => p.lessonId === lesson.id);
      return { id: lesson.id, moduleId: lesson.moduleId, title: lesson.title, description: lesson.description, order: lesson.order, type: lesson.type, userStatus: lp?.status ?? "not_started", userScore: lp?.score ?? null, createdAt: lesson.createdAt, updatedAt: lesson.updatedAt };
    }),
    lessonCount: lessons.length,
    completedLessons: completed,
    progress: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
  };
}

/**
 * Retrieves all published codecamp modules with per-module progress summary.
 */
export async function getModulesWithProgress({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = db.unscoped("Codecamp dashboard curriculum is global and learner progress is scoped by userId");

  const modules = await rawDb.select().from(codecampModules)
    .where(eq(codecampModules.status, "published")).orderBy(codecampModules.order);

  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0
    ? await rawDb.select().from(codecampLessons).where(inArray(codecampLessons.moduleId, moduleIds)).orderBy(codecampLessons.order)
    : [];

  const progress = await rawDb.select().from(codecampUserProgress)
    .where(eq(codecampUserProgress.userId, user.id));

  return modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;
    return { ...mod, lessonCount: modLessons.length, completedLessons: completed, progress: modLessons.length > 0 ? Math.round((completed / modLessons.length) * 100) : 0 };
  });
}

/**
 * Retrieves all published modules for a given phase (A–D) with progress stats.
 */
export async function getModulesByPhase({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { phase: "A" | "B" | "C" | "D" };
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = db.unscoped("Codecamp phase curriculum is global and learner progress is scoped by userId");

  const validPhases = ["A", "B", "C", "D"];
  if (!validPhases.includes(input.phase)) {
    throw new Error("Invalid phase");
  }

  const modules = await rawDb.select().from(codecampModules)
    .where(and(eq(codecampModules.status, "published"), eq(codecampModules.phase, input.phase)))
    .orderBy(codecampModules.order);

  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0
    ? await rawDb.select().from(codecampLessons).where(inArray(codecampLessons.moduleId, moduleIds)).orderBy(codecampLessons.order)
    : [];

  const progress = await rawDb.select().from(codecampUserProgress)
    .where(eq(codecampUserProgress.userId, user.id));

  return modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;
    return { ...mod, lessonCount: modLessons.length, completedLessons: completed, progress: modLessons.length > 0 ? Math.round((completed / modLessons.length) * 100) : 0 };
  });
}

/**
 * Retrieves a published module with its lessons, user progress, and exercise repos.
 */
export async function getModuleWithExercises({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId: string };
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = db.unscoped("Codecamp module detail is global and learner progress is scoped by userId");

  const [module] = await rawDb.select().from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId)).limit(1);

  if (!module || module.status !== "published") throw new Error("Module not found");

  const repos = await rawDb.select().from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.moduleId, input.moduleId)).orderBy(codecampExerciseRepos.order);
  const lessons = await rawDb.select().from(codecampLessons)
    .where(eq(codecampLessons.moduleId, input.moduleId)).orderBy(codecampLessons.order);
  const progress = await rawDb.select().from(codecampUserProgress)
    .where(and(eq(codecampUserProgress.userId, user.id), eq(codecampUserProgress.moduleId, input.moduleId)));
  const completed = progress.filter((p) => p.status === "completed").length;

  return {
    ...module,
    lessons: lessons.map((lesson) => {
      const lp = progress.find((p) => p.lessonId === lesson.id);
      return { id: lesson.id, moduleId: lesson.moduleId, title: lesson.title, description: lesson.description, order: lesson.order, type: lesson.type, userStatus: lp?.status ?? "not_started", userScore: lp?.score ?? null, createdAt: lesson.createdAt, updatedAt: lesson.updatedAt };
    }),
    lessonCount: lessons.length,
    completedLessons: completed,
    progress: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
    exerciseRepos: repos,
  };
}

/**
 * Checks whether the user has completed all lessons in the immediately preceding module.
 */
export async function checkModulePrerequisite({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId: string };
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = "unscoped" in db ? (db as TenantDB).unscoped("codecamp tables have no schoolId") : db;

  const [targetModule] = await rawDb.select().from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId)).limit(1);

  if (!targetModule) throw new Error("Module not found");
  if (targetModule.order <= 1) return { canStart: true };

  const [prevModule] = await rawDb.select().from(codecampModules)
    .where(and(lt(codecampModules.order, targetModule.order), eq(codecampModules.status, "published")))
    .orderBy(desc(codecampModules.order)).limit(1);

  if (!prevModule) return { canStart: true };

  const prevLessons = await rawDb.select().from(codecampLessons)
    .where(eq(codecampLessons.moduleId, prevModule.id)).orderBy(codecampLessons.order);
  if (prevLessons.length === 0) return { canStart: true };

  const progress = await rawDb.select().from(codecampUserProgress)
    .where(and(eq(codecampUserProgress.userId, user.id), eq(codecampUserProgress.moduleId, prevModule.id), eq(codecampUserProgress.status, "completed")));

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));
  return { canStart: prevLessons.every((lesson) => completedLessonIds.has(lesson.id)) };
}
