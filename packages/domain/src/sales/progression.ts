/** Minimal module fields needed to derive Sales curriculum access. */
export interface SalesLearningModuleRef {
  id: string;
  slug: string;
  order: number;
}

/** Minimal lesson fields needed to derive Sales curriculum access. */
export interface SalesLearningLessonRef {
  id: string;
  moduleId: string;
  order: number;
}

/** Server-owned access state for one Sales module. */
export interface SalesModuleAccess {
  isLocked: boolean;
  prerequisiteModuleSlug: string | null;
}

/** Server-owned access state for one Sales lesson. */
export interface SalesLessonAccess {
  isLocked: boolean;
  prerequisiteLessonId: string | null;
}

/** Complete access projection for a Sales learning path. */
export interface SalesLearningAccess {
  moduleAccessById: Record<string, SalesModuleAccess>;
  lessonAccessById: Record<string, SalesLessonAccess>;
}

/**
 * Derives sequential module and lesson access from approved curriculum rows.
 * @param input Ordered curriculum references and completed lesson identifiers.
 * @returns Server-owned access state keyed by module and lesson identifier.
 */
export function deriveSalesLearningAccess(input: {
  modules: readonly SalesLearningModuleRef[];
  lessons: readonly SalesLearningLessonRef[];
  completedLessonIds: ReadonlySet<string>;
}): SalesLearningAccess {
  const orderedModules = [...input.modules].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );
  const moduleAccessById: Record<string, SalesModuleAccess> = {};
  const lessonAccessById: Record<string, SalesLessonAccess> = {};

  orderedModules.forEach((module, moduleIndex) => {
    const orderedLessons = input.lessons
      .filter((lesson) => lesson.moduleId === module.id)
      .sort(
        (left, right) =>
          left.order - right.order || left.id.localeCompare(right.id),
      );
    const prerequisiteModule = orderedModules[moduleIndex - 1];
    const prerequisiteModuleLessons = prerequisiteModule
      ? input.lessons.filter(
          (lesson) => lesson.moduleId === prerequisiteModule.id,
        )
      : [];
    const prerequisiteAccess = prerequisiteModule
      ? moduleAccessById[prerequisiteModule.id]
      : undefined;
    const prerequisiteIncomplete = prerequisiteModuleLessons.some(
      (lesson) => !input.completedLessonIds.has(lesson.id),
    );
    const isModuleLocked = Boolean(
      prerequisiteModule &&
      (prerequisiteAccess?.isLocked || prerequisiteIncomplete),
    );

    moduleAccessById[module.id] = {
      isLocked: isModuleLocked,
      prerequisiteModuleSlug: isModuleLocked
        ? (prerequisiteModule?.slug ?? null)
        : null,
    };

    orderedLessons.forEach((lesson, lessonIndex) => {
      const earliestIncompleteLesson = orderedLessons
        .slice(0, lessonIndex)
        .find((candidate) => !input.completedLessonIds.has(candidate.id));
      lessonAccessById[lesson.id] = {
        isLocked: isModuleLocked || Boolean(earliestIncompleteLesson),
        prerequisiteLessonId: isModuleLocked
          ? null
          : (earliestIncompleteLesson?.id ?? null),
      };
    });
  });

  return { moduleAccessById, lessonAccessById };
}
