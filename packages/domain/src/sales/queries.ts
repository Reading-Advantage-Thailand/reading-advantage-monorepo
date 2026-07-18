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
import { users } from "@reading-advantage/db/schema";
import { assertCan } from "@reading-advantage/auth";
import type { SalesDomainContext } from "./contracts.js";
import { salesRawDb } from "./contracts.js";
import { ModulePrerequisiteNotMetError, SalesAuthError } from "./errors.js";
import {
  loadSalesLearningPath,
  requireAccessibleLesson,
  requireAccessibleScenario,
} from "./learning-path.js";
import {
  adminCurriculumOutputSchema,
  lessonDetailOutputSchema,
  scenarioDetailOutputSchema,
  salesCohortRepOutputSchema,
  salesRepDetailOutputSchema,
} from "./schema.js";

/** Returns a rounded arithmetic mean, or null for an empty collection. */
function averageScore(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Returns the latest valid activity date from the supplied candidates. */
function latestActivity(values: Array<Date | null | undefined>): Date | null {
  return values.reduce<Date | null>(
    (latest, value) => (value && (!latest || value > latest) ? value : latest),
    null,
  );
}

/** Selects only curriculum that a learner can open in the approved path. */
function learnerVisibleCurriculum(
  modules: Array<typeof salesModules.$inferSelect>,
  lessons: Array<typeof salesLessons.$inferSelect>,
  rubrics: Array<typeof salesRubrics.$inferSelect>,
  scenarios: Array<typeof salesRoleplayScenarios.$inferSelect>,
) {
  const visibleLessons = lessons.filter(
    (lesson) => lesson.reviewStatus === "approved",
  );
  const visibleLessonIds = new Set(visibleLessons.map((lesson) => lesson.id));
  const visibleModuleIds = new Set(
    visibleLessons.map((lesson) => lesson.moduleId),
  );
  const approvedRubricIds = new Set(
    rubrics
      .filter((rubric) => rubric.reviewStatus === "approved")
      .map((rubric) => rubric.id),
  );
  const visibleScenarios = scenarios.filter(
    (scenario) =>
      visibleLessonIds.has(scenario.lessonId) &&
      approvedRubricIds.has(scenario.rubricId),
  );
  return {
    modules: modules.filter((module) => visibleModuleIds.has(module.id)),
    lessons: visibleLessons,
    scenarios: visibleScenarios,
  };
}

/** Builds the stable administrator aggregate for one representative. */
function buildRepAggregate(
  rep: { id: string; username: string; name: string | null },
  modules: Array<typeof salesModules.$inferSelect>,
  lessons: Array<typeof salesLessons.$inferSelect>,
  progress: Array<typeof salesProgress.$inferSelect>,
  attempts: Array<typeof salesRoleplayAttempts.$inferSelect>,
) {
  const completedLessonIds = new Set(
    progress
      .filter((row) => row.status === "completed")
      .map((row) => row.lessonId),
  );
  const quizLessonIds = new Set(
    lessons
      .filter((lesson) => lesson.type === "quiz")
      .map((lesson) => lesson.id),
  );
  const modulesCompleted = modules.filter((module) => {
    const moduleLessons = lessons.filter(
      (lesson) => lesson.moduleId === module.id,
    );
    return (
      moduleLessons.length > 0 &&
      moduleLessons.every((lesson) => completedLessonIds.has(lesson.id))
    );
  }).length;
  const roleplayScores = attempts.flatMap((attempt) =>
    attempt.overallScore === null ? [] : [Number(attempt.overallScore)],
  );
  const quizScores = progress.flatMap((row) =>
    quizLessonIds.has(row.lessonId) && row.score !== null
      ? [Number(row.score)]
      : [],
  );
  return salesCohortRepOutputSchema.parse({
    userId: rep.id,
    username: rep.username,
    displayName: rep.name ?? rep.username,
    modulesCompleted,
    totalModules: modules.length,
    avgRoleplayScore: averageScore(roleplayScores),
    avgQuizScore: averageScore(quizScores),
    roleplayAttemptCount: attempts.length,
    lastActive: latestActivity([
      ...progress.map((row) => row.updatedAt),
      ...attempts.map((attempt) => attempt.createdAt),
    ]),
  });
}

/**
 * Retrieves all approved sales modules ordered by their curriculum order.
 * @param ctx - The domain context (user must hold sales:read)
 * @returns The ordered list of approved modules
 */
export async function getModules({ db, user, tenant }: SalesDomainContext) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  return rawDb.select().from(salesModules).orderBy(salesModules.order);
}

