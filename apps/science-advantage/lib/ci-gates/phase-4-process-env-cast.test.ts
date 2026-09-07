/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 4
 * ("Type-Cast `process.env` Reads").
 *
 * Mirrors the Phase 1 / Phase 3 files in style: spawns the same `tsc --noEmit`
 * that CI runs and asserts the post-Phase-4 end state.
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-4 and `test-strategy.md` §1 row P4 / §3 cross-phase note):
 *
 *   - `lib/test/resolve-test-database-url.ts:13` defaults the `env` parameter
 *     to `process.env`, but the function's signature is
 *     `{ DATABASE_URL?: string; TEST_DATABASE_URL?: string }`. The
 *     `NodeJS.ProcessEnv` type is structurally a `{ [key: string]: string | undefined }`
 *     index signature with no declared keys, so TypeScript reports TS2559
 *     ("Type 'ProcessEnv' has no properties in common with type ...").
 *   - `vitest.integration.global-setup.ts:18` and
 *     `vitest.integration.setup.ts:14` pass `process.env` directly into
 *     `resolveTestDatabaseUrl(...)` and trigger the same TS2559.
 *   - The spec offers two resolution paths: (a) cast `process.env` to
 *     `NodeJS.ProcessEnv` (the explicit type, with a destructure of
 *     `DATABASE_URL` / `TEST_DATABASE_URL`), or (b) replace the default
 *     with the validated `env` from `lib/env.ts` (Track 7 prerequisite;
 *     verified shipped 2026-06-07). The test strategy documents
 *     `lib/env.ts` as a Track 7 prerequisite and notes an interim cast
 *     is acceptable when Track 7 has not yet landed — today it has, so
 *     the green-phase fix is to import the validated `env`. Either fix
 *     satisfies the gate in this file.
 *
 * The end-state gate (per `test-strategy.md` §1 P4): `tsc` reports 0
 * TS2559 errors in those 3 files.
 *
 * The root `pnpm verify:science` command captures one compiler run.
 * These tests read that log without starting another compiler.
 *
 * Tests in this file:
 *
 *   1. `tsc --noEmit reports 0 TS2559 errors in lib/test/resolve-test-database-url.ts`
 *      — **red-phase assertion** (fails today, 1 error at line 13).
 *   2. `tsc --noEmit reports 0 TS2559 errors in vitest.integration.global-setup.ts`
 *      — **red-phase assertion** (fails today, 1 error at line 18).
 *   3. `tsc --noEmit reports 0 TS2559 errors in vitest.integration.setup.ts`
 *      — **red-phase assertion** (fails today, 1 error at line 14).
 *   4. `tsc --noEmit total TS2559 error count for the process.env cast cohort is 0`
 *      — **red-phase assertion** (fails today, 3 errors). The loose
 *      companion gate that catches the case where the cohort is
 *      unchanged but a fourth site regresses (e.g. someone adds a new
 *      `process.env` default parameter and forgets the cast).
 *   5. `tsc --noEmit total error count drops below the post-Phase-3 baseline (276)`
 *      — **red-phase assertion** (fails today, 276 errors baseline).
 *      The end-state total is 273 (276 - 3). Asserting `< 276` is the
 *      loose gate; asserting `=== 273` would be brittle (other phases
 *      may shift the count before this one runs).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const VERIFY_CHECK_TYPES_LOG = resolve(SCIENCE_ADVANTAGE_ROOT, ".turbo", "verify-check-types.log");

/**
 * The set of files owned by Phase 4. Each gets a per-file TS2559 assertion
 * plus participation in the loose cohort gate (test 4).
 */
const PHASE_4_FILES = [
  "lib/test/resolve-test-database-url.ts",
  "vitest.integration.global-setup.ts",
  "vitest.integration.setup.ts",
] as const;

/**
 * Post-Phase-3 baseline (verified 2026-06-07): 276 tsc errors. Phase 4 alone
 * is expected to drop the TS2559 cohort (3 errors). The companion
 * `ts2559CohortIsZero` test is the precise gate; this gate is the loose
 * "did Phase 4 do anything?" check.
 */
const POST_PHASE_3_BASELINE = 276;

/**
 * Compiler output captured before Vitest starts.
 */
let tscOutput: string;

/**
 * Filters raw tsc output to lines that match a TS2559 "Type 'X' has no
 * properties in common with type 'Y'" error reported in a specific file.
 * The match is file-anchored on the relative path from the science-advantage
 * root. tsc emits lines in the format `<relativeFile>(<line>,<col>): error TS<num>: <msg>`,
 * so the file path is followed by `(`, not preceded by it.
 * @param output The combined stdout/stderr from `tsc --noEmit`.
 * @param relativeFile The file path relative to the science-advantage root
 *   (e.g. `lib/test/resolve-test-database-url.ts`).
 * @returns The matching error lines, in the order tsc reported them.
 */
