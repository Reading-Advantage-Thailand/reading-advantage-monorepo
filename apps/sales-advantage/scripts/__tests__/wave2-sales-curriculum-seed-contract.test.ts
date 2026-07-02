/**
 * Wave 2 Phase 1 — Sales curriculum seed contract Red test.
 *
 * Track: wave2_confidence_restoration_20260628
 *
 * Sales curriculum seed is intentionally single-tenant/global (no schoolId).
 * The Red target is the seed upsert logic: modules use `onConflictDoNothing`,
 * so re-seeding an existing module returns no row and the script falls back to
 * a literal "fallback-id" moduleId. That creates orphan lessons on any re-run.
 *
 * This test uses deterministic in-memory fixtures to simulate the seed
 * behavior without touching a real database or AI provider.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "..", "..");
const SEED_SCRIPT = join(APP_ROOT, "scripts", "sales-curriculum-seed.ts");

interface SimulatedModule {
  slug: string;
  id: string;
  title: string;
}

interface SimulatedLesson {
  moduleId: string;
  title: string;
  reviewStatus: string;
}

interface CurriculumModuleFixture {
  slug: string;
  title: string;
  lessons: Array<{ title: string }>;
}

/**
 * Mirrors the module upsert logic in sales-curriculum-seed.ts:
 * `db.insert(salesModules).values(...).onConflictDoNothing().returning()`
 * returns a row only when a new module is inserted. When the module already
 * exists, `savedMod` is undefined and the script falls back to "fallback-id".
 */
function simulateSalesSeedRuns(
  existingModules: SimulatedModule[],
  curriculumModules: CurriculumModuleFixture[],
): { modules: SimulatedModule[]; lessons: SimulatedLesson[] } {
  const modules = [...existingModules];
  const lessons: SimulatedLesson[] = [];

  for (const mod of curriculumModules) {
    const alreadyExists = modules.some((m) => m.slug === mod.slug);
    // `onConflictDoNothing().returning()` yields a row only on insert.
    const savedMod = alreadyExists
      ? undefined
      : { slug: mod.slug, id: `new-${mod.slug}`, title: mod.title };
    if (savedMod) {
      modules.push(savedMod);
    }
    const moduleId = savedMod?.id ?? "fallback-id";

    for (const lesson of mod.lessons) {
      lessons.push({
        moduleId,
        title: lesson.title,
        reviewStatus: "draft",
      });
    }
  }

  return { modules, lessons };
}

function findOrphanLessons(
  modules: SimulatedModule[],
  lessons: SimulatedLesson[],
): SimulatedLesson[] {
  const moduleIds = new Set(modules.map((m) => m.id));
  return lessons.filter((l) => !moduleIds.has(l.moduleId));
}

function findDraftVisibleLessons(lessons: SimulatedLesson[]): SimulatedLesson[] {
  return lessons.filter((l) => l.reviewStatus !== "draft");
}

describe("Wave 2 — Sales curriculum seed contract", () => {
  it("does not create orphan lessons when modules already exist", () => {
    const existingModules: SimulatedModule[] = [
      {
        slug: "sales-foundations",
        id: "mod-existing-uuid",
        title: "Sales Foundations",
      },
    ];
    const curriculum: CurriculumModuleFixture[] = [
      {
        slug: "sales-foundations",
        title: "Sales Foundations",
        lessons: [{ title: "Discovery & Listening" }],
      },
    ];

    const { modules, lessons } = simulateSalesSeedRuns(
      existingModules,
      curriculum,
    );
    expect(modules.length).toBeGreaterThan(0);
    expect(lessons.length).toBeGreaterThan(0);

    const orphans = findOrphanLessons(modules, lessons);
    expect(
      orphans.length,
      `Orphan lesson count: ${orphans.length}`,
    ).toBe(0);
  });

  it("seeds every lesson with reviewStatus='draft'", () => {
    const curriculum: CurriculumModuleFixture[] = [
      {
        slug: "sales-foundations",
        title: "Sales Foundations",
        lessons: [{ title: "Discovery & Listening" }],
      },
    ];

    const { lessons } = simulateSalesSeedRuns([], curriculum);
    expect(lessons.length).toBeGreaterThan(0);

    const draftVisible = findDraftVisibleLessons(lessons);
    expect(
      draftVisible.length,
      `Draft-visible lesson count: ${draftVisible.length}`,
    ).toBe(0);
  });

  it("remains single-tenant/global and does not invent schoolId semantics", () => {
    const seedSource = readFileSync(SEED_SCRIPT, "utf8");
    expect(seedSource).not.toMatch(/schoolId/);
  });
});