/**
 * Retrieves the complete curriculum review model for a Sales administrator.
 * @param ctx The authenticated Sales administrator domain context.
 * @returns All modules, lessons, and rubrics without learner progression filters.
 */
export async function getAdminCurriculum({
  db,
  user,
  tenant,
}: SalesDomainContext) {
  assertCan(user, "sales:curriculum:approve", tenant);
  const rawDb = salesRawDb(db);
  const modules = await rawDb
    .select()
    .from(salesModules)
    .orderBy(salesModules.order);
  const lessons = await rawDb
    .select()
    .from(salesLessons)
    .orderBy(salesLessons.order);
  const rubrics = await rawDb
    .select()
    .from(salesRubrics)
    .orderBy(salesRubrics.createdAt);
  const lessonsByModule = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const moduleLessons = lessonsByModule.get(lesson.moduleId) ?? [];
    moduleLessons.push(lesson);
    lessonsByModule.set(lesson.moduleId, moduleLessons);
  }

  return adminCurriculumOutputSchema.parse({
    modules: modules.map((module) => ({
      ...module,
      lessons: lessonsByModule.get(module.id) ?? [],
    })),
    rubrics,
  });
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
  const learningPath = await loadSalesLearningPath(rawDb, user.id);
  const module = learningPath.modules.find(
    (candidate) => candidate.slug === input.slug,
  );
  if (!module) throw new Error("Module not found");
  const moduleAccess = learningPath.access.moduleAccessById[module.id];
  if (moduleAccess?.isLocked && moduleAccess.prerequisiteModuleSlug) {
    throw new ModulePrerequisiteNotMetError(
      module.slug,
      moduleAccess.prerequisiteModuleSlug,
    );
  }
  const progressByLessonId = new Map(
    learningPath.progress.map((row) => [row.lessonId, row]),
  );
  const lessons = learningPath.lessons
    .filter((lesson) => lesson.moduleId === module.id)
    .map((lesson) => {
      const progress = progressByLessonId.get(lesson.id);
      const lessonAccess = learningPath.access.lessonAccessById[lesson.id];
      return {
        ...lesson,
        completed: progress?.status === "completed",
        bestScore: progress?.score ?? null,
        isLocked: lessonAccess?.isLocked ?? true,
        prerequisiteLessonId: lessonAccess?.prerequisiteLessonId ?? null,
      };
    });
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
  const { lesson, module, learningPath } = await requireAccessibleLesson(
    rawDb,
    user.id,
    input,
  );
  const lessonProgress = learningPath.progress.find(
    (row) => row.lessonId === lesson.id,
  );
  const result: Record<string, unknown> = { ...lesson };
  result.completed = lessonProgress?.status === "completed";
  result.bestScore = lessonProgress?.score ?? null;
  result.moduleSlug = module.slug;
  if (lesson.type === "roleplay") {
    const scenarios = await rawDb
      .select()
      .from(salesRoleplayScenarios)
      .where(eq(salesRoleplayScenarios.lessonId, lesson.id))
      .orderBy(salesRoleplayScenarios.order);
    const rubricIds = [
      ...new Set(scenarios.map((scenario) => scenario.rubricId)),
    ];
    const approvedRubrics =
      rubricIds.length > 0
        ? await rawDb
            .select({ id: salesRubrics.id })
            .from(salesRubrics)
            .where(
              and(
                inArray(salesRubrics.id, rubricIds),
                eq(salesRubrics.reviewStatus, "approved"),
              ),
            )
        : [];
    const approvedRubricIds = new Set(
      approvedRubrics.map((rubric) => rubric.id),
    );
    result.scenarios = scenarios.filter((scenario) =>
      approvedRubricIds.has(scenario.rubricId),
    );
  } else if (lesson.type === "quiz") {
    const questions = await rawDb
      .select({
        id: salesQuizQuestions.id,
        lessonId: salesQuizQuestions.lessonId,
        question: salesQuizQuestions.question,
        optionsJson: salesQuizQuestions.optionsJson,
        order: salesQuizQuestions.order,
      })
      .from(salesQuizQuestions)
      .where(eq(salesQuizQuestions.lessonId, lesson.id))
      .orderBy(salesQuizQuestions.order);
    result.quizQuestions = questions.map((question) => ({
      ...question,
      optionsJson: Array.isArray(question.optionsJson)
        ? question.optionsJson.filter(
            (option): option is string => typeof option === "string",
          )
        : [],
    }));
  }
  return lessonDetailOutputSchema.parse(result);
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
  const { scenario, rubric } = await requireAccessibleScenario(
    rawDb,
    user.id,
    input.scenarioId,
  );
  return scenarioDetailOutputSchema.parse({ ...scenario, rubric });
}

