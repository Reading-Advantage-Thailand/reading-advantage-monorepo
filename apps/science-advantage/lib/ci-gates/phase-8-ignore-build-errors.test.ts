/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 8
 * ("Remove `ignoreBuildErrors: true`").
 *
 * The file contains content guards and assertions for the Turbo build log.
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
 *   (b) **End-to-end build gate** — the root `pnpm verify:science`
 *       command requires a successful Science build through Turbo.
 *       These tests inspect the build log that Turbo creates or restores.
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
 *   5. The required Turbo build produced its task log.
 *   6. The task log records a real successful Next.js build.
 *
 * Direct Vitest runs inspect existing evidence only.
 * Use the root `pnpm verify:science` command to enforce the build dependency.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const TURBO_BUILD_LOG = resolve(SCIENCE_ADVANTAGE_ROOT, ".turbo", "turbo-build.log");

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
 * Cached Turbo build output for the assertions below.
 */
let buildOutput = "";

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
      "Turbo build dependency evidence",
      () => {
        beforeAll(() => {
          if (existsSync(TURBO_BUILD_LOG)) buildOutput = readFileSync(TURBO_BUILD_LOG, "utf8");
        });

        it("finds the Turbo build log produced by the required build task", () => {
          expect(
            existsSync(TURBO_BUILD_LOG),
            `Expected ${TURBO_BUILD_LOG}. Turbo must restore this output on a cache hit.`,
          ).toBe(true);
        });

        it("records a real successful Next.js production build", () => {
          expect(
            buildOutput,
            `Expected ${TURBO_BUILD_LOG} to contain the real Next.js build command.`,
          ).toContain("$ next build");
          expect(buildOutput).toContain("Compiled successfully");
        });
      },
    );
  },
);
