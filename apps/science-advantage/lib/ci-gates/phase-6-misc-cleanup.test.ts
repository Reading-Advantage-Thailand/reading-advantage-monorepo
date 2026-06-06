/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 6
 * ("Misc Cleanup").
 *
 * Mirrors the Phase 1 / Phase 3 / Phase 4 files in style: spawns the same
 * `tsc --noEmit` that CI runs, caches the output once via `beforeAll`, and
 * asserts the post-Phase-6 end state across all 4 files in the cohort.
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-6 and `test-strategy.md` §1 row P6 / §5 P6 notes):
 *
 *   - `components/features/auth/user-menu.tsx:89,54` — TS2322
 *     (`string | null` is not assignable to `string | undefined`). The
 *     `<AvatarImage alt={user.name} />` prop receives `user.name` which
 *     is `string | null` on the session-user shape, but Radix's
 *     `AvatarImage` `alt` is `string | undefined`. Fix: coerce with
 *     `alt={user.name ?? ''}` or `alt={user.name ?? undefined}` (the
 *     existing `src={user.image || undefined}` pattern at line 89 is
 *     the closest precedent — apply the same `|| undefined` shape).
 *   - `components/features/lesson/__tests__/review-block.test.tsx:13,1` —
 *     TS2304 (`Cannot find name 'beforeEach'`). Line 3 imports
 *     `afterEach, describe, expect, it, vi` from `'vitest'` and omits
 *     `beforeEach`. Fix: add `beforeEach` to the named-imports list.
 *   - `lib/gamification/xp.test.ts:124,31` — TS2367 (`This comparison
 *     appears to be unintentional because the types '2' and '1' have no
 *     overlap`). Line 121 declares `const attemptNumber = 2;` which
 *     narrows the literal type to `2`; line 124 then writes
 *     `attemptNumber === 1` which tsc rejects as an impossible
 *     comparison (the test *intends* to verify the `=== 1` branch's
 *     `false` path, but the literal narrowing makes the check
 *     statically known). Fix: widen the type by annotating
 *     `const attemptNumber: number = 2;` (or extract the bonus
 *     calculation into a tested helper so the literal narrowing does
 *     not collapse the branch — the helper approach is the more
 *     architecturally honest fix because the inline calculation today
 *     duplicates production logic and is therefore not actually
 *     exercising the function under test).
 *   - `app/api/students/[studentId]/mastery-profile/route.integration.test.ts`
 *     lines 66, 85, 219, 228, 236 — 5 TS2769 errors (`No overload
 *     matches this call`). The Drizzle `.insert(scienceStandards).values({...})`,
 *     `.insert(scienceLessons).values({...})`, and
 *     `.insert(scienceAttempts).values({...})` calls have argument
 *     shapes that no longer match the schema — likely a stale
 *     `framework: 'THAI'` literal that no longer matches the enum, or a
 *     missing required field after a recent schema widening. Fix:
 *     reconcile the seed-helper `.values({...})` payloads against the
 *     current Drizzle schemas in `packages/db/src/schema/science.ts`.
 *     The 5 errors are tightly coupled — fixing one likely fixes all
 *     five (same root cause).
 *
 * The end-state gate (per `test-strategy.md` §1 P6): `tsc` reports 0
 * errors in each of the 4 named files. The plan's "4 errors" undercount
 * is documented in the §6 plan status note; the actual cohort is 8
 * errors across 4 files. The cohort gate (test 6) and the post-Phase-5
 * baseline gate (test 7) catch the case where one of the 4 files
 * regresses with a new error of a different type.
 *
 * Performance note: `tsc --noEmit` on the science-advantage codebase
 * takes ~30s. To keep the test file under the supervisor role-timeout
 * budget, we run tsc once via `beforeAll` and cache the output, then
 * run all 7 assertions against the cached string. This is the same
 * pattern used in `phase-4-process-env-cast.test.ts`.
 *
 * Tests in this file:
 *
 *   1. `tsc --noEmit completed (sanity check on shared setup)`
 *      — passes as long as tsc exits; guards against silent
 *      "everything looks clean" failures when tsc was killed by a
 *      timeout.
 *   2. `tsc --noEmit reports 0 errors in components/features/auth/user-menu.tsx`
 *      — **red-phase assertion** (fails today, 1 TS2322 error at line 89).
 *   3. `tsc --noEmit reports 0 errors in components/features/lesson/__tests__/review-block.test.tsx`
 *      — **red-phase assertion** (fails today, 1 TS2304 error at line 13).
 *   4. `tsc --noEmit reports 0 errors in lib/gamification/xp.test.ts`
 *      — **red-phase assertion** (fails today, 1 TS2367 error at line 124).
 *   5. `tsc --noEmit reports 0 errors in app/api/students/[studentId]/mastery-profile/route.integration.test.ts`
 *      — **red-phase assertion** (fails today, 5 TS2769 errors at
 *      lines 66, 85, 219, 228, 236).
 *   6. `tsc --noEmit total error count for the Phase 6 cohort is 0`
 *      — **red-phase assertion** (fails today, 8 errors). The loose
 *      companion to tests 2–5 that catches the case where one of the 4
 *      files regresses with a new error of a different type.
 *   7. `tsc --noEmit total error count drops below the post-Phase-5 baseline (273)`
 *      — **red-phase assertion** (fails today, 273 errors baseline).
 *      The end-state total is ≤ 265 (273 - 8). Asserting `< 273` is
 *      the loose gate; asserting `=== 265` would be brittle (other
 *      phases may shift the count before this one runs).
 */

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();

