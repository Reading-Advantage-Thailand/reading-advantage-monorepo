/**
 * Wave 0 Phase 4 — Red test: API architecture boundary guard
 *
 * Static guard tests forbidding Drizzle/schema imports in
 * `packages/api/src/routers/**` except approved infrastructure exceptions.
 *
 * Evidence refs: Shared Foundation F-SF-003; Cross-App CA-004; Monorepo MR-C05.
 *
 * Anti-patterns guarded:
 * - A1/A7: inspects actual import lines, not broad prose substrings.
 * - A3: violations reported as labeled counts.
 * - A4: test fails if zero router files are scanned.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROUTERS_DIR = path.resolve(__dirname, "../routers");

/**
 * Approved infrastructure exceptions — imports allowed in routers with a named reason.
 * Each entry: [importPattern, reason]
 *
 * Currently none approved. If a router legitimately needs a Drizzle type (not a query),
 * it must be added here with a reason string.
 */
const APPROVED_EXCEPTIONS: Array<[string, string]> = [
  // Example: ["drizzle-orm/sql", "SQL template literals for raw queries in auth router"]
];

/**
 * Scan all .ts files in the routers directory and return their filenames + contents.
 */
function scanRouterFiles(): Array<{ filename: string; content: string }> {
  const files = fs.readdirSync(ROUTERS_DIR).filter((f) => f.endsWith(".ts"));
  return files.map((filename) => ({
    filename,
    content: fs.readFileSync(path.join(ROUTERS_DIR, filename), "utf-8"),
  }));
}

/**
 * Extract import lines from source that reference a given module pattern.
 * Returns array of { line, lineNumber, importPath }.
 */
function findImports(
  source: string,
  modulePattern: RegExp
): Array<{ line: string; lineNumber: number; importPath: string }> {
  const lines = source.split("\n");
  const results: Array<{
    line: string;
    lineNumber: number;
    importPath: string;
  }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const importMatch = line.match(
      /import\s+.*from\s+["']([^"']+)["']/
    );
    if (importMatch && modulePattern.test(importMatch[1]!)) {
      results.push({
        line: line.trim(),
        lineNumber: i + 1,
        importPath: importMatch[1]!,
      });
    }
  }
  return results;
}

describe("Wave 0 Phase 4 — API architecture boundary guard", () => {
  const routerFiles = scanRouterFiles();

  it("scans at least one router file (A4 guard)", () => {
    expect(routerFiles.length).toBeGreaterThanOrEqual(1);
  });

  describe("no drizzle-orm imports in routers", () => {
    it("all router files are free of drizzle-orm imports", () => {
      const violations: Array<{
        file: string;
        line: string;
        lineNumber: number;
        importPath: string;
      }> = [];

      for (const { filename, content } of routerFiles) {
        const drizzleImports = findImports(content, /^drizzle-orm/);
        for (const imp of drizzleImports) {
          // Check if this is an approved exception
          const isApproved = APPROVED_EXCEPTIONS.some(
            ([pattern, _reason]) =>
              imp.importPath.includes(pattern) ||
              imp.line.includes(pattern)
          );
          if (!isApproved) {
            violations.push({ file: filename, ...imp });
          }
        }
      }

      const violationCount = violations.length;
      if (violationCount > 0) {
        const details = violations
          .map(
            (v) =>
              `  ${v.file}:${v.lineNumber}: ${v.line} (import: ${v.importPath})`
          )
          .join("\n");
        expect.fail(
          `Drizzle-orm import violation count: ${violationCount} of ${routerFiles.length} router files.\n` +
            `Unapproved drizzle-orm imports found:\n${details}\n\n` +
            `If a router legitimately needs a Drizzle type, add it to APPROVED_EXCEPTIONS with a named reason.`
        );
      }
    });
  });

  describe("no @reading-advantage/db/schema imports in routers", () => {
    it("all router files are free of @reading-advantage/db/schema imports", () => {
      const violations: Array<{
        file: string;
        line: string;
        lineNumber: number;
        importPath: string;
      }> = [];

      for (const { filename, content } of routerFiles) {
        const dbSchemaImports = findImports(
          content,
          /^@reading-advantage\/db\/schema/
        );
        for (const imp of dbSchemaImports) {
          // Check if this is an approved exception
          const isApproved = APPROVED_EXCEPTIONS.some(
            ([pattern, _reason]) =>
              imp.importPath.includes(pattern) ||
              imp.line.includes(pattern)
          );
          if (!isApproved) {
            violations.push({ file: filename, ...imp });
          }
        }
      }

      const violationCount = violations.length;
      if (violationCount > 0) {
        const details = violations
          .map(
            (v) =>
              `  ${v.file}:${v.lineNumber}: ${v.line} (import: ${v.importPath})`
          )
          .join("\n");
        expect.fail(
          `@reading-advantage/db/schema import violation count: ${violationCount} of ${routerFiles.length} router files.\n` +
            `Unapproved @reading-advantage/db/schema imports found:\n${details}\n\n` +
            `Routers must delegate to domain functions, not import DB schema directly.`
        );
      }
    });
  });

  describe("approved exceptions are documented", () => {
    it("every approved exception has a non-empty reason string", () => {
      for (const [pattern, reason] of APPROVED_EXCEPTIONS) {
        expect(
          reason.length,
          `Approved exception '${pattern}' must have a non-empty reason`
        ).toBeGreaterThan(0);
      }
    });
  });
});
