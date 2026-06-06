/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 3
 * ("Add `lib/auth/{password,rate-limit}.test.ts` Siblings").
 *
 * Mirrors the Phase 0 / Phase 1 files in style: spawns the same `tsc --noEmit`
 * that CI runs and asserts the post-Phase-3 end state.
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-3 and `test-strategy.md` §1 row P3 / §3 cross-phase note):
 *
 *   - `apps/science-advantage/lib/auth/password.test.ts` does not yet exist.
 *     It is owned by Track 3 (Argon2id + Auth Flatten).
 *   - `apps/science-advantage/lib/auth/rate-limit.test.ts` already exists
 *     and currently imports from `./rate-limit`, but `lib/auth/rate-limit.ts`
 *     does not exist. The shared package has its own
 *     `packages/auth/src/rate-limit.ts`, but the app-local test imports
 *     the missing app-local sibling.
 *   - The spec offers two resolution paths: (a) create empty test files with
 *     `describe.skip(...)` placeholders, or (b) update `tsconfig.json` to
 *     exclude the (missing) test files. The test strategy recommends (b) —
 *     tsconfig exclude — because Track 3 and Track 10 are in flight and will
 *     replace these files soon; an empty stub creates merge friction.
 *
 * The end-state gate (per `test-strategy.md` §1 P3): `tsc` no longer reports
 * `Cannot find module './password'`. The companion end-state gate for
 * `./rate-limit` is added here because that is the *actual* error tsc reports
 * today.
 *
 * Tests in this file:
 *
 *   1. `tsc --noEmit reports 0 TS2307 errors for './rate-limit'`
 *      — **red-phase assertion** (fails today, 1 error in
 *      `lib/auth/rate-limit.test.ts:4`).
 *   2. `tsc --noEmit reports 0 TS2307 errors for './password'`
 *      — **regression guard** (passes today; locks the future state so
 *      Track 3 cannot silently regress by importing from a still-missing
 *      `./password` module).
 *   3. `tsc --noEmit total TS2307 error count for the lib/auth/* cohort is 0`
 *      — **red-phase assertion** (fails today, 1 error). Companion to tests
 *      1 + 2 that catches the case where the missing-module cohort is
 *      unchanged but other module errors shift.
 */

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();

/**
 * Runs `tsc --noEmit` inside the science-advantage package and returns the
 * captured result. We pin a 9-minute timeout because `tsc --noEmit` on the
 * science-advantage codebase takes several minutes.
 * @returns The captured spawn result.
 */
function runTscNoEmit(): SpawnSyncReturns<string> {
  return spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: SCIENCE_ADVANTAGE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 540_000,
  });
}

const TSC_TIMEOUT_MS = 600_000;

describe(
  "Phase 3 lib/auth/{password,rate-limit}.test.ts siblings (ci_typecheck_alignment_20260603)",
  () => {
    it(
      "tsc --noEmit reports 0 TS2307 errors for './rate-limit' (lib/auth/rate-limit.test.ts must resolve)",
      { timeout: TSC_TIMEOUT_MS },
      () => {
        const result = runTscNoEmit();
        const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        // Match TS2307 "Cannot find module './rate-limit'" lines only.
        // The match is path-anchored on the module specifier so we don't
        // accidentally swallow `lib/auth/rate-limit.test.ts` (the importer)
        // or `packages/auth/src/rate-limit` (a different module that is
        // correctly resolvable).
        const rateLimitMissing = output
          .split("\n")
          .filter(
            (line) =>
              /error TS2307:/u.test(line) &&
              /['"]\.\/rate-limit['"]/u.test(line),
          );
        expect(
          rateLimitMissing.length,
          `Expected zero tsc TS2307 errors for the missing module './rate-limit'. ` +
            `Found ${String(rateLimitMissing.length)}: \n` +
            rateLimitMissing.map((l) => `  - ${l}`).join("\n") +
            `\nPer test-strategy.md §1 P3, the recommended fix is option (b): ` +
            `add 'lib/auth/rate-limit.test.ts' to tsconfig.json 'exclude' ` +
            `(Track 10 will own the real rate-limit module). ` +
            `Alternatively, create lib/auth/rate-limit.ts with a ` +
            `'LoginRateLimiter' export, or change the test's import to ` +
            `point at the shared '@reading-advantage/auth' module. ` +
            `\nFull tsc output (truncated to 4 KB):\n${output.slice(0, 4096)}`,
        ).toBe(0);
      },
    );

    it(
      "tsc --noEmit reports 0 TS2307 errors for './password' (lib/auth/password.test.ts must resolve)",
      { timeout: TSC_TIMEOUT_MS },
      () => {
        const result = runTscNoEmit();
        const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        // The './password' module is owned by Track 3 (Argon2id). Today
        // `lib/auth/password.test.ts` does not exist, so the import does
        // not even reach tsc — this test passes today and acts as a
        // regression guard so a future Track-3 merge that imports a
        // still-missing './password' module surfaces immediately.
        const passwordMissing = output
          .split("\n")
          .filter(
            (line) =>
              /error TS2307:/u.test(line) &&
              /['"]\.\/password['"]/u.test(line),
          );
        expect(
          passwordMissing.length,
          `Expected zero tsc TS2307 errors for the missing module './password'. ` +
            `Found ${String(passwordMissing.length)}: \n` +
            passwordMissing.map((l) => `  - ${l}`).join("\n") +
            `\nIf Track 3 (Argon2id) has not yet shipped lib/auth/password.ts, ` +
            `the recommended interim fix is option (b) tsconfig exclude per ` +
            `test-strategy.md §1 P3 — add 'lib/auth/password.test.ts' to ` +
            `tsconfig.json 'exclude' until the real module lands. ` +
            `\nFull tsc output (truncated to 4 KB):\n${output.slice(0, 4096)}`,
        ).toBe(0);
      },
    );

    it(
      "tsc --noEmit reports 0 TS2307 errors for the lib/auth/* missing-module cohort",
      { timeout: TSC_TIMEOUT_MS },
      () => {
        const result = runTscNoEmit();
        const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        // Cohort gate: any TS2307 inside the lib/auth/* import graph.
        // This is the loose companion to tests 1 + 2 — catches the case
        // where the cohort is unchanged but the specific module names
        // shift (e.g. someone renames './rate-limit' to
        // '../rate-limit/rate-limit' before Track 10 lands).
        const cohort = output
          .split("\n")
          .filter(
            (line) =>
              /error TS2307:/u.test(line) &&
              /lib\/auth\//u.test(line) &&
              /['"]\.\//u.test(line),
          );
        expect(
          cohort.length,
          `Expected zero tsc TS2307 errors for missing relative modules in ` +
            `the lib/auth/* import graph. Found ${String(cohort.length)}: \n` +
            cohort.map((l) => `  - ${l}`).join("\n") +
            `\nFull tsc output (truncated to 4 KB):\n${output.slice(0, 4096)}`,
        ).toBe(0);
      },
    );
  },
);
