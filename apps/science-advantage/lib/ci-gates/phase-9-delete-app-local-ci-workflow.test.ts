/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 9
 * ("Delete App-Local CI Workflow").
 *
 * Mirrors the Phase 0 / Phase 1 / Phase 3 / Phase 4 / Phase 6 / Phase 7 /
 * Phase 8 files in style: file-system regression guards plus a
 * `find`-style gate that mirrors the strategy's stated end-state
 * condition.
 *
 * Background (per
 * `measure/tracks/ci_typecheck_alignment_20260603/spec.md` FR-9 and
 * `test-strategy.md` §0 / §1 row P9 / §5 P9 notes):
 *
 *   - `apps/science-advantage/.github/workflows/ci.yml` exists today
 *     (verified 2026-06-07; 43 lines, 900 bytes). It drifted from
 *     monorepo reality: it runs `npm ci` against a non-existent
 *     `package-lock.json` (the project uses `pnpm` exclusively) and
 *     references `NEXTAUTH_URL` / `NEXTAUTH_SECRET` env vars that the
 *     migrated `@reading-advantage/auth` adapter no longer reads
 *     (see `measure/audit-reports/science-advantage_20260603/`).
 *   - The monorepo-root `.github/workflows/ci.yml` is the canonical CI
 *     surface for every app (it runs `pnpm build`, `pnpm lint`, and
 *     `pnpm test` on `pull_request` to `main` per commit `6bada44`).
 *     Adding the app-local `science-advantage` workflow was an
 *     oversight — it would have run in *addition* to (not in place of)
 *     the monorepo-root pipeline if GitHub ever picked it up.
 *   - Per `test-strategy.md` §5 P9: the implementer's job is
 *     `git rm apps/science-advantage/.github/workflows/ci.yml`, plus
 *     `rmdir apps/science-advantage/.github/workflows` and
 *     `rmdir apps/science-advantage/.github` *if those directories are
 *     empty*. `apps/science-advantage/.github/` is NOT empty — it
 *     contains `ISSUE_TEMPLATE/` and `pull_request_template.md` — so
 *     only `apps/science-advantage/.github/workflows/` is expected to
 *     disappear.
 *   - The track-level end-state gate in `test-strategy.md` §1 P9 is
 *     `find apps -path '*' '/' '.github/workflows/*.yml'` returns empty. That
 *     monorepo-wide check is out of scope for Phase 9 (which is scoped
 *     to science-advantage); a science-advantage-scoped equivalent is
 *     `find apps/science-advantage -path '*' '/' '.github/workflows/*.yml'`
 *     returns empty. The monorepo-wide check is locked in by Phase 14
 *     (closeout) and by the `apps/advantage-games/.github/workflows/
 *     next-static-site.yml` cleanup tracked separately.
 *
 * The Phase 9 end-state contract is three-part:
 *
 *   (a) **File deleted** — `apps/science-advantage/.github/workflows/
 *       ci.yml` does not exist. A regression that re-introduces the
 *       file (or any other `*.yml` workflow) must surface immediately.
 *   (b) **No leftover workflow files** — `find apps/science-advantage
 *       -path '*' '/' '.github/workflows/*.yml'` returns 0 results. The loose
 *       companion to (a) that catches the case where a future
 *       contributor introduces a *different* workflow file in the same
 *       directory (e.g. `cd.yml`, `release.yml`) without first
 *       confirming with the monorepo maintainer that app-local CI is
 *       the desired pattern.
 *   (c) **`.github/` directory preserved** — `apps/science-advantage/
 *       .github/` still exists (it contains `ISSUE_TEMPLATE/` and
 *       `pull_request_template.md`). A regression that
 *       over-zealously runs `rm -rf .github/` would delete the
 *       issue templates and PR template alongside the workflow file;
 *       this guard makes that failure mode loud.
 *
 * Tests in this file:
 *
 *   1. `apps/science-advantage/.github/workflows/ci.yml does not exist`
 *      — **red-phase assertion** (fails today; the 900-byte file
 *      is present at the path).
 *   2. `find apps/science-advantage -path '*' '/' '.github/workflows/*.yml'
 *      returns 0 results` — **red-phase assertion** (fails today; the
 *      find returns `apps/science-advantage/.github/workflows/ci.yml`).
 *      The loose companion to test 1 that catches the case where a
 *      future contributor introduces a *different* workflow file.
 *   3. `apps/science-advantage/.github/workflows/ directory does not
 *      exist or is empty` — **red-phase assertion** (fails today;
 *      the directory exists and contains `ci.yml`). Mirrors the
 *      `test-strategy.md` §5 P9 rmdir step.
 *   4. `apps/science-advantage/.github/ directory still exists
 *      (preserves ISSUE_TEMPLATE/ and pull_request_template.md)` —
 *      **regression guard** (passes today; locks the install state so
 *      a future over-zealous `rm -rf .github/` cleanup does not
 *      delete the issue / PR templates alongside the workflow file).
 *
 * The test does not spawn any external commands (no `tsc`, no
 * `pnpm turbo run ...`) because Phase 9 is a pure file-system
 * operation. This keeps the targeted command (vitest unit config
 * with this file path as the positional arg) under 1s.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();

