/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 8
 * ("Remove `ignoreBuildErrors: true`").
 *
 * Mirrors the Phase 0 / Phase 1 / Phase 3 / Phase 4 / Phase 6 / Phase 7
 * files in style: file-content regression guards plus a verification
 * gate that invokes the same build command CI runs.
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-8 and `test-strategy.md` §1 row P8 / §4 architecture guardrails):
 *
 *   - `apps/science-advantage/next.config.ts:25` currently reads
 *     `ignoreBuildErrors: true,` (verified 2026-06-07). The setting was
 *     retained post-Prisma-removal as a workaround for ~370 tsc errors
 *     across 6 root causes. Phases 0–7 of this track resolved those root
 *     causes; the only remaining work is the cosmetic cleanup of the
 *     setting itself plus the 9-line comment block that enumerates the
 *     (now-resolved) error cohorts.
 *   - Per `test-strategy.md` §1 P8: "the diff is 1 character
 *     (`true → false`) plus comment cleanup. Build must pass *before*
 *     the flip is committed (sequence the commits: typecheck-clean
 *     first, then flip, then build)."
 *   - Per `test-strategy.md` §4 architecture guardrails: "No new
 *     `ignoreBuildErrors` anywhere in `apps/**` or `packages/**`. Add
 *     a `doctor` rule (or grep guard in CI) that fails if any
 *     `next.config.{ts,js,mjs}` contains `ignoreBuildErrors: true`
 *     after this track lands."
 *
 * The Phase 8 end-state contract is two-part:
 *
 *   (a) **File content** — `apps/science-advantage/next.config.ts` no
 *       longer contains `ignoreBuildErrors: true` (the value is `false`
 *       or the line is removed entirely), and the 9-line resolved-
 *       error enumeration comment block is collapsed to a one-liner
 *       (or removed). A regression that re-introduces
 *       `ignoreBuildErrors: true` must surface immediately per the §4
 *       guardrail above.
 *   (b) **End-to-end build gate** — `pnpm turbo run build
 *       --filter=science-advantage` exits 0 with the new tsc-clean
 *       code, per `test-strategy.md` §1 P8. With `ignoreBuildErrors:
 *       true` masking the residual tsc errors, the build currently
 *       exits 0; this is a forward-looking smoke test that locks the
 *       build state so the post-flip state does not regress.
 *
 * Tests in this file:
 *
 *   1. `apps/science-advantage/next.config.ts does not contain
 *      'ignoreBuildErrors: true'` — **red-phase assertion** (fails
 *      today; line 25 still reads `ignoreBuildErrors: true,`).
 *   2. `next.config.ts: if 'ignoreBuildErrors' is present, the value
 *      equals 'false' (not 'true')` — **red-phase assertion** (fails
 *      today; the value is `true`).
 *   3. `next.config.ts: the resolved-error enumeration comment block
 *      is removed` — **red-phase assertion** (fails today; the phrase
 *      "tsc blockers are pre-existing and out of scope" is still
 *      present on line 16, anchoring the 9-line bullet list).
 *   4. `next.config.ts: no pre-resolution 'Retained post-Prisma-
 *      removal' annotation` — **red-phase assertion** (fails today;
 *      line 15 still references the prisma_drizzle_science_controllers
 *      track as the rationale for the masking).
 *   5. `pnpm turbo run build --filter=science-advantage completed
 *      (sanity check on shared setup)` — **green-phase guard** (passes
 *      today; the build exits 0 because `ignoreBuildErrors: true`
 *      masks tsc errors. Locks the build state so a future flip of
 *      `ignoreBuildErrors: true → false` cannot silently regress the
 *      build).
 *   6. `pnpm turbo run build --filter=science-advantage exits 0 (end-
 *      to-end gate)` — **green-phase guard** (passes today per §1 P8
 *      build-gate contract; locks the build state).
 *
 * Performance note: `pnpm turbo run build --filter=science-advantage`
 * can take several minutes (Next.js production build). To keep the
 * test file under the supervisor role-timeout budget, we run the build
 * once via `beforeAll` and cache the output, then run all assertions
 * against the cached strings. This is the same pattern used in
 * `phase-7-check-types-script.test.ts` (which runs `tsc --noEmit` via
 * `beforeAll`).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();