/**
 * Splits a lesson-content blob into paragraph-sized canonical source excerpts
 * for the roleplay evaluator. Paragraphs are split on blank lines; whitespace
 * is trimmed; empty paragraphs are dropped. The result is truncated to the
 * first `maxExcerpts` non-empty chunks.
 * @param lessonContent - The raw lesson content string
 * @param maxExcerpts - Cap on the number of excerpts returned (default 8)
 * @returns An array of canonical source excerpts
 */
export function extractCanonicalSourceExcerpts(
  lessonContent: string,
  maxExcerpts: number = 8,
): string[] {
  if (!lessonContent) return [];
  return lessonContent
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, Math.max(0, maxExcerpts));
}

/**
 * Retrieves the full evaluation context for a roleplay attempt: the scenario,
 * the rubric, and the canonical source excerpts (lesson content split into
 * paragraphs) that the evaluator should ground its feedback in.
 *
 * FR-4 contract: callers must pass these excerpts to the evaluator instead of
 * an empty array. The previous route passed `excerpts: []`, which silently
 * dropped the canonical source material the prompt asks the model to use.
 * @param ctx - The domain context
 * @param input - The scenario id
 * @returns The scenario + rubric + canonical source excerpts
 * @throws {ScenarioNotFoundError} When the scenario is not found
 */
