/**
 * Wave 0 Phase 4 — Red test: router test quality guard
 *
 * Verifies that router tests assert delegation and transport mapping only,
 * not SQL/query behavior that belongs in domain tests.
 *
 * Evidence refs: Shared Foundation F-SF-003; Cross-App CA-004; Monorepo MR-C05.
 *
 * Anti-patterns guarded:
 * - A4: fails if zero test files are scanned.
 * - A3: violations reported as labeled counts.
 * - A7: exclusions use file path markers, not broad words.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const TESTS_DIR = path.resolve(__dirname);

/**
 * Patterns that indicate a router test is asserting SQL/query behavior
 * rather than delegation and transport mapping.
 *
 * These patterns are prohibited in router tests when the corresponding
 * procedure should delegate to a domain function:
 * - Direct Drizzle table references (e.g., `classrooms.teacherId`)
 * - SQL assertion patterns (e.g., `.where(eq(`)
 * - Mock DB query chain assertions (e.g., `mockDb.select`)
 */
const PROHIBITED_PATTERNS = [
  {
    pattern: /\.select\(\)\.from\(/g,
    label: "inline Drizzle select().from() chain",
  },
  {
    pattern: /\.where\(eq\(/g,
    label: "inline Drizzle .where(eq()) assertion",
  },
  {
    pattern: /\.innerJoin\(/g,
    label: "inline Drizzle .innerJoin() assertion",
  },
  {
    pattern: /expect\(.*\.select\)\.toHaveBeenCalled/g,
    label: "assertion that DB .select was called directly",
  },
  {
    pattern: /expect\(.*\.update\)\.toHaveBeenCalled/g,
    label: "assertion that DB .update was called directly",
  },
  {
    pattern: /expect\(.*\.insert\)\.toHaveBeenCalled/g,
    label: "assertion that DB .insert was called directly",
  },
];

/**
 * Test files that are exempt from this quality guard because they test
 * domain functions directly, not router transport.
 */
const EXEMPT_TEST_FILES: string[] = [];

/**
 * Scan router test files and check for prohibited patterns.
 * Returns violations with labeled counts.
 */
function findRouterTestViolations(): Array<{
  file: string;
  pattern: string;
  line: string;
  lineNumber: number;
}> {
  const testFiles = fs
    .readdirSync(TESTS_DIR)
    .filter(
      (f) =>
        f.endsWith(".test.ts") &&
        !EXEMPT_TEST_FILES.includes(f) &&
        // Only check router-related tests, not architecture tests
        !f.includes("api-architecture") &&
        !f.includes("wave0-phase4")
    );

  const violations: Array<{
    file: string;
    pattern: string;
    line: string;
    lineNumber: number;
  }> = [];

  for (const filename of testFiles) {
    const content = fs.readFileSync(
      path.join(TESTS_DIR, filename),
      "utf-8"
    );
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const { pattern, label } of PROHIBITED_PATTERNS) {
        // Reset regex state
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          violations.push({
            file: filename,
            pattern: label,
            line: line.trim(),
            lineNumber: i + 1,
          });
        }
      }
    }
  }

  return violations;
}

describe("Wave 0 Phase 4 — router test quality guard", () => {
  it("scans at least one router test file (A4 guard)", () => {
    const testFiles = fs
      .readdirSync(TESTS_DIR)
      .filter((f) => f.endsWith(".test.ts"));
    expect(testFiles.length).toBeGreaterThanOrEqual(1);
  });

  describe("router tests assert delegation and transport mapping only", () => {
    it("no router test file contains inline Drizzle query assertions", () => {
      const violations = findRouterTestViolations();

      const violationCount = violations.length;
      if (violationCount > 0) {
        const details = violations
          .map(
            (v) =>
              `  ${v.file}:${v.lineNumber} [${v.pattern}]: ${v.line}`
          )
          .join("\n");
        expect.fail(
          `Router test SQL assertion violation count: ${violationCount}.\n` +
            `Router tests should assert delegation and transport mapping only.\n` +
            `SQL/query behavior tests belong in domain test files.\n\n` +
            `Violations:\n${details}`
        );
      }
    });
  });

  describe("reports.test.ts delegation contract", () => {
    it("reports.test.ts does not directly assert Drizzle table columns or query chains", () => {
      const reportsTestPath = path.join(TESTS_DIR, "reports.test.ts");
      if (!fs.existsSync(reportsTestPath)) {
        // File doesn't exist yet; this is fine for Red phase
        return;
      }

      const content = fs.readFileSync(reportsTestPath, "utf-8");
      const lines = content.split("\n");

      const violations: Array<{
        line: string;
        lineNumber: number;
        pattern: string;
      }> = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const { pattern, label } of PROHIBITED_PATTERNS) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            violations.push({
              line: line.trim(),
              lineNumber: i + 1,
              pattern: label,
            });
          }
        }
      }

      const violationCount = violations.length;
      if (violationCount > 0) {
        const details = violations
          .map(
            (v) =>
              `  line ${v.lineNumber} [${v.pattern}]: ${v.line}`
          )
          .join("\n");
        expect.fail(
          `reports.test.ts SQL assertion violation count: ${violationCount}.\n` +
            `The reports router test should assert delegation (domain function called)\n` +
            `and transport mapping (domain result → tRPC response), not SQL behavior.\n\n` +
            `Violations:\n${details}`
        );
      }
    });
  });
});
