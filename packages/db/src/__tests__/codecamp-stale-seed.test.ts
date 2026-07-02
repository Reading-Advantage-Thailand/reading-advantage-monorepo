import { describe, it, expect } from "vitest";
import { findStaleModuleSlugs } from "../seed/codecamp-seed.js";
import {
  getPhaseACurriculumData,
  getPhaseBCurriculumData,
  getPhaseCCurriculumData,
  getPhaseDCurriculumData,
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
// Wave 2 Phase 1 — duplicate/key drift before any destructive backfill path.
// The codecamp seed script skips existing lesson *types* for existing modules,
// which assumes lesson types are unique within a module. The canonical
// curriculum data contains many modules with multiple theory lessons, so the
// current seed contract is ambiguous and drift-prone.
// -----------------------------------------------------------------------------

describe("Wave 2 — codecamp curriculum duplicate lesson type counts", () => {
  it("has no duplicate lesson types within a module", () => {
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

    const duplicates: Array<{ moduleSlug: string; type: string; count: number }> = [];
    for (const mod of modules) {
      expect(
        mod.lessons.length,
        `Module ${mod.slug} must have at least one lesson`,
      ).toBeGreaterThan(0);
      const typeCounts: Record<string, number> = {};
      for (const lesson of mod.lessons) {
        typeCounts[lesson.type] = (typeCounts[lesson.type] ?? 0) + 1;
      }
      for (const [type, count] of Object.entries(typeCounts)) {
        if (count > 1) {
          duplicates.push({ moduleSlug: mod.slug, type, count });
        }
      }
    }

    const totalDuplicateInstances = duplicates.reduce(
      (sum, d) => sum + d.count,
      0,
    );
    expect(
      duplicates,
      `Duplicate lesson type count: ${totalDuplicateInstances}`,
    ).toEqual([]);
  });
});
