/**
 * Phase 3 Red-phase tests for the auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 3 cleanup — three Phase 1 contract tests are now stale because
 * the Phase 1 stubs they assert have been replaced by Phase 3
 * implementations. Per the test-strategy §1 rule ("Stubs must throw
 * 'not implemented' so Phase 2 reds are unambiguous"), these tests
 * were correct in Phase 1 but are no longer correct in Phase 3.
 *
 * The three stale assertions are:
 *
 *   1. `packages/auth/src/__tests__/auth-security-phase1-session-contracts.test.ts`
 *      Task 5: "the stub throws Error('not implemented') when called"
 *      → `revokeAllUserSessions` is now fully implemented (Phase 3
 *        Task 23) and must NOT throw `not implemented`.
 *
 *   2. `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts`
 *      Task 6: "the stub handleResetPassword responds with 501 Not Implemented"
 *      → `handleResetPassword` is now fully implemented (Phase 3
 *        Task 24) and must NOT respond 501.
 *
 *   3. `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts`
 *      Task 33: "the stub enrichAuthUser rejects with Error('not implemented')"
 *      → `enrichAuthUser` is now fully implemented (Phase 3 Task 39)
 *        and must NOT reject with `not implemented`.
 *
 * Each assertion below scans the source of the corresponding test file
 * and requires that the stale `not implemented` / `501` string no
 * longer appears in a *current* (non-skipped) test body. Acceptable
 * resolutions are: (a) the test is removed, (b) the test is wrapped in
 * `it.skip` / `describe.skip` with a "superseded by Phase 3" reason,
 * or (c) the test is rewritten to assert post-Phase-3 behavior.
 *
 * These are static-source-analysis tests — no DB, no network, no
 * spawned processes. They will run in the existing vitest run used for
 * the auth-security Phase 3 verification gate.
 *
 * RED expectations (this commit):
 *   - All three assertions FAIL because the stale `not implemented` /
 *     `501` strings are still in unskipped test bodies.
 *
 * GREEN expectations (next role owns the fix):
 *   - The stale tests are either removed, skipped with a Phase-3
 *     supersession reason, or rewritten to assert the post-Phase-3
 *     behavior.
 *
 * The fix is owned by the next role (JR or phase_acceptance) because
 * the Phase 1 contract tests live in the same `auth-security-phase1-*`
 * files that were authored in earlier commits of this track; rewriting
 * or skipping them in a Red-phase commit would silently weaken the
 * Phase 1 contract audit record. A separate commit is the safer move.
 *
 * Test command (no DB / no network):
 *   pnpm --filter @reading-advantage/api test -- \
 *     src/__tests__/auth-security-phase3-stub-cleanup.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");

type StaleAssertion = {
  readonly id: string;
  readonly file: string;
  readonly label: string;
  readonly staleNeedle: string;
  readonly supersededReason: string;
};

const STALE_ASSERTIONS: readonly StaleAssertion[] = [
  {
    id: "task-5-revokeAllUserSessions-stub",
    file: "packages/auth/src/__tests__/auth-security-phase1-session-contracts.test.ts",
    label: "Task 5 — revokeAllUserSessions stub throws 'not implemented'",
    staleNeedle: "rejects.toThrow(/not implemented/)",
    supersededReason:
      "Phase 3 Task 23 implemented revokeAllUserSessions; the Phase 1 " +
      "stub assertion no longer reflects production behavior.",
  },
  {
    id: "task-6-handleResetPassword-501-stub",
    file: "packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts",
    label: "Task 6 — handleResetPassword stub returns 501 Not Implemented",
    staleNeedle: "toBe(501)",
    supersededReason:
      "Phase 3 Task 24 implemented handleResetPassword; the Phase 1 " +
      "501 stub assertion no longer reflects production behavior.",
  },
  {
    id: "task-33-enrichAuthUser-stub",
    file: "packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts",
    label: "Task 33 — enrichAuthUser stub rejects with 'not implemented'",
    staleNeedle: 'rejects.toThrow(/not implemented/)',
    supersededReason:
      "Phase 3 Task 39 implemented enrichAuthUser; the Phase 1 stub " +
      "assertion no longer reflects production behavior.",
  },
];

function readSource(relPath: string): string {
  return readFileSync(resolve(REPO_ROOT, relPath), "utf-8");
}

/**
 * Strip vitest skip markers (`it.skip`, `describe.skip`, `.todo`) and
 * their bodies from a test file source so the stale-needle scan only
 * matches against currently-active test bodies. The scan is line-based
 * to keep it cheap and deterministic — skip markers are always at the
 * start of a `it(` / `describe(` expression on their own line.
 */
function stripSkippedBodies(source: string): string {
  const lines = source.split("\n");
  const skipPatterns: readonly RegExp[] = [
    /\b(it|describe|test)\.skip\s*\(/,
    /\b(it|describe|test)\.todo\s*\(/,
    /\bskip\s*:\s*true\b/,
  ];
  const kept: string[] = [];
  let skipping = false;
  let braceDepth = 0;
  for (const line of lines) {
    if (!skipping) {
      const matched = skipPatterns.some((re) => re.test(line));
      if (matched) {
        skipping = true;
        braceDepth = 0;
        for (const ch of line) {
          if (ch === "{") braceDepth += 1;
          else if (ch === "}") braceDepth -= 1;
        }
        if (braceDepth <= 0) {
          skipping = false;
        }
        continue;
      }
      kept.push(line);
    } else {
      for (const ch of line) {
        if (ch === "{") braceDepth += 1;
        else if (ch === "}") braceDepth -= 1;
      }
      if (braceDepth <= 0) {
        skipping = false;
      }
    }
  }
  return kept.join("\n");
}

describe("Phase 3 cleanup — Phase 1 stub assertions are superseded", () => {
  for (const assertion of STALE_ASSERTIONS) {
    it(`${assertion.label} — stale assertion is no longer in an unskipped test body`, () => {
      const raw = readSource(assertion.file);
      const active = stripSkippedBodies(raw);
      const stale = active.includes(assertion.staleNeedle);
      expect(
        stale,
        `${assertion.id}: the Phase 1 stub assertion is still present in ` +
          `${assertion.file} and would still fail against the Phase 3 ` +
          `implementation. Resolution: remove, skip with a "superseded ` +
          `by Phase 3" reason, or rewrite to assert post-Phase-3 behavior. ` +
          `Reason: ${assertion.supersededReason}`,
      ).toBe(false);
    });
  }
});