export async function getRoleplayEvaluationContext(
  { db, user, tenant }: SalesDomainContext,
  input: { scenarioId: string },
): Promise<{
  scenario: typeof salesRoleplayScenarios.$inferSelect;
  rubric: typeof salesRubrics.$inferSelect;
  canonicalSourceExcerpts: string[];
}> {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  const { scenario, rubric, lesson } = await requireAccessibleScenario(
    rawDb,
    user.id,
    input.scenarioId,
  );
  const canonicalSourceExcerpts = extractCanonicalSourceExcerpts(
    lesson.content,
  );
  return { scenario, rubric, canonicalSourceExcerpts };
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
  await requireAccessibleScenario(rawDb, user.id, input.scenarioId);
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
export async function getProgressForUser({
  db,
  user,
  tenant,
}: SalesDomainContext) {
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
export async function getDashboardData({
  db,
  user,
  tenant,
}: SalesDomainContext) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  const learningPath = await loadSalesLearningPath(rawDb, user.id);
  return learningPath.modules.map((m) => {
    const moduleLessons = learningPath.lessons.filter(
      (l) => l.moduleId === m.id,
    );
    const completed = moduleLessons.filter((l) =>
      learningPath.completedLessonIds.has(l.id),
    ).length;
    const moduleAccess = learningPath.access.moduleAccessById[m.id];
    return {
      ...m,
      lessonCount: moduleLessons.length,
      completedLessons: completed,
      progress:
        moduleLessons.length > 0
          ? Math.round((completed / moduleLessons.length) * 100)
          : 0,
      isLocked: moduleAccess?.isLocked ?? true,
      prerequisiteModuleSlug: moduleAccess?.prerequisiteModuleSlug ?? null,
    };
  });
}

/**
 * Retrieves the cohort overview (admin): aggregate progress across all reps.
 *
 * Phase 4 cross-tenant scoping: a `SALES_ADMIN` may only see progress for
 * reps in their own school (`tenant.schoolId`). The `users` table is FLAT
 * (auto-scoped by `tenant.schoolId` through TenantDB), so even when the
 * caller invokes this via a Sales-Admin tenant, the set of reps returned
 * is restricted to that tenant.
 *
 * Defensive in-memory: after fetching users, we additionally filter on
 * `user.schoolId === tenant.schoolId` so a misuse that bypasses TenantDB
 * (e.g. test mocks that don't simulate the FLAT auto-scope) still cannot
 * leak cross-tenant rows. The result set is a strict subset of the rows
 * the same query would return in production.
 *
 * When `tenant.schoolId` is null (no tenant context), this returns `[]`
 * — there is no defensible scope to filter against. The TenantDB fails
 * closed on null-tenant FLAT queries, so we short-circuit before
 * reaching the `users` table.
 * @param ctx - The domain context (user must hold sales:admin:cohort;
 *              SALES_ADMIN only)
 * @returns The cohort overview rows scoped to the admin's tenant
 */
export async function getCohortOverview({
  db,
  user,
  tenant,
}: SalesDomainContext) {
  assertCan(user, "sales:admin:cohort", tenant);
  if (!tenant.schoolId) {
    return [];
  }
  // Even though `users` is registered as FLAT (TenantDB auto-scopes), the
  // unfiltered `salesProgress` table is REFERENTIAL and has no schoolId.
  // We need an explicit join via `users.schoolId` to scope admin cohorts.
  const rawDb = salesRawDb(db);
  const repsInTenant = await rawDb
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      schoolId: users.schoolId,
    })
    .from(users)
    .where(
      and(eq(users.role, "SALES_REP"), eq(users.schoolId, tenant.schoolId)),
    );
  // Defensive in-memory scope filter — rejects any row whose author is
  // not in the admin's tenant. In production this is redundant with the
  // FLAT auto-scope on `users`, but it makes the cohort output provably
  // tenant-scoped even when the underlying DB layer is bypassed.
  const allowedRepIds = new Set(
    repsInTenant.filter((r) => r.schoolId === tenant.schoolId).map((r) => r.id),
  );
  const modules = await rawDb
    .select()
    .from(salesModules)
    .orderBy(salesModules.order);
  const lessons = await rawDb
    .select()
    .from(salesLessons)
    .orderBy(salesLessons.order);
  const rubrics = await rawDb.select().from(salesRubrics);
  const scenarios = await rawDb
    .select()
    .from(salesRoleplayScenarios)
    .orderBy(salesRoleplayScenarios.order);
  const visible = learnerVisibleCurriculum(
    modules,
    lessons,
    rubrics,
    scenarios,
  );
  const allProgress =
    allowedRepIds.size > 0
      ? await rawDb
          .select()
          .from(salesProgress)
          .where(inArray(salesProgress.userId, [...allowedRepIds]))
      : [];
  const allAttempts =
    allowedRepIds.size > 0
      ? await rawDb
          .select()
          .from(salesRoleplayAttempts)
          .where(inArray(salesRoleplayAttempts.userId, [...allowedRepIds]))
      : [];
  const visibleLessonIds = new Set(visible.lessons.map((lesson) => lesson.id));
  const visibleScenarioIds = new Set(
    visible.scenarios.map((scenario) => scenario.id),
  );
  return repsInTenant
    .filter((rep) => allowedRepIds.has(rep.id))
    .map((rep) =>
      buildRepAggregate(
        rep,
        visible.modules,
        visible.lessons,
        allProgress.filter(
          (row) => row.userId === rep.id && visibleLessonIds.has(row.lessonId),
        ),
        allAttempts.filter(
          (row) =>
            row.userId === rep.id && visibleScenarioIds.has(row.scenarioId),
        ),
      ),
    );
}

/**
 * Retrieves complete progress, score, retry, and best-attempt detail for one rep.
 * @param ctx Administrator domain context scoped to a verified school tenant.
 * @param input Tenant-owned representative identifier.
 * @returns Typed rep reporting detail including zero-progress module rows.
 */
