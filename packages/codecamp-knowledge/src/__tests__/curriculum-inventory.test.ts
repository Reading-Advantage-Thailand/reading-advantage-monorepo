import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  collectCurriculumInventory,
  curriculumSourceInventory,
  curriculumSourceProvenance,
  verifyCurriculumSource,
} from "../index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("read-only Codecamp curriculum inventory", () => {
  it("collects stable lesson, question, exercise, repository, and portfolio coordinates", () => {
    const inventory = collectCurriculumInventory({
      modules: [
        {
          slug: "sample",
          order: 1,
          status: "published",
          lessons: [
            { order: 1, type: "theory", questions: [], exercises: [] },
            { order: 2, type: "quiz", questions: [{ order: 1 }], exercises: [{ order: 1 }] },
          ],
        },
      ],
      repositoryModuleSlugs: ["sample"],
      portfolioPhases: ["A"],
    });
    expect(inventory).toMatchObject({
      totals: { publishedModules: 1, lessons: 2, questions: 1, exercises: 1, repositories: 1, portfolios: 1 },
    });
    expect(inventory.activityIds).toEqual([
      "lesson:sample:1",
      "lesson:sample:2",
      "question:sample:2:1",
      "exercise:sample:2:1",
      "repo:sample",
      "portfolio:phase-a",
    ]);
  });

  it("freezes the complete current 19-module source inventory", () => {
    expect(curriculumSourceInventory.totals).toEqual({
      publishedModules: 19,
      lessons: 88,
      questions: 85,
      exercises: 16,
      repositories: 16,
      portfolios: 4,
    });
    expect(curriculumSourceInventory.modules).toHaveLength(19);
    expect(curriculumSourceInventory.modules.map((entry) => entry.slug)).toEqual([
      "dev-environment", "git-github", "html-css", "javascript", "typescript", "vitest",
      "react", "api-fundamentals", "nextjs-basics", "nextjs-advanced", "databases-orms",
      "trpc-server-actions", "authentication", "internationalization", "ai-integration",
      "measure-ai-development", "monorepo-packages", "cloud-docker", "real-world-practice",
    ]);
  });

  it("verifies the exact protected source digest and package snapshot provenance", () => {
    const source = readFileSync(join(packageRoot, "../db/src/seed/codecamp-curriculum-data.ts"));
    const result = verifyCurriculumSource(source, curriculumSourceInventory, curriculumSourceProvenance);
    expect(result).toMatchObject({ valid: true, sourceRevision: curriculumSourceProvenance.sourceRevision });
    expect(result.sourceDigest).toBe(curriculumSourceProvenance.sourceDigest);
    expect(result.snapshotDigest).toBe(curriculumSourceProvenance.snapshotDigest);
  });
});