function ts2559ErrorsInFile(output: string, relativeFile: string): string[] {
  const filePrefix = `${relativeFile}(`;
  return output
    .split("\n")
    .filter(
      (line) =>
        /error TS2559:/u.test(line) && line.startsWith(filePrefix),
    );
}

beforeAll(() => {
  tscOutput = existsSync(VERIFY_CHECK_TYPES_LOG)
    ? readFileSync(VERIFY_CHECK_TYPES_LOG, "utf8")
    : "";
});

describe(
  "Phase 4 process.env cast (ci_typecheck_alignment_20260603)",
  () => {
    it("finds the captured tsc --noEmit log", () => {
      expect(
        existsSync(VERIFY_CHECK_TYPES_LOG),
        `Expected ${VERIFY_CHECK_TYPES_LOG}. Run the root pnpm verify:science command.`,
      ).toBe(true);
    });

    it("tsc --noEmit reports 0 TS2559 errors in lib/test/resolve-test-database-url.ts", () => {
      const matches = ts2559ErrorsInFile(
        tscOutput,
        "lib/test/resolve-test-database-url.ts",
      );
      expect(
        matches.length,
        `Expected zero tsc TS2559 errors in lib/test/resolve-test-database-url.ts. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P4, the fix is either (a) cast the ` +
          `default \`env\` parameter to \`NodeJS.ProcessEnv\` (and destructure ` +
          `\`DATABASE_URL\` / \`TEST_DATABASE_URL\`) or (b) replace the ` +
          `\`process.env\` default with the validated \`env\` from ` +
          `\`lib/env.ts\` (Track 7 prerequisite; verified shipped 2026-06-07). ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit reports 0 TS2559 errors in vitest.integration.global-setup.ts", () => {
      const matches = ts2559ErrorsInFile(
        tscOutput,
        "vitest.integration.global-setup.ts",
      );
      expect(
        matches.length,
        `Expected zero tsc TS2559 errors in vitest.integration.global-setup.ts. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P4, the fix is either (a) cast the ` +
          `\`process.env\` argument at the call site to \`NodeJS.ProcessEnv\` ` +
          `or (b) pass the validated \`env\` from \`lib/env.ts\` (Track 7, shipped). ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit reports 0 TS2559 errors in vitest.integration.setup.ts", () => {
      const matches = ts2559ErrorsInFile(
        tscOutput,
        "vitest.integration.setup.ts",
      );
      expect(
        matches.length,
        `Expected zero tsc TS2559 errors in vitest.integration.setup.ts. ` +
          `Found ${String(matches.length)}:\n` +
          matches.map((l) => `  - ${l}`).join("\n") +
          `\nPer test-strategy.md §1 P4, the fix is either (a) cast the ` +
          `\`process.env\` argument at the call site to \`NodeJS.ProcessEnv\` ` +
          `or (b) assign from the validated \`env\` from \`lib/env.ts\` (Track 7, shipped). ` +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit total TS2559 error count for the process.env cast cohort is 0", () => {
      // Cohort gate: any TS2559 in the 3 files we own. The loose companion
      // to tests 2–4 — catches the case where the cohort is unchanged but
      // a fourth file regresses (e.g. someone adds a new `process.env`
      // default parameter elsewhere and forgets the cast).
      const cohort = tscOutput
        .split("\n")
        .filter(
          (line) =>
            /error TS2559:/u.test(line) &&
            PHASE_4_FILES.some((f) => line.startsWith(`${f}(`)),
        );
      expect(
        cohort.length,
        `Expected zero tsc TS2559 errors across the 3 process.env cast sites. ` +
          `Found ${String(cohort.length)}:\n` +
          cohort.map((l) => `  - ${l}`).join("\n") +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBe(0);
    });

    it("tsc --noEmit total error count drops below the post-Phase-3 baseline", () => {
      const errorLines = tscOutput
        .split("\n")
        .filter((line) => /\berror TS\d+:/u.test(line));
      expect(
        errorLines.length,
        `Expected tsc --noEmit total error count to drop below the post-Phase-3 ` +
          `baseline of ${String(POST_PHASE_3_BASELINE)} once the TS2559 process.env cast ` +
          `cohort (3 errors) is gone. Found ${String(errorLines.length)} errors. ` +
          `First 3:\n` +
          errorLines
            .slice(0, 3)
            .map((l) => `  - ${l}`)
            .join("\n") +
          `\nFull tsc output (truncated to 4 KB):\n${tscOutput.slice(0, 4096)}`,
      ).toBeLessThan(POST_PHASE_3_BASELINE);
    });
  },
);
