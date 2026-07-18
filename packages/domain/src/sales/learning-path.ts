import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  salesLessons,
  salesModules,
  salesProgress,
  salesRoleplayScenarios,
  salesRubrics,
} from "@reading-advantage/db/schema";
import {
  CurriculumNotApprovedError,
  LessonPrerequisiteNotMetError,
  LessonTypeMismatchError,
  ModulePrerequisiteNotMetError,
  RubricNotApprovedError,
  ScenarioNotFoundError,
} from "./errors.js";
import { deriveSalesLearningAccess } from "./progression.js";

// Callers obtain rawDb through salesRawDb(), whose TenantDB branch uses the
// reviewed unscoped escape hatch for these REFERENTIAL Sales tables.

/** Supported learner-facing Sales lesson categories. */
export type SalesLessonType = "theory" | "roleplay" | "quiz";

/** Approved curriculum, learner progress, and derived access state. */
export interface SalesLearningPathReadModel {
  modules: Array<typeof salesModules.$inferSelect>;
  lessons: Array<typeof salesLessons.$inferSelect>;
  progress: Array<typeof salesProgress.$inferSelect>;
  completedLessonIds: Set<string>;
  access: ReturnType<typeof deriveSalesLearningAccess>;
}

/** An approved lesson and its server-derived learner access context. */
export interface AccessibleSalesLesson {
  lesson: typeof salesLessons.$inferSelect;
  module: typeof salesModules.$inferSelect;
  learningPath: SalesLearningPathReadModel;
}

/** An accessible roleplay scenario with its approved rubric and lesson context. */
export interface AccessibleSalesScenario extends AccessibleSalesLesson {
  scenario: typeof salesRoleplayScenarios.$inferSelect;
  rubric: typeof salesRubrics.$inferSelect;
}

/**
 * Loads approved learner curriculum and progress for one Sales learner.
 * @param rawDb Raw database adapter for the REFERENTIAL Sales tables.
 * @param userId Current learner identifier.
 * @returns Approved modules, lessons, progress, and derived access state.
 */
export async function loadSalesLearningPath(
  rawDb: DB,
  userId: string,
): Promise<SalesLearningPathReadModel> {
  const modules = await rawDb
    .select()
    .from(salesModules)
    .orderBy(salesModules.order);
  const moduleIds = modules.map((module) => module.id);
  const lessons =
    moduleIds.length > 0
      ? await rawDb
          .select()
          .from(salesLessons)
          .where(
            and(
              inArray(salesLessons.moduleId, moduleIds),
              eq(salesLessons.reviewStatus, "approved"),
            ),
          )
          .orderBy(salesLessons.order)
      : [];
  const progress = await rawDb
    .select()
    .from(salesProgress)
    .where(eq(salesProgress.userId, userId));
  const completedLessonIds = new Set(
    progress
      .filter((row) => row.status === "completed")
      .map((row) => row.lessonId),
  );
  const access = deriveSalesLearningAccess({
    modules,
    lessons,
    completedLessonIds,
  });

  return { modules, lessons, progress, completedLessonIds, access };
}

/**
 * Requires an approved, sequentially accessible Sales lesson for a learner.
 * @param rawDb Raw database adapter for the REFERENTIAL Sales tables.
 * @param userId Current learner identifier.
 * @param input Lesson identifier and optional required lesson category.
 * @returns The approved lesson, its module, and the shared learning-path model.
 * @throws When the lesson is absent, unapproved, the wrong type, or still locked.
 */
export async function requireAccessibleLesson(
  rawDb: DB,
  userId: string,
  input: { lessonId: string; expectedType?: SalesLessonType },
): Promise<AccessibleSalesLesson> {
  const [lesson] = await rawDb
    .select()
    .from(salesLessons)
    .where(eq(salesLessons.id, input.lessonId))
    .limit(1);
  if (!lesson) {
    throw new Error("Lesson not found");
  }
  if (lesson.reviewStatus !== "approved") {
    throw new CurriculumNotApprovedError(lesson.id);
  }
  if (input.expectedType && lesson.type !== input.expectedType) {
    throw new LessonTypeMismatchError(
      lesson.id,
      input.expectedType,
      lesson.type,
    );
  }

  const learningPath = await loadSalesLearningPath(rawDb, userId);
  const module = learningPath.modules.find(
    (candidate) => candidate.id === lesson.moduleId,
  );
  if (!module) {
    throw new Error("Module not found");
  }
  const moduleAccess = learningPath.access.moduleAccessById[module.id];
  if (moduleAccess?.isLocked && moduleAccess.prerequisiteModuleSlug) {
    throw new ModulePrerequisiteNotMetError(
      module.slug,
      moduleAccess.prerequisiteModuleSlug,
    );
  }
  const lessonAccess = learningPath.access.lessonAccessById[lesson.id];
  if (lessonAccess?.isLocked && lessonAccess.prerequisiteLessonId) {
    throw new LessonPrerequisiteNotMetError(
      lesson.id,
      lessonAccess.prerequisiteLessonId,
    );
  }

  return { lesson, module, learningPath };
}

/**
 * Requires an accessible roleplay scenario and an approved evaluation rubric.
 * @param rawDb Raw database adapter for the REFERENTIAL Sales tables.
 * @param userId Current learner identifier.
 * @param scenarioId Requested scenario identifier.
 * @returns The scenario, approved rubric, and accessible lesson context.
 * @throws When the scenario, lesson access, or rubric approval is invalid.
 */
export async function requireAccessibleScenario(
  rawDb: DB,
  userId: string,
  scenarioId: string,
): Promise<AccessibleSalesScenario> {
  const [scenario] = await rawDb
    .select()
    .from(salesRoleplayScenarios)
    .where(eq(salesRoleplayScenarios.id, scenarioId))
    .limit(1);
  if (!scenario) {
    throw new ScenarioNotFoundError(scenarioId);
  }
  const accessibleLesson = await requireAccessibleLesson(rawDb, userId, {
    lessonId: scenario.lessonId,
    expectedType: "roleplay",
  });
  const [rubric] = await rawDb
    .select()
    .from(salesRubrics)
    .where(eq(salesRubrics.id, scenario.rubricId))
    .limit(1);
  if (!rubric || rubric.reviewStatus !== "approved") {
    throw new RubricNotApprovedError(scenario.rubricId);
  }

  return { ...accessibleLesson, scenario, rubric };
}
