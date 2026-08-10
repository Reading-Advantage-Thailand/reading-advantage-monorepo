import type { SalesCurriculumModuleInput } from "./contracts.js";

/** Exact owner-approved Sales module and activity-coordinate inventory. */
export const SALES_PROTECTED_INVENTORY = [
  {
    slug: "foundations-discovery",
    order: 1,
    lessons: [
      { order: 1, quizCount: 0, roleplayCount: 0 },
      { order: 2, quizCount: 0, roleplayCount: 0 },
      { order: 3, quizCount: 0, roleplayCount: 0 },
      { order: 4, quizCount: 0, roleplayCount: 1 },
      { order: 5, quizCount: 3, roleplayCount: 0 },
    ],
  },
  {
    slug: "framing-value",
    order: 2,
    lessons: [
      { order: 1, quizCount: 0, roleplayCount: 0 },
      { order: 2, quizCount: 0, roleplayCount: 0 },
      { order: 3, quizCount: 0, roleplayCount: 0 },
      { order: 4, quizCount: 0, roleplayCount: 1 },
      { order: 5, quizCount: 1, roleplayCount: 0 },
    ],
  },
  {
    slug: "objections",
    order: 3,
    lessons: [
      { order: 1, quizCount: 0, roleplayCount: 0 },
      { order: 2, quizCount: 0, roleplayCount: 0 },
      { order: 3, quizCount: 0, roleplayCount: 1 },
      { order: 4, quizCount: 3, roleplayCount: 0 },
    ],
  },
  {
    slug: "ra-product-applied",
    order: 4,
    lessons: [
      { order: 1, quizCount: 0, roleplayCount: 0 },
      { order: 2, quizCount: 0, roleplayCount: 0 },
      { order: 3, quizCount: 0, roleplayCount: 1 },
      { order: 4, quizCount: 2, roleplayCount: 0 },
    ],
  },
  {
    slug: "ra-objections-demo",
    order: 5,
    lessons: [
      { order: 1, quizCount: 0, roleplayCount: 0 },
      { order: 2, quizCount: 0, roleplayCount: 0 },
      { order: 3, quizCount: 0, roleplayCount: 1 },
      { order: 4, quizCount: 0, roleplayCount: 1 },
      { order: 5, quizCount: 2, roleplayCount: 0 },
    ],
  },
  {
    slug: "pricing-closing",
    order: 6,
    lessons: [
      { order: 1, quizCount: 0, roleplayCount: 0 },
      { order: 2, quizCount: 0, roleplayCount: 0 },
      { order: 3, quizCount: 0, roleplayCount: 2 },
      { order: 4, quizCount: 3, roleplayCount: 0 },
    ],
  },
] as const;

/** Exact approved Sales module order. */
export const SALES_MODULE_SLUGS = SALES_PROTECTED_INVENTORY.map(
  (module) => module.slug,
);

const SALES_APPROVED_SOURCE_LESSON_ORDER: Readonly<
  Record<string, ReadonlyArray<number>>
> = {
  "foundations-discovery": [1, 2, 3, 5, 4],
  "framing-value": [1, 2, 3, 4, 5],
  objections: [1, 2, 4, 3],
  "ra-product-applied": [1, 2, 4, 3],
  "ra-objections-demo": [1, 2, 3, 4, 5],
  "pricing-closing": [1, 2, 3, 4],
};

/** Structural coordinate protected by the owner-approved Sales release. */
export interface SalesProtectedCoordinate {
  /** Stable module slug. */
  moduleSlug: string;
  /** Stable lesson order. */
  lessonOrder: number;
  /** Optional quiz-question or roleplay item order. */
  itemOrder?: number;
  /** Activity kind at this source coordinate. */
  kind: "lesson" | "quiz-question" | "roleplay";
}

/** Returns all approved lesson and assessed-item coordinates in release order.
 * @returns Exact immutable coordinate inventory.
 */
export function salesProtectedCoordinates(): SalesProtectedCoordinate[] {
  return SALES_PROTECTED_INVENTORY.flatMap((module) =>
    module.lessons.flatMap((lesson) => {
      const lessonCoordinate: SalesProtectedCoordinate = {
        moduleSlug: module.slug,
        lessonOrder: lesson.order,
        kind: "lesson",
      };
      const quizzes = Array.from(
        { length: lesson.quizCount },
        (_, index): SalesProtectedCoordinate => ({
          moduleSlug: module.slug,
          lessonOrder: lesson.order,
          itemOrder: index + 1,
          kind: "quiz-question",
        }),
      );
      const roleplays = Array.from(
        { length: lesson.roleplayCount },
        (_, index): SalesProtectedCoordinate => ({
          moduleSlug: module.slug,
          lessonOrder: lesson.order,
          itemOrder: index + 1,
          kind: "roleplay",
        }),
      );
      return [lessonCoordinate, ...quizzes, ...roleplays];
    }),
  );
}