/**
 * Unique phrases that identify the resolved-error enumeration comment
 * block in `next.config.ts`. The block lists the tsc error cohorts
 * that have all been resolved by Phases 0–7 (~333 testing-library
 * matcher narrowing, INTERN role widening, missing sibling modules,
 * ProcessEnv narrowing, duplicate next@16 type identities, misc).
 * Once the comment is collapsed to a one-liner (or removed), these
 * phrases no longer appear. Anchored to the 2026-06-07 file state.
 */
const RESOLVED_ERROR_COMMENT_PHRASE =
  "tsc blockers are pre-existing and out of scope";
const PRISMA_REMOVAL_PHRASE = "Retained post-Prisma-removal";
/**
 * Bullet-item phrases that uniquely identify the resolved-cohort
 * enumeration. Any one of these being present means the comment
 * block is still expanded.
 */
const RESOLVED_COHORT_BULLETS = [
  "testing-library matcher narrowing (toBeInTheDocument et al.)",
  "INTERN role widening in lib/auth/session.ts",
  "Missing sibling modules lib/auth/{password,rate-limit}.test.ts",
  "ProcessEnv narrowing in vitest.integration",
  "Duplicate next@16 type identities: RequestInit / CurriculumUnitSummary",
  "Misc: user-menu string|null, beforeEach import, xp.test comparison, mastery-profile overload",
] as const;

/**
 * Module-scoped cache for the `pnpm turbo run build
 * --filter=science-advantage` spawn result. Populated once by the
 * second describe block's `beforeAll`; read by tests 5 and 6. Sharing
 * the expensive build invocation across tests is the difference
 * between a ~3-min test run and a ~15-min test run. Scoping the
 * beforeAll inside the second describe (rather than at the file
 * level) means `vitest run -t "file-content"` skips the build
 * entirely, so the targeted Red-phase command in `package.json`
 * scripts (`pnpm --filter science-advantage exec vitest run --config
 * vitest.unit.config.ts lib/ci-gates/phase-8-ignore-build-errors.test.ts`)
 * runs in <1s when filtered to the file content tests.
 */
let buildOutput: string;
let buildStatus: number | null;

/**
 * Runs `pnpm turbo run build --filter=science-advantage` and returns
 * the captured result. We pin a 9-minute timeout because `next build`
 * on the science-advantage codebase takes 2-4 minutes; the margin
 * absorbs a cold start and slow CI runners.
 *
 * Invokes `corepack pnpm` so the test works both in dev (where pnpm
 * is provisioned via corepack) and in CI (where pnpm is on PATH and
 * corepack forwards transparently).
 * @returns The captured spawn result.
 */
function runBuildGate(): SpawnSyncReturns<string> {
  return spawnSync(
    "corepack",
    ["pnpm", "turbo", "run", "build", "--filter=science-advantage"],
    {
      cwd: SCIENCE_ADVANTAGE_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 540_000,
    },
  );
}

