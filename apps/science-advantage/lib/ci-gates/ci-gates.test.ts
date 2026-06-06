/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 0.
 *
 * These tests are NOT unit tests of any application code. They are gate-level
 * regression guards that invoke the same `pnpm --filter science-advantage`
 * scripts that CI runs, and assert each gate exits 0.
 *
 * Phase 0 baseline (verified 2026-06-06, see
 * `measure/tracks/ci_typecheck_alignment_20260603/test-strategy.md` §0):
 *   - `pnpm --filter science-advantage check-types` exits non-zero with
 *     617 tsc errors (TS2339=347, TS2769=225, TS2741=12, TS2345=9, TS2322=7,
 *     TS2305=5, others=12). ~287 of the TS2339 cohort is jest-dom matcher
 *     narrowing suppressed by a multi-version vitest split (see §0).
 *   - `pnpm --filter science-advantage lint` exits non-zero with
 *     4 errors + 6 warnings. 4 are `react-hooks/immutability` in
 *     `components/features/teacher/analytics/student-lesson-detail-analytics.tsx`,
 *     6 are `@typescript-eslint/no-unused-vars` in
 *     `lib/gamification/badges.ts`.
 *   - `Role` from `@reading-advantage/auth` already includes `INTERN`
 *     (widened in `packages/auth/src/roles.ts`); coordination with Track 3
 *     (Argon2id + Auth Flatten) is intact.
 *
 * Both gate tests are expected to fail in the Red phase. The Track 3
 * coordination test is expected to pass and serves as a regression guard
 * for the canonical role source.
 */

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { describe, it, expect } from "vitest";
import { ROLES, type Role } from "@reading-advantage/auth";

/**
 * Runs a pnpm command in the science-advantage package and returns the
 * captured result. We pin a 9-minute per-gate timeout because `tsc --noEmit`
 * on a 4k-line project takes several minutes; lint is usually <30s.
 *
 * Invokes `corepack pnpm` so the test works both in dev (where pnpm is
 * provisioned via corepack) and in CI (where pnpm is on PATH and corepack
 * forwards transparently).
 * @param args Arguments passed to `pnpm`.
 * @returns The captured spawn result.
 */
function runGate(args: readonly string[]): SpawnSyncReturns<string> {
  return spawnSync("corepack", ["pnpm", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 540_000,
  });
}

const GATE_TIMEOUT_MS = 600_000;

describe("Phase 0 ci-gates (ci_typecheck_alignment_20260603)", () => {
  it(
    "check-types exits 0 (science-advantage type-clean)",
    { timeout: GATE_TIMEOUT_MS },
    () => {
      const result = runGate(["--filter", "science-advantage", "check-types"]);
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      // Baseline expectation (Red phase): non-zero exit with 617 errors.
      // Track exit code, stdout, and stderr in the failure message so the
      // gate's failure mode is debuggable from the test report.
      expect(
        result.status,
        `pnpm --filter science-advantage check-types exited with code ${String(
          result.status,
        )}. Output:\n${output}`,
      ).toBe(0);
    },
  );

  it(
    "lint exits 0 (science-advantage lint-clean)",
    { timeout: GATE_TIMEOUT_MS },
    () => {
      const result = runGate(["--filter", "science-advantage", "lint"]);
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      // Baseline expectation (Red phase): non-zero exit with 4 errors
      // and 6 warnings.
      expect(
        result.status,
        `pnpm --filter science-advantage lint exited with code ${String(
          result.status,
        )}. Output:\n${output}`,
      ).toBe(0);
    },
  );

  it(
    "Role type from @reading-advantage/auth includes INTERN (Track 3 coordination baseline)",
    () => {
      // This test guards the canonical role source that Track 3
      // (Argon2id + Auth Flatten) will preserve. If the `Role` union
      // ever narrows to drop INTERN, this test fails at type-check time
      // and we have lost the intern-role widening this track depends on.
      const role: Role = ROLES.INTERN;
      expect(role).toBe("INTERN");
      expect(ROLES.INTERN).toBe("INTERN");
    },
  );
});
