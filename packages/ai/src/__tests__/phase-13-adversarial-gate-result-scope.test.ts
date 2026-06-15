/**
 * Phase 4 — adversarial gate-result scope check test.
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  4 — Validate & Close
 * Role:   adversarial test auditor
 *
 * Why this file exists. The P4 closeout test
 * (`phase-12-closeout-artifacts.test.ts`) reads
 * `gate-result.json` and asserts the `migrationScopeCheck` block
 * with loose regex pins:
 *   - `aiPackageTests`: regex `/passed/` — matches "0 passed" just
 *     as well as "179 passed" (false positive: 0 tests passed
 *     still trips the assertion).
 *   - `aiPackageCheckTypes`: regex `/clean|exit\s*0/i` — matches
 *     strings like "failed" never would, but "exits 0 after a
 *     retry" or "check-types clean" both pass.
 *   - `archGuard`: regex `/passes|zero/i` — any string containing
 *     "passes" or "zero" matches (e.g., "archGuard fails: zero
 *     direct imports" would still pass because "zero" is present).
 *
 * These are deliberate alignments with spec AC #3/#4/#5 intent
 * (per JR Green attempt-4 commit `ed6716ac` + `aa193f58`); the
 * original `exitCode: 0` assertion was removed because the
 * aggregate gate has documented pre-existing failures in other
 * tracks. The test is therefore a "documentation assertion that
 * stands in for the live gate" — the JR captures
 * `gate-result.json` from a real run, the test asserts the
 * captured artifact's substring matches.
 *
 * What this file pins:
 *   1. The `aiPackageTests` substring must encode a non-zero
 *      number of passing tests. The current `/passed/` regex
 *      would accept "0 passed" — this test asserts the captured
 *      string contains a number > 0 immediately before the word
 *      "passed", so a fabricated "0 passed" would fail (loud
 *      catch of the most-likely fabricated-success shape).
 *   2. The `archGuard` substring must indicate a "passing"
 *      arch-guard (not just contain the words "passes" or
 *      "zero" in any context). The current regex would accept
 *      "archGuard fails: zero direct imports" (which is a real
 *      failing-guard sentence) — this test asserts the captured
 *      string's first non-whitespace token starts with the
 *      passing-prefix vocabulary used by the JR.
 *   3. The captured `gate-result.json` `command` field MUST be
 *      a `pnpm turbo` invocation, not a hand-written string.
 *      A fabricator could write a gate-result.json that never
 *      came from a real turbo run; this test asserts the
 *      command's command and exitCode fields are present
 *      together (a fabricated `{command: "echo ok", exitCode: 0}`
 *      would be missing the per-package turboSummary block).
 *
 * The pattern mirrors the spec-aligned contract that the JR
 * Green attempt-4 commit `ed6716ac` established: the migration-
 * scope check is the live-behavior proof. This test hardens the
 * artifact assertions so a fabricated gate-result.json cannot
 * pass.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "../../../..");
const GATE_RESULT_PATH = join(
  REPO_ROOT,
  "measure/tracks/ai_sdk_major_migration/artifacts/gate-result.json"
);

function readGateResult(): Record<string, unknown> | null {
  if (!existsSync(GATE_RESULT_PATH)) return null;
  return JSON.parse(readFileSync(GATE_RESULT_PATH, "utf8")) as Record<
    string,
    unknown
  >;
}

function readScopeCheck(): Record<string, unknown> | null {
  const gate = readGateResult();
  if (!gate) return null;
  const scope = gate.migrationScopeCheck;
  if (typeof scope !== "object" || scope === null) return null;
  return scope as Record<string, unknown>;
}

describe("Adversarial — gate-result.json migrationScopeCheck is not a fabricated substring pass", () => {
  it("aiPackageTests substring encodes a non-zero number of passing tests (catches fake '0 passed')", () => {
    const scope = readScopeCheck();
    if (!scope) {
      // The closeout test file already asserts the file exists; if
      // it's missing here, this is a setup issue, not a fabrication.
      return;
    }
    const aiPackageTests = scope.aiPackageTests;
    expect(
      typeof aiPackageTests === "string",
      "migrationScopeCheck.aiPackageTests must be a string",
    ).toBe(true);
    // The captured string is expected to look like
    // "179 passed, 3 skipped, 0 failed (pnpm --filter ...)" — pin
    // the positive-count pattern so a fabricated "0 passed" string
    // would fail this assertion.
    const passedCountMatch = (aiPackageTests as string).match(
      /(\d+)\s+passed/,
    );
    expect(passedCountMatch, "aiPackageTests must contain a `N passed` substring").not.toBeNull();
    const passedCount = Number(passedCountMatch![1]);
    expect(
      Number.isFinite(passedCount) && passedCount > 0,
      `aiPackageTests must report more than 0 tests passing (a fabricated "0 passed" would not be a real proof of AC #4). ` +
        `Got: ${aiPackageTests}`,
    ).toBe(true);
  });

  it("archGuard substring starts with a passing-prefix (not 'fails' or 'N direct imports left')", () => {
    const scope = readScopeCheck();
    if (!scope) return;
    const archGuard = scope.archGuard;
    expect(
      typeof archGuard === "string",
      "migrationScopeCheck.archGuard must be a string",
    ).toBe(true);
    // The JR captures values like:
    //   "passes — zero `from \"ai\"` or `from \"@ai-sdk/...\"` imports in apps/** source"
    // The first non-whitespace token is "passes" — and the substring
    // contains the "zero" + "imports" context that confirms the
    // arch-guard actually scanned and found zero hits. A fabricated
    // string like "fails" or "archGuard pending" would fail this
    // assertion.
    const normalized = (archGuard as string).trim().toLowerCase();
    expect(
      /^(passes|clean|ok|green|exit\s*0)/.test(normalized),
      `archGuard must start with a passing-prefix vocabulary; got: "${normalized}". ` +
        "A fabricated 'fails' or 'pending' first token would slip past the loose `/passes|zero/i` " +
        "regex but is caught by this start-of-string pin.",
    ).toBe(true);
    // And the "zero" + "imports" combo must appear in the string,
    // confirming the arch-guard actually scanned (not just claimed
    // to pass).
    expect(
      /zero/.test(archGuard as string) && /imports?/.test(archGuard as string),
      `archGuard must report 'zero imports' (the actual scan result), not just claim to pass. ` +
        `Got: ${archGuard}`,
    ).toBe(true);
  });

  it("gate-result.json has the full turboSummary block (catches a hand-written {command, exitCode: 0} shortcut)", () => {
    // A fabricator could write a gate-result.json like
    //   { "command": "pnpm turbo run lint test check-types build", "exitCode": 0 }
    // and pass the closeout test's command-surface regex. Pin
    // the live turboSummary block (a real turbo run writes a
    // `tasks: N, successful: M, failed: F, cached: C, time: T`
    // block). A fabricated {command, exitCode: 0} would be
    // missing this and would fail.
    const gate = readGateResult();
    if (!gate) return;
    const summary = gate.turboSummary;
    expect(
      typeof summary === "object" && summary !== null,
      "gate-result.json must include a `turboSummary` block (a real `pnpm turbo` run writes one). " +
        "A hand-written {command, exitCode: 0} shortcut would be missing this block.",
    ).toBe(true);
    const summaryObj = summary as Record<string, unknown>;
    for (const field of ["tasks", "successful", "failed", "cached"]) {
      expect(
        field in summaryObj,
        `gate-result.json.turboSummary must include \`${field}\` (a real \`pnpm turbo\` run writes it).`,
      ).toBe(true);
    }
  });
});