/**
 * The app-local CI workflow file deleted by Phase 9. Path is relative
 * to the science-advantage package root (`apps/science-advantage/`).
 * Resolved via `process.cwd()` because `vitest run` is invoked from
 * the package directory (the package.json `test` script is
 * `vitest run` and the workspace's `pnpm --filter science-advantage
 * exec vitest run --config vitest.unit.config.ts ...` also runs from
 * the package root).
 */
const APP_LOCAL_CI_PATH = resolve(
  SCIENCE_ADVANTAGE_ROOT,
  ".github",
  "workflows",
  "ci.yml",
);

/**
 * The `.github/workflows/` directory in the science-advantage app.
 * Per `test-strategy.md` §5 P9, this directory is expected to be
 * removed (`rmdir`) once the workflow file is gone, *if* it is
 * empty. The end-state contract is "does not exist or is empty".
 */
const APP_LOCAL_WORKFLOWS_DIR = resolve(
  SCIENCE_ADVANTAGE_ROOT,
  ".github",
  "workflows",
);

/**
 * The `.github/` directory in the science-advantage app. This
 * directory is NOT expected to be removed (it contains
 * `ISSUE_TEMPLATE/` and `pull_request_template.md`). A regression
 * that runs `rm -rf .github/` would delete the issue / PR templates
 * alongside the workflow file; test 4 catches that.
 */
const APP_LOCAL_GITHUB_DIR = resolve(SCIENCE_ADVANTAGE_ROOT, ".github");

/**
 * Returns the list of files in a directory (one level deep) or
 * `null` if the directory does not exist. Used by test 2 (the
 * `find` gate) and test 3 (the empty-directory gate) to avoid
 * importing `fs/promises` and to keep the assertion synchronous.
 * @param dir Absolute path to the directory to inspect.
 * @returns The directory entries, or `null` if the directory does
 *   not exist.
 */
function listDirSync(dir: string): string[] | null {
  if (!existsSync(dir)) {
    return null;
  }
  const stat = statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(
      `Expected ${dir} to be a directory, but statSync reports it as a ` +
        `${stat.isFile() ? "file" : stat.isSymbolicLink() ? "symlink" : "non-directory"}`,
    );
  }
  return readdirSync(dir);
}