function structuralInventory(
  modules: ReadonlyArray<SalesCurriculumModuleInput>,
): Array<{
  slug: string;
  order: number;
  lessons: Array<{ order: number; quizCount: number; roleplayCount: number }>;
}> {
  return modules.map((module) => ({
    slug: module.slug,
    order: module.order,
    lessons: module.lessons.map((lesson) => ({
      order: lesson.order,
      quizCount: lesson.quizQuestions?.length ?? 0,
      roleplayCount: lesson.scenarios?.length ?? 0,
    })),
  }));
}

function approvedSourceInventory(): ReturnType<typeof structuralInventory> {
  return SALES_PROTECTED_INVENTORY.map((module) => {
    const sourceOrder = SALES_APPROVED_SOURCE_LESSON_ORDER[module.slug];
    if (sourceOrder == null) {
      throw new Error(
        `SALES_COORDINATE_EVIDENCE_MISMATCH missing source order module=${module.slug}`,
      );
    }
    return {
      slug: module.slug,
      order: module.order,
      lessons: sourceOrder.map((lessonOrder) => {
        const lesson = module.lessons.find(
          (candidate) => candidate.order === lessonOrder,
        );
        if (lesson == null) {
          throw new Error(
            `SALES_COORDINATE_EVIDENCE_MISMATCH missing lesson module=${module.slug} lesson=${lessonOrder}`,
          );
        }
        return { ...lesson };
      }),
    };
  });
}

/** Rejects duplicate, reordered, missing, extra, or malformed source coordinates.
 * @param modules Candidate structural Sales curriculum modules.
 * @throws When the candidate differs from the owner-approved coordinate inventory.
 */
export function assertProtectedSalesInventory(
  modules: ReadonlyArray<SalesCurriculumModuleInput>,
): void {
  const moduleKeys = modules.map((module) => module.slug);
  if (new Set(moduleKeys).size !== moduleKeys.length) {
    throw new Error("SALES_DUPLICATE_COORDINATE duplicate module slug");
  }
  for (const module of modules) {
    const lessonOrders = module.lessons.map((lesson) => lesson.order);
    if (new Set(lessonOrders).size !== lessonOrders.length) {
      throw new Error(
        `SALES_DUPLICATE_COORDINATE module=${module.slug} duplicate lesson order`,
      );
    }
  }
  if (
    JSON.stringify(structuralInventory(modules)) !==
    JSON.stringify(approvedSourceInventory())
  ) {
    throw new Error(
      "SALES_COORDINATE_EVIDENCE_MISMATCH expected exact approved module order and activity coordinates",
    );
  }
}

/** Projects exact approved source input into canonical release-coordinate order.
 * @param modules Candidate structural Sales curriculum modules.
 * @returns Modules whose lessons follow immutable release-coordinate order.
 * @throws When input module or lesson order differs from the approved source.
 */
export function salesCurriculumModulesInReleaseOrder(
  modules: ReadonlyArray<SalesCurriculumModuleInput>,
): SalesCurriculumModuleInput[] {
  assertProtectedSalesInventory(modules);
  return SALES_PROTECTED_INVENTORY.map((approvedModule, moduleIndex) => {
    const sourceModule = modules[moduleIndex];
    if (sourceModule == null || sourceModule.slug !== approvedModule.slug) {
      throw new Error(
        `SALES_COORDINATE_EVIDENCE_MISMATCH missing module=${approvedModule.slug}`,
      );
    }
    return {
      ...sourceModule,
      lessons: approvedModule.lessons.map((approvedLesson) => {
        const sourceLesson = sourceModule.lessons.find(
          (lesson) => lesson.order === approvedLesson.order,
        );
        if (sourceLesson == null) {
          throw new Error(
            `SALES_COORDINATE_EVIDENCE_MISMATCH missing lesson module=${approvedModule.slug} lesson=${approvedLesson.order}`,
          );
        }
        return sourceLesson;
      }),
    };
  });
}