/**
 * The set of files owned by Phase 6. Each gets a per-file zero-error
 * assertion plus participation in the cohort gate (test 6).
 */
const PHASE_6_FILES = [
  "components/features/auth/user-menu.tsx",
  "components/features/lesson/__tests__/review-block.test.tsx",
  "lib/gamification/xp.test.ts",
  "app/api/students/[studentId]/mastery-profile/route.integration.test.ts",
] as const;

/**
 * Post-Phase-5 baseline (verified 2026-06-07): 273 tsc errors. Phase 6
 * alone is expected to drop the 8-error misc cohort (4 files × 1+1+1+5
 * errors). The companion `cohortIsZero` test is the precise gate; this
 * gate is the loose "did Phase 6 do anything?" check.
 */
const POST_PHASE_5_BASELINE = 273;

/**
 * Module-scoped cache for the tsc --noEmit output. Populated once by
 * `beforeAll`; read by all 7 tests. Sharing the tsc invocation across
 * tests is the difference between a ~30s test run and a ~210s test run.
 */
let tscOutput: string;
let tscStatus: number | null;

/**
 * Runs `tsc --noEmit` inside the science-advantage package and returns the
 * captured result. We pin a 4-minute timeout because `tsc --noEmit` on the
 * science-advantage codebase takes ~30s; the margin absorbs a cold start.
 * @returns The captured spawn result.
 */
function runTscNoEmit(): SpawnSyncReturns<string> {
  return spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: SCIENCE_ADVANTAGE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 240_000,
  });
}

/**
 * Filters raw tsc output to lines that report any `error TS<num>` against
 * a specific file. The match is file-anchored on the relative path from
 * the science-advantage root. tsc emits lines in the format
 * `<relativeFile>(<line>,<col>): error TS<num>: <msg>`, so the file path
 * is followed by `(`, not preceded by it.
 * @param output The combined stdout/stderr from `tsc --noEmit`.
 * @param relativeFile The file path relative to the science-advantage
 *   root (e.g. `components/features/auth/user-menu.tsx`).
 * @returns The matching error lines, in the order tsc reported them.
 */
function tscErrorsInFile(output: string, relativeFile: string): string[] {
  const filePrefix = `${relativeFile}(`;
  return output
    .split("\n")
    .filter(
      (line) =>
        /\berror TS\d+:/u.test(line) && line.startsWith(filePrefix),
    );
}

beforeAll(() => {
  const result = runTscNoEmit();
  tscOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  tscStatus = result.status;
}, 300_000);

