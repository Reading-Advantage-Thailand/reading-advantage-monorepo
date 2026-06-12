/**
 * Phase 2 — Task 7 (Red, FR-9): barrel hygiene — `PORTFOLIO_PROJECTS` must
 * move off the root barrel to the `./seed` subpath.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-9, §AC 10.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §5, §6.
 *
 * On master (2026-06-12) `src/index.ts` re-exports `PORTFOLIO_PROJECTS` from
 * the 236 KB seed module, so every consumer of `@reading-advantage/db` pulls
 * curriculum content into its server bundle. The two test-strategy-listed
 * consumers (`packages/domain/src/codecamp/progress.ts`,
 * `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-4-feature-parity.test.ts`)
 * are the migration targets.
 *
 * Also asserts `src/shutdown.ts` is gone (FR-9 dead-code deletion;
 * build-graph §6 confirmed 0 callers).
 *
 * Targeted Red command:
 *   pnpm vitest run src/__tests__/barrel-hygiene.test.ts
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const SRC_INDEX = join(PACKAGE_ROOT, "src", "index.ts");
const SRC_SHUTDOWN = join(PACKAGE_ROOT, "src", "shutdown.ts");
const SRC_SEED_INDEX = join(PACKAGE_ROOT, "src", "seed", "index.ts");

describe("barrel-hygiene — FR-9 (PORTFOLIO_PROJECTS must move to @reading-advantage/db/seed)", () => {
  it("src/index.ts no longer re-exports PORTFOLIO_PROJECTS (Red — present today)", () => {
    const text = readFileSync(SRC_INDEX, "utf8");
    expect(
      text,
      "src/index.ts must not re-export PORTFOLIO_PROJECTS. Move the export to " +
        "src/seed/index.ts and switch the two consumers to `import { PORTFOLIO_PROJECTS } " +
        'from "@reading-advantage/db/seed"`.'
    ).not.toMatch(/PORTFOLIO_PROJECTS/);
  });

  it("src/index.ts no longer re-exports PortfolioProject (Red — present today)", () => {
    const text = readFileSync(SRC_INDEX, "utf8");
    expect(
      text,
      "src/index.ts must not re-export the PortfolioProject type alongside the seed data."
    ).not.toMatch(/PortfolioProject/);
  });

  it("src/seed/index.ts re-exports PORTFOLIO_PROJECTS for the new subpath (Red — depends on barrel split)", () => {
    expect(
      existsSync(SRC_SEED_INDEX),
      `src/seed/index.ts must exist as the seed subpath entry — got missing: ${SRC_SEED_INDEX}`
    ).toBe(true);
    const text = readFileSync(SRC_SEED_INDEX, "utf8");
    expect(
      text,
      "src/seed/index.ts must re-export PORTFOLIO_PROJECTS."
    ).toMatch(/PORTFOLIO_PROJECTS/);
  });

  it("domain consumer switched to @reading-advantage/db/seed (Red — imports from root today)", () => {
    // The two consumers listed in the spec. Read them directly off disk —
    // importing the package would re-trigger the root-barrel bloat and
    // require the rebuild, which is out of scope for this contract test.
    const consumers = [
      join(
        PACKAGE_ROOT,
        "..",
        "domain",
        "src",
        "codecamp",
        "progress.ts"
      ),
    ];
    for (const consumer of consumers) {
      expect(
        existsSync(consumer),
        `consumer file must exist for the barrel-hygiene check: ${consumer}`
      ).toBe(true);
      const text = readFileSync(consumer, "utf8");
      expect(
        text,
        `${consumer} must import PORTFOLIO_PROJECTS from "@reading-advantage/db/seed", ` +
          `not the root barrel. Offending import line found.`
      ).toMatch(
        /from\s+["']@reading-advantage\/db\/seed["']/i
      );
      expect(
        text,
        `${consumer} must not import PORTFOLIO_PROJECTS from "@reading-advantage/db" (root barrel).`
      ).not.toMatch(
        /from\s+["']@reading-advantage\/db["']\s*;?[^\n]*PORTFOLIO_PROJECTS/i
      );
    }
  });
});

describe("barrel-hygiene — FR-9 (registerShutdownHandler dead code deletion)", () => {
  it("src/shutdown.ts is deleted (Red — file exists today, 0 callers per build-graph)", () => {
    expect(
      existsSync(SRC_SHUTDOWN),
      `src/shutdown.ts must be removed (build-graph §6 confirmed 0 callers; FR-9 deletes ` +
        `it as dead code). Offending file present at: ${SRC_SHUTDOWN}`
    ).toBe(false);
  });

  it("src/index.ts does not re-export registerShutdownHandler (Red — never exported, but guard rail)", () => {
    const text = readFileSync(SRC_INDEX, "utf8");
    expect(
      text,
      "src/index.ts must not reference registerShutdownHandler."
    ).not.toMatch(/registerShutdownHandler/);
  });
});