describe(
  "Phase 9 delete app-local CI workflow (ci_typecheck_alignment_20260603)",
  () => {
    describe(
      "red-phase assertions (currently fail; flip green when Phase 9 deletes apps/science-advantage/.github/workflows/ci.yml)",
      () => {
        it("apps/science-advantage/.github/workflows/ci.yml does not exist", () => {
          expect(
            existsSync(APP_LOCAL_CI_PATH),
            `Expected ${APP_LOCAL_CI_PATH} to not exist; per ` +
              `test-strategy.md \u00a71 P9, Phase 9 deletes the file with ` +
              `\`git rm apps/science-advantage/.github/workflows/ci.yml\`. The ` +
              `drifted file is still present at the path. ` +
              `Per test-strategy.md \u00a70, the file drifted from monorepo ` +
              `reality: it runs \`npm ci\` against a non-existent ` +
              `\`package-lock.json\` (the project uses \`pnpm\` exclusively) ` +
              `and references \`NEXTAUTH_URL\` / \`NEXTAUTH_SECRET\` env vars ` +
              `that the migrated @reading-advantage/auth adapter no longer ` +
              `reads. The monorepo-root .github/workflows/ci.yml is the ` +
              `canonical CI surface for every app; the app-local workflow ` +
              `would have run in *addition* to (not in place of) the ` +
              `monorepo-root pipeline if GitHub ever picked it up.`,
          ).toBe(false);
        });

        it("find apps/science-advantage -path '*/.github/workflows/*.yml' returns 0 results", () => {
          // The end-state gate from test-strategy.md §1 P9, scoped to
          // the science-advantage app (the track-level `find apps -path
          // '*/.github/workflows/*.yml'` is out of scope for Phase 9
          // and is locked in by Phase 14 / the
          // `apps/advantage-games/.github/workflows/next-static-site.yml`
          // cleanup tracked separately).
          const entries = listDirSync(APP_LOCAL_WORKFLOWS_DIR);
          const ymlFiles =
            entries?.filter((name) => name.endsWith(".yml")) ?? [];
          expect(
            ymlFiles.length,
            `Expected no \`*.yml\` workflow files under ` +
              `${APP_LOCAL_WORKFLOWS_DIR}; per test-strategy.md \u00a71 P9, ` +
              `the end-state gate is \`find apps -path '*/.github/workflows/*.yml' ` +
              `returns empty\`. Found ${String(ymlFiles.length)}:\n` +
              ymlFiles.map((f) => `  - ${APP_LOCAL_WORKFLOWS_DIR}/${f}`).join("\n") +
              `\nIf this test fails because a *different* workflow file was ` +
              `introduced (e.g. \`cd.yml\`, \`release.yml\`), confirm with the ` +
              `monorepo maintainer that app-local CI is the desired pattern ` +
              `before re-committing — the monorepo-root pipeline at ` +
              `\`/home/daniel-bo/Desktop/reading-advantage-monorepo/.github/workflows/ci.yml\` ` +
              `is the canonical CI surface for every app.`,
          ).toBe(0);
        });

        it("apps/science-advantage/.github/workflows/ directory does not exist or is empty", () => {
          // Mirrors the test-strategy.md §5 P9 rmdir step:
          // `rmdir apps/science-advantage/.github/workflows && rmdir
          //  apps/science-advantage/.github if empty`. The .github/
          // directory is NOT empty (it contains ISSUE_TEMPLATE/ and
          // pull_request_template.md), so only the workflows/
          // directory is expected to disappear. The end-state
          // contract is "does not exist or is empty" — if a future
          // contributor adds a new workflow file here, this test
          // fails.
          const entries = listDirSync(APP_LOCAL_WORKFLOWS_DIR);
          if (entries === null) {
            // Directory does not exist — end state achieved.
            return;
          }
          expect(
            entries.length,
            `Expected ${APP_LOCAL_WORKFLOWS_DIR} to be empty (or absent) ` +
              `after the Phase 9 deletion. Found ${String(entries.length)} ` +
              `entries:\n` +
              entries.map((e) => `  - ${e}`).join("\n") +
              `\nPer test-strategy.md \u00a75 P9, the implementer is expected to ` +
              `\`rmdir apps/science-advantage/.github/workflows\` once the ` +
              `ci.yml file is gone, because the directory would otherwise be ` +
              `empty. The end state is "does not exist or is empty".`,
          ).toBe(0);
        });
      },
    );

    describe(
      "regression guards (currently pass; lock the install state to catch over-zealous cleanups)",
      () => {
        it("apps/science-advantage/.github/ directory still exists (preserves ISSUE_TEMPLATE/ and pull_request_template.md)", () => {
          // The .github/ directory is NOT expected to be removed by
          // Phase 9 — it contains ISSUE_TEMPLATE/ and
          // pull_request_template.md which the contributor workflow
          // depends on. A regression that over-zealously runs
          // `rm -rf .github/` (or `git rm -rf .github/`) would
          // delete the issue / PR templates alongside the workflow
          // file; this guard makes that failure mode loud.
          //
          // Test passes today and serves as a forward-looking
          // regression guard.
          expect(
            existsSync(APP_LOCAL_GITHUB_DIR),
            `Expected ${APP_LOCAL_GITHUB_DIR} to still exist after the ` +
              `Phase 9 deletion. The directory contains ISSUE_TEMPLATE/ and ` +
              `pull_request_template.md which the contributor workflow ` +
              `depends on. A regression that runs \`rm -rf .github/\` ` +
              `(intending to remove only the workflows/ subdirectory) ` +
              `would delete the issue / PR templates alongside the ` +
              `workflow file. Per test-strategy.md \u00a75 P9, only the ` +
              `workflows/ subdirectory is expected to disappear; .github/ ` +
              `itself is preserved.`,
          ).toBe(true);
          const stat = statSync(APP_LOCAL_GITHUB_DIR);
          expect(
            stat.isDirectory(),
            `Expected ${APP_LOCAL_GITHUB_DIR} to be a directory. Found ` +
              `${stat.isFile() ? "file" : stat.isSymbolicLink() ? "symlink" : "non-directory"}.`,
          ).toBe(true);
          // The directory must contain the expected non-workflow
          // entries. A regression that empties the directory
          // (e.g. by deleting ISSUE_TEMPLATE/ alongside the
          // workflow) would not flip this assertion (it only
          // checks existence + isDirectory), but the human reading
          // the test failure on test 4 is expected to also
          // eyeball the directory contents.
          const entries = listDirSync(APP_LOCAL_GITHUB_DIR) ?? [];
          expect(
            entries.length,
            `Expected ${APP_LOCAL_GITHUB_DIR} to still contain the ` +
              `contributor-workflow files (ISSUE_TEMPLATE/, ` +
              `pull_request_template.md). Found ${String(entries.length)} ` +
              `entries:\n` +
              entries.map((e) => `  - ${e}`).join("\n") +
              `\nIf this test fails, the Phase 9 deletion swept in more ` +
              `than the workflows/ subdirectory — restore from git and ` +
              `re-run the deletion with \`git rm apps/science-advantage/ ` +
              `.github/workflows/ci.yml\` + \`rmdir apps/science-advantage/` +
              `.github/workflows\` (the .github/ directory itself must ` +
              `remain).`,
          ).toBeGreaterThan(0);
        });
      },
    );
  },
);