describe(
  "Phase 6 misc cleanup (ci_typecheck_alignment_20260603)",
  () => {
    it("tsc --noEmit completed (sanity check on shared setup)", () => {
      // If tsc was killed by the spawn timeout (status null) or threw an
      // unexpected exit code, the cohort assertions below would silently
      // pass on an empty tscOutput (the regex would match nothing and the
      // cohort length would be 0). This guard makes that failure mode loud.
      expect(
        tscStatus,
        `Expected tsc --noEmit to exit; got status ${String(tscStatus)}. ` +
          `First 1 KB of output:\n${tscOutput.slice(0, 1024)}`,
      ).not.toBeNull();
    });

    it("tsc --noEmit reports 0 errors in components/features/auth/user-menu.tsx", () => {
      const matches = tscErrorsInFile(
        tscOutput,
        "components/features/auth/user-menu.tsx",
      );
      expect(
        matches.length,
        `Expected zero tsc errors in components/features/auth/user-menu.tsx. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P6 / §5 P6, the fix at line 89 is to ` +
          `coerce \`user.name\` (string | null) to \`string | undefined\` for ` +
          `the AvatarImage \`alt\` prop. The closest precedent is the ` +
          `\`src={user.image || undefined}\` pattern on the same line — apply ` +
          `the same \`|| undefined\` shape: \`alt={user.name || undefined}\`. ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit reports 0 errors in components/features/lesson/__tests__/review-block.test.tsx", () => {
      const matches = tscErrorsInFile(
        tscOutput,
        "components/features/lesson/__tests__/review-block.test.tsx",
      );
      expect(
        matches.length,
        `Expected zero tsc errors in components/features/lesson/__tests__/review-block.test.tsx. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P6 / §5 P6, the fix at line 13 is to add ` +
          `\`beforeEach\` to the vitest named-import list on line 3 ` +
          `(currently \`import { afterEach, describe, expect, it, vi } from 'vitest';\`). ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit reports 0 errors in lib/gamification/xp.test.ts", () => {
      const matches = tscErrorsInFile(
        tscOutput,
        "lib/gamification/xp.test.ts",
      );
      expect(
        matches.length,
        `Expected zero tsc errors in lib/gamification/xp.test.ts. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P6 / §5 P6, the fix at line 124 is to ` +
          `widen the type narrowing on \`attemptNumber\` (line 121 declares ` +
          `\`const attemptNumber = 2;\` which narrows to literal \`2\`, ` +
          `making \`attemptNumber === 1\` on line 124 statically false and ` +
          `triggering TS2367). Options: (a) annotate \`const attemptNumber: number = 2;\` ` +
          `to widen the literal; (b) extract the bonus calculation into a ` +
          `production helper and assert the helper's return value (the more ` +
          `architecturally honest fix, because the inline calculation duplicates ` +
          `production logic and is not actually exercising any function under test). ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit reports 0 errors in app/api/students/[studentId]/mastery-profile/route.integration.test.ts", () => {
      const matches = tscErrorsInFile(
        tscOutput,
        "app/api/students/[studentId]/mastery-profile/route.integration.test.ts",
      );
      expect(
        matches.length,
        `Expected zero tsc errors in app/api/students/[studentId]/mastery-profile/route.integration.test.ts. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P6 / §5 P6, the 5 TS2769 errors at lines ` +
          `66, 85, 219, 228, 236 share a root cause: the seed-helper ` +
          `\`.insert(...).values({...})\` payloads no longer match the current ` +
          `Drizzle schemas in packages/db/src/schema/science.ts (likely a ` +
          `stale \`framework: 'THAI'\` literal that no longer matches the enum, ` +
          `or a missing required field after a recent schema widening). ` +
          `Reconcile each \`.values({...})\` object against the corresponding ` +
          `schema; fixing one likely fixes all five. ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit total error count for the Phase 6 cohort is 0", () => {
      // Cohort gate: any tsc error across the 4 Phase 6 files. The loose
      // companion to tests 2–5 — catches the case where one of the 4
      // files regresses with a new error of a different type (e.g.
      // someone fixes the TS2322 in user-menu.tsx but introduces a
      // TS2741 elsewhere in the same file).
      const cohort = tscOutput
        .split("\n")
        .filter(
          (line) =>
            /\berror TS\d+:/u.test(line) &&
            PHASE_6_FILES.some((f) => line.startsWith(`${f}(`)),
        );
      expect(
        cohort.length,
        `Expected zero tsc errors across the 4 Phase 6 files. ` +
          `Found ${String(cohort.length)}:\n` +
          cohort.map((l) => `  - ${l}`).join("\n") +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit total error count drops below the post-Phase-5 baseline", () => {
      const errorLines = tscOutput
        .split("\n")
        .filter((line) => /\berror TS\d+:/u.test(line));
      expect(
        errorLines.length,
        `Expected tsc --noEmit total error count to drop below the post-Phase-5 ` +
          `baseline of ${String(POST_PHASE_5_BASELINE)} once the Phase 6 misc ` +
          `cohort (8 errors across 4 files) is gone. Found ` +
          `${String(errorLines.length)} errors. First 3:\n` +
          errorLines
            .slice(0, 3)
            .map((l) => `  - ${l}`)
            .join("\n") +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBeLessThan(POST_PHASE_5_BASELINE);
    });
  },
);