describe(
  "Phase 8 remove ignoreBuildErrors (ci_typecheck_alignment_20260603)",
  () => {
    describe(
      "file-content regression guards (red-phase: fail today; flip green when Phase 8 is implemented)",
      () => {
        it("apps/science-advantage/next.config.ts does not contain `ignoreBuildErrors: true`", () => {
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "next.config.ts",
          );
          expect(
            existsSync(configPath),
            `Expected ${configPath} to exist; the Phase 8.1 task requires this file to be present.`,
          ).toBe(true);
          const content = readFileSync(configPath, "utf8");
          expect(
            /ignoreBuildErrors\s*:\s*true\b/u.test(content),
            `Expected next.config.ts to not contain 'ignoreBuildErrors: true'. ` +
              `Per test-strategy.md \u00a71 P8, the Phase 8 task is to flip ` +
              `\`ignoreBuildErrors: true,\` \u2192 \`ignoreBuildErrors: false,\` ` +
              `(or remove the line). Currently the file still has ` +
              `\`ignoreBuildErrors: true,\` on line 25. Per ` +
              `test-strategy.md \u00a74 architecture guardrails, no new ` +
              `\`ignoreBuildErrors\` may exist anywhere in apps/** or ` +
              `packages/**. File content:\n${content}`,
          ).toBe(false);
        });

        it("next.config.ts: if `ignoreBuildErrors` is present, the value equals `false` (not `true`)", () => {
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "next.config.ts",
          );
          const content = readFileSync(configPath, "utf8");
          const match = content.match(
            /ignoreBuildErrors\s*:\s*(true|false)\b/u,
          );
          if (match) {
            expect(
              match[1],
              `Expected next.config.ts: if 'ignoreBuildErrors' is present, ` +
                `the value should be 'false' (Phase 8 flip). Found ` +
                `'ignoreBuildErrors: ${match[1]}' on the source line. Per ` +
                `test-strategy.md \u00a74 architecture guardrails, ` +
                `'ignoreBuildErrors: true' is a type-safety hole that may not ` +
                `re-appear after this track lands.`,
            ).toBe("false");
          } else {
            expect(
              /ignoreBuildErrors\s*:/u.test(content),
              `Expected next.config.ts: 'ignoreBuildErrors' is absent, which is ` +
                `acceptable (the Phase 8 end state permits removing the line ` +
                `entirely). If a future contributor re-adds the field, this ` +
                `assertion flips to require the value to be 'false'. ` +
                `File content:\n${content}`,
            ).toBe(false);
          }
        });

        it("next.config.ts: the resolved-error enumeration comment block is removed", () => {
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "next.config.ts",
          );
          const content = readFileSync(configPath, "utf8");
          expect(
            content.includes(RESOLVED_ERROR_COMMENT_PHRASE),
            `Expected next.config.ts to not contain the resolved-error ` +
              `enumeration comment block. The phrase ` +
              `${JSON.stringify(RESOLVED_ERROR_COMMENT_PHRASE)} identifies ` +
              `the block that lists the tsc error cohorts resolved by ` +
              `Phases 0\u20137. Per test-strategy.md \u00a71 P8, this comment ` +
              `should be collapsed to a one-liner (or removed). ` +
              `File content:\n${content}`,
          ).toBe(false);
          for (const bullet of RESOLVED_COHORT_BULLETS) {
            expect(
              content.includes(bullet),
              `Expected next.config.ts to not contain the resolved-cohort ` +
                `bullet ${JSON.stringify(bullet)}. Per test-strategy.md ` +
                `\u00a71 P8, the entire enumeration must be collapsed. ` +
                `File content:\n${content}`,
            ).toBe(false);
          }
        });

        it("next.config.ts: no pre-resolution 'Retained post-Prisma-removal' annotation", () => {
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "next.config.ts",
          );
          const content = readFileSync(configPath, "utf8");
          expect(
            content.includes(PRISMA_REMOVAL_PHRASE),
            `Expected next.config.ts to not contain ` +
              `${JSON.stringify(PRISMA_REMOVAL_PHRASE)}. This phrase ` +
              `anchors the resolved-error enumeration block (line 15 of the ` +
              `current file). Once Phase 8 collapses the comment to a ` +
              `one-liner (or removes it), this phrase no longer appears. ` +
              `File content:\n${content}`,
          ).toBe(false);
        });
      },
    );

    describe(
      "end-to-end build gate (green-phase: passes today because `ignoreBuildErrors: true` masks tsc errors; locks the build state)",
      () => {
        beforeAll(() => {
          const result = runBuildGate();
          buildOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
          buildStatus = result.status;
        }, 600_000);

        it("pnpm turbo run build --filter=science-advantage completed (sanity check on shared setup)", () => {
          // If the build was killed by the spawn timeout (status null)
          // or threw an unexpected exit code, the assertion below would
          // silently pass on an empty buildOutput. This guard makes
          // that failure mode loud.
          expect(
            buildStatus,
            `Expected pnpm turbo run build --filter=science-advantage to ` +
              `exit; got status ${String(buildStatus)}. First 1 KB of ` +
              `output:\n${buildOutput.slice(0, 1024)}`,
          ).not.toBeNull();
        });

        it("pnpm turbo run build --filter=science-advantage exits 0 (end-to-end gate)", () => {
          // Per test-strategy.md §1 P8: "Build must pass *before* the
          // flip is committed (sequence the commits: typecheck-clean
          // first, then flip, then build)." Currently passes because
          // `ignoreBuildErrors: true` masks tsc errors during the
          // build. Locks the build state so a future flip of
          // `ignoreBuildErrors: true → false` does not regress the
          // build (the post-flip state will only stay green if Phases
          // 0–7 left tsc clean, which is their contract).
          expect(
            buildStatus,
            `Expected pnpm turbo run build --filter=science-advantage to ` +
              `exit 0 (the Phase 8 end-state gate from test-strategy.md ` +
              `\u00a71 P8). Currently exits with code ${String(buildStatus)}. ` +
              `First 4 KB of output:\n${buildOutput.slice(0, 4096)}`,
          ).toBe(0);
        });
      },
    );
  },
);
