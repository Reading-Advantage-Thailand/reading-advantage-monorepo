/**
 * Phase 2 Red-phase cleanup contract for the auth-security-hardening track.
 *
 * Driven by `measure/tracks/post_24h_audit_remediation_20260612/plan.md`
 * Phase 2 Task 8.
 *
 * The auth-security track left behind a dedicated "stub cleanup" test file
 * whose only purpose was to prove that three Phase 1 stub assertions were
 * superseded by Phase 3 implementations. Those assertions are now skipped
 * in the Phase 1 contract files, and the cleanup file itself has become
 * dead weight.
 *
 * RED expectations (this commit):
 *   - This file still exists → the "cleanup file is deleted" assertion fails.
 *   - `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts`
 *     and `packages/auth/src/__tests__/auth-security-phase1-session-contracts.test.ts`
 *     still contain `it.skip(...)` markers → the "no skipped tests" assertion
 *     fails.
 *
 * GREEN expectations (next role owns the fix):
 *   - Delete this test file.
 *   - Rewrite the skipped Phase 1 stub assertions as positive behavioral
 *     tests OR leave them skipped only if they have no residual value.
 *   - The closeout gate is `rg "it\.skip|describe\.skip|\.todo" packages/api/src/__tests__`
 *     returning empty.
 *
 * Test command (no DB / no network):
 *   pnpm --filter @reading-advantage/api vitest run src/__tests__/auth-security-phase3-stub-cleanup.test.ts
 */

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, "..", "..");
const THIS_FILE_PATH = resolve(__filename);
const TESTS_DIR = join(PACKAGE_ROOT, "src", "__tests__");

function readSource(relPath: string): string {
  return readFileSync(resolve(PACKAGE_ROOT, relPath), "utf-8");
}

function findSkippedTests(dir: string): string[] {
  const findings: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".test.ts")) {
      continue;
    }
    const filePath = join(dir, entry.name);
    const source = readFileSync(filePath, "utf-8");
    const skipPattern = /\b(it|describe|test)\.(skip|todo)\s*\(/;
    if (skipPattern.test(source)) {
      findings.push(filePath);
    }
  }
  return findings;
}

describe("Phase 2 Task 8 — auth-security stub-cleanup cleanup", () => {
  it("the dedicated stub-cleanup test file is deleted", () => {
    expect(
      existsSync(THIS_FILE_PATH),
      "Phase 2 Task 8 requires deleting the throwaway stub-cleanup test " +
        "file once the skipped Phase 1 assertions are resolved. Keeping it " +
        "creates a perpetual cleanup-of-cleanup artifact.",
    ).toBe(false);
  });

  it("no test files under packages/api/src/__tests__ contain skip/todo markers", () => {
    const skipped = findSkippedTests(TESTS_DIR);
    expect(
      skipped,
      "Skipped or todo tests in packages/api/src/__tests__ indicate Phase 1 " +
        "stub assertions that were hidden rather than resolved. Either rewrite " +
        "them as positive behavioral tests or remove them.",
    ).toEqual([]);
  });
});