export async function getSalesRepDetail(
  { db, user, tenant }: SalesDomainContext,
  input: { repId: string },
) {
  assertCan(user, "sales:admin:cohort", tenant);
  if (!tenant.schoolId)
    throw new SalesAuthError("Representative is unavailable");
  const rawDb = salesRawDb(db);
  const [rep] = await rawDb
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        eq(users.id, input.repId),
        eq(users.role, "SALES_REP"),
        eq(users.schoolId, tenant.schoolId),
      ),
    )
    .limit(1);
  if (!rep) throw new SalesAuthError("Representative is unavailable");

  const modules = await rawDb
    .select()
    .from(salesModules)
    .orderBy(salesModules.order);
  const lessons = await rawDb
    .select()
    .from(salesLessons)
    .orderBy(salesLessons.order);
  const rubrics = await rawDb.select().from(salesRubrics);
  const progress = await rawDb
    .select()
    .from(salesProgress)
    .where(eq(salesProgress.userId, rep.id));
  const scenarios = await rawDb
    .select()
    .from(salesRoleplayScenarios)
    .orderBy(salesRoleplayScenarios.order);
  const attempts = await rawDb
    .select()
    .from(salesRoleplayAttempts)
    .where(eq(salesRoleplayAttempts.userId, rep.id))
    .orderBy(desc(salesRoleplayAttempts.createdAt));
  const visible = learnerVisibleCurriculum(
    modules,
    lessons,
    rubrics,
    scenarios,
  );
  const visibleLessonIds = new Set(visible.lessons.map((lesson) => lesson.id));
  const visibleScenarioIds = new Set(
    visible.scenarios.map((scenario) => scenario.id),
  );
  const visibleProgress = progress.filter((row) =>
    visibleLessonIds.has(row.lessonId),
  );
  const visibleAttempts = attempts.filter((attempt) =>
    visibleScenarioIds.has(attempt.scenarioId),
  );
  const summary = buildRepAggregate(
    rep,
    visible.modules,
    visible.lessons,
    visibleProgress,
    visibleAttempts,
  );
  const completedLessonIds = new Set(
    visibleProgress
      .filter((row) => row.status === "completed")
      .map((row) => row.lessonId),
  );

  return salesRepDetailOutputSchema.parse({
    rep: {
      userId: rep.id,
      username: rep.username,
      displayName: rep.name ?? rep.username,
    },
    summary,
    modules: visible.modules.map((module) => {
      const moduleLessons = visible.lessons.filter(
        (lesson) => lesson.moduleId === module.id,
      );
      const quizLessonIds = new Set(
        moduleLessons
          .filter((lesson) => lesson.type === "quiz")
          .map((lesson) => lesson.id),
      );
      const quizScores = visibleProgress.flatMap((row) =>
        quizLessonIds.has(row.lessonId) && row.score !== null
          ? [Number(row.score)]
          : [],
      );
      const lessonsCompleted = moduleLessons.filter((lesson) =>
        completedLessonIds.has(lesson.id),
      ).length;
      return {
        moduleId: module.id,
        slug: module.slug,
        title: module.title,
        lessonsCompleted,
        totalLessons: moduleLessons.length,
        completed:
          moduleLessons.length > 0 && lessonsCompleted === moduleLessons.length,
        avgQuizScore: averageScore(quizScores),
      };
    }),
    scenarios: visible.scenarios.map((scenario) => {
      const scenarioAttempts = visibleAttempts.filter(
        (attempt) => attempt.scenarioId === scenario.id,
      );
      const bestAttempt = scenarioAttempts.reduce<
        typeof salesRoleplayAttempts.$inferSelect | null
      >(
        (best, attempt) =>
          !best ||
          Number(attempt.overallScore ?? -1) > Number(best.overallScore ?? -1)
            ? attempt
            : best,
        null,
      );
      return {
        scenarioId: scenario.id,
        lessonTitle:
          visible.lessons.find((lesson) => lesson.id === scenario.lessonId)
            ?.title ?? "Roleplay",
        personaName: scenario.personaName,
        attemptCount: scenarioAttempts.length,
        retryCount: Math.max(0, scenarioAttempts.length - 1),
        bestAttempt,
        attempts: scenarioAttempts,
      };
    }),
  });
}
