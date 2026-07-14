import { describe, it, expect } from "vitest";
import {
  findStaleModuleSlugs,
  selectLessonsToInsert,
  selectLessonUpdates,
  type ExistingLessonSnapshot,
} from "../seed/codecamp-seed.js";
import {
  getPhaseACurriculumData,
  getPhaseBCurriculumData,
  getPhaseCCurriculumData,
  getPhaseDCurriculumData,
  type CurriculumLesson,
} from "../seed/codecamp-curriculum-data.js";

describe("findStaleModuleSlugs", () => {
  it("identifies a slug in the DB but not in the canonical set as stale", () => {
    const canonical = new Set(["dev-environment", "git-github", "html-css"]);
    const dbSlugs = ["dev-environment", "git-github", "html-css", "old-module"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toEqual(["old-module"]);
  });

  it("does not mark a slug that exists in both DB and canonical set as stale", () => {
    const canonical = new Set(["dev-environment", "git-github"]);
    const dbSlugs = ["dev-environment", "git-github"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toHaveLength(0);
  });

  it("marks all DB slugs as stale when canonical set is empty", () => {
    const canonical = new Set<string>();
    const dbSlugs = ["module-a", "module-b", "module-c"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toEqual(["module-a", "module-b", "module-c"]);
  });

  it("returns nothing stale when DB slugs list is empty", () => {
    const canonical = new Set(["dev-environment", "git-github"]);
    const dbSlugs: string[] = [];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toHaveLength(0);
  });

  it("identifies multiple stale slugs correctly", () => {
    const canonical = new Set(["keep-a", "keep-b"]);
    const dbSlugs = ["keep-a", "stale-x", "keep-b", "stale-y", "stale-z"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toHaveLength(3);
    expect(stale).toContain("stale-x");
    expect(stale).toContain("stale-y");
    expect(stale).toContain("stale-z");
  });

  it("preserves order of stale slugs as they appear in the DB list", () => {
    const canonical = new Set(["b"]);
    const dbSlugs = ["a", "b", "c", "d"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toEqual(["a", "c", "d"]);
  });
});

// -----------------------------------------------------------------------------
// Wave 2 Phase 1 — seed idempotency/key drift.
// The codecamp seed script used to skip existing lesson *types* for existing
// modules, which assumed lesson types are unique within a module. The canonical
// curriculum data intentionally contains many modules with multiple theory
// lessons, so the seed's type-keyed logic silently dropped canonical lessons
// on re-seed. The contract under test is the SEED'S behavior, not the
// curriculum structure: re-seeding an existing module must insert every
// still-missing canonical lesson, not just "one per type". The seed now keys
// on (moduleId, order) via the `selectLessonsToInsert` helper exported from
// `packages/db/src/seed/codecamp-seed.ts`.
// -----------------------------------------------------------------------------

describe("Wave 2 — codecamp seed idempotency for existing modules", () => {
  it("re-seeding updates canonical lesson content by stable order without replacing lesson identity", () => {
    const canonical = getPhaseACurriculumData().modules[0]!.lessons;
    const existing: ExistingLessonSnapshot[] = canonical.map((lesson, index) => ({
      id: `lesson-${index + 1}`,
      type: lesson.type,
      order: lesson.order,
      title: `Old ${lesson.title}`,
    }));

    const updates = selectLessonUpdates(existing, canonical);

    expect(updates).toHaveLength(canonical.length);
    expect(updates[0]).toMatchObject({ existingId: "lesson-1", canonical: canonical[0] });
  });

  it("re-seeding an existing module inserts every canonical lesson, not one-per-type", () => {
    const phases = [
      getPhaseACurriculumData(),
      getPhaseBCurriculumData(),
      getPhaseCCurriculumData(),
      getPhaseDCurriculumData(),
    ];
    const modules = phases.flatMap((phase) => phase.modules);
    expect(
      modules.length,
      "Fixture module count must be > 0",
    ).toBeGreaterThan(0);

    const modulesWithDuplicates = modules.filter((mod) => {
      const typeSet = new Set(mod.lessons.map((l) => l.type));
      return typeSet.size < mod.lessons.length;
    });
    expect(
      modulesWithDuplicates.length,
      "At least one module must have multiple lessons of the same type for this test to be meaningful",
    ).toBeGreaterThan(0);

    // Simulate a re-seed where only the first lesson of each type is already
    // present in the DB. The seed's previous type-keyed logic would skip every
    // remaining same-type sibling, even though those canonical lessons are
    // missing from the DB and should be inserted. The production helper now
    // keys on `order`, so each canonical lesson not already present by order
    // is selected for insertion.
    let wronglySkippedLessonCount = 0;
    const wronglySkippedByModule: Array<{
      moduleSlug: string;
      type: CurriculumLesson["type"];
      count: number;
    }> = [];

    for (const mod of modules) {
      expect(
        mod.lessons.length,
        `Module ${mod.slug} must have at least one lesson`,
      ).toBeGreaterThan(0);

      const firstByType = new Map<CurriculumLesson["type"], CurriculumLesson>();
      for (const lesson of mod.lessons) {
        if (!firstByType.has(lesson.type)) {
          firstByType.set(lesson.type, lesson);
        }
      }

      const existingLessons: ExistingLessonSnapshot[] = Array.from(
        firstByType.values(),
      ).map((lesson) => ({
        type: lesson.type,
        order: lesson.order,
        title: lesson.title,
      }));

      const lessonsToInsert = selectLessonsToInsert(
        existingLessons,
        mod.lessons,
      );

      // A canonical lesson is wrongly skipped when it is not selected for
      // insertion and it is not one of the already-present first-per-type
      // lessons.
      const existingOrders = new Set(existingLessons.map((l) => l.order));
      const skipped = mod.lessons.filter(
        (lesson) =>
          !lessonsToInsert.includes(lesson) && !existingOrders.has(lesson.order),
      );

      if (skipped.length > 0) {
        const typeCounts = new Map<CurriculumLesson["type"], number>();
        for (const lesson of skipped) {
          typeCounts.set(lesson.type, (typeCounts.get(lesson.type) ?? 0) + 1);
        }
        for (const [type, count] of typeCounts) {
          wronglySkippedByModule.push({ moduleSlug: mod.slug, type, count });
          wronglySkippedLessonCount += count;
        }
      }
    }

    expect(
      wronglySkippedLessonCount,
      `Wrongly-skipped canonical lesson count: ${wronglySkippedLessonCount}`,
    ).toBe(0);
  });
});
