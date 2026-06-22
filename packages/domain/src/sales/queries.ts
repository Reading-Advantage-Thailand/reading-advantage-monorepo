import { eq, and, desc, inArray } from "drizzle-orm";
import {
  salesModules,
  salesLessons,
  salesRoleplayScenarios,
  salesRubrics,
  salesQuizQuestions,
  salesRoleplayAttempts,
  salesProgress,
} from "@reading-advantage/db/schema";
import { assertCan } from "@reading-advantage/auth";
import type { SalesDomainContext } from "./contracts.js";
import { salesRawDb } from "./contracts.js";
import { ScenarioNotFoundError, CurriculumNotApprovedError } from "./errors.js";

/**
 * Retrieves all approved sales modules ordered by their curriculum order.
 * @param ctx - The domain context (user must hold sales:read)
 * @returns The ordered list of approved modules
 */
export async function getModules({ db, user, tenant }: SalesDomainContext) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  return rawDb
    .select()
    .from(salesModules)
    .orderBy(salesModules.order);
}

/**
 * Retrieves a single module by slug with its approved lessons.
 * @param ctx - The domain context
 * @param input - The module slug
 * @returns The module with lessons, or throws if not found
 */
export async function getModuleBySlug(
  { db, user, tenant }: SalesDomainContext,
  input: { slug: string },
) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  const [module] = await rawDb
    .select()
    .from(salesModules)
    .where(eq(salesModules.slug, input.slug))
    .limit(1);
  if (!module) throw new Error("Module not found");
  const lessons = await rawDb
    .select()
    .from(salesLessons)
    .where(eq(salesLessons.moduleId, module.id))
    .orderBy(salesLessons.order);
  return { ...module, lessons };
}

/**
 * Retrieves a single lesson by id, including scenarios (roleplay) or quiz
 * questions (quiz). Draft lessons are invisible to reps.
 * @param ctx - The domain context
 * @param input - The lesson id
 * @returns The lesson with its scenarios/quiz, or throws if not found/draft
 */
export async function getLesson(
  { db, user, tenant }: SalesDomainContext,
  input: { lessonId: string },
) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  const [lesson] = await rawDb
    .select()
    .from(salesLessons)
    .where(eq(salesLessons.id, input.lessonId))
    .limit(1);
  if (!lesson) throw new Error("Lesson not found");
  if (lesson.reviewStatus !== "approved") {
    throw new CurriculumNotApprovedError(lesson.id);
  }
  const result: Record<string, unknown> = { ...lesson };
  if (lesson.type === "roleplay") {
    const scenarios = await rawDb
      .select()
      .from(salesRoleplayScenarios)
      .where(eq(salesRoleplayScenarios.lessonId, lesson.id))
      .orderBy(salesRoleplayScenarios.order);
    result.scenarios = scenarios;
  } else if (lesson.type === "quiz") {
    const questions = await rawDb
      .select()
      .from(salesQuizQuestions)
      .where(eq(salesQuizQuestions.lessonId, lesson.id))
      .orderBy(salesQuizQuestions.order);
    result.quizQuestions = questions;
  }
  return result;
}

/**
 * Retrieves a roleplay scenario with its rubric.
 * @param ctx - The domain context
 * @param input - The scenario id
 * @returns The scenario with rubric, or throws if not found
 */
export async function getScenario(
  { db, user, tenant }: SalesDomainContext,
  input: { scenarioId: string },
) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  const [scenario] = await rawDb
    .select()
    .from(salesRoleplayScenarios)
    .where(eq(salesRoleplayScenarios.id, input.scenarioId))
    .limit(1);
  if (!scenario) throw new ScenarioNotFoundError(input.scenarioId);
  const [rubric] = await rawDb
    .select()
    .from(salesRubrics)
    .where(eq(salesRubrics.id, scenario.rubricId))
    .limit(1);
  return { ...scenario, rubric };
}

/**
 * Retrieves all attempts for a scenario by a user, newest first.
 * @param ctx - The domain context
 * @param input - The scenario id
 * @returns The ordered list of attempts
 */
export async function getAttemptsForScenario(
  { db, user, tenant }: SalesDomainContext,
  input: { scenarioId: string },
) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  return rawDb
    .select()
    .from(salesRoleplayAttempts)
    .where(
      and(
        eq(salesRoleplayAttempts.scenarioId, input.scenarioId),
        eq(salesRoleplayAttempts.userId, user.id),
      ),
    )
    .orderBy(desc(salesRoleplayAttempts.createdAt));
}

/**
 * Retrieves the highest-scoring attempt for a scenario by a user.
 * @param ctx - The domain context
 * @param input - The scenario id
 * @returns The best attempt, or null if none
 */
export async function getBestAttemptForScenario(
  { db, user, tenant }: SalesDomainContext,
  input: { scenarioId: string },
) {
  assertCan(user, "sales:read", tenant);
  const attempts = await getAttemptsForScenario({ db, user, tenant }, input);
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) =>
    Number(a.overallScore) > Number(best.overallScore) ? a : best,
  );
}

/**
 * Retrieves per-lesson progress rows for a user.
 * @param ctx - The domain context
 * @returns The user's progress rows
 */
export async function getProgressForUser({ db, user, tenant }: SalesDomainContext) {
  assertCan(user, "sales:progress:read", tenant);
  const rawDb = salesRawDb(db);
  return rawDb
    .select()
    .from(salesProgress)
    .where(eq(salesProgress.userId, user.id));
}

/**
 * Retrieves the rep dashboard: module completion, best roleplay scores, quiz scores.
 * @param ctx - The domain context
 * @returns The dashboard data
 */
export async function getDashboardData({ db, user, tenant }: SalesDomainContext) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  const modules = await rawDb
    .select()
    .from(salesModules)
    .orderBy(salesModules.order);
  const moduleIds = modules.map((m) => m.id);
  const lessons =
    moduleIds.length > 0
      ? await rawDb
          .select()
          .from(salesLessons)
          .where(inArray(salesLessons.moduleId, moduleIds))
          .orderBy(salesLessons.order)
      : [];
  const progress = await rawDb
    .select()
    .from(salesProgress)
    .where(eq(salesProgress.userId, user.id));
  const completedLessonIds = new Set(
    progress.filter((p) => p.status === "completed").map((p) => p.lessonId),
  );
  return modules.map((m) => {
    const moduleLessons = lessons.filter((l) => l.moduleId === m.id);
    const completed = moduleLessons.filter((l) =>
      completedLessonIds.has(l.id),
    ).length;
    return {
      ...m,
      lessonCount: moduleLessons.length,
      completedLessons: completed,
      progress:
        moduleLessons.length > 0
          ? Math.round((completed / moduleLessons.length) * 100)
          : 0,
    };
  });
}

/**
 * Retrieves the cohort overview (admin): aggregate progress across all reps.
 * @param ctx - The domain context (user must hold sales:admin:cohort)
 * @returns The cohort overview rows
 */
export async function getCohortOverview({ db, user, tenant }: SalesDomainContext) {
  assertCan(user, "sales:admin:cohort", tenant);
  const rawDb = salesRawDb(db);
  return rawDb.select().from(salesProgress);
}
