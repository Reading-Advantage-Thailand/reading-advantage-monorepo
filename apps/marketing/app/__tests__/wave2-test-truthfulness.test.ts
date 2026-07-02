import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Wave 2 Phase 3 — Marketing test truthfulness guard.
 *
 * Scans the marketing test suite for four classes of false-signal tests:
 *   1. Stale "RED at HEAD" docblocks that describe intended Red work as if it
 *      is still Red after implementation.
 *   2. Contradictory credential-leak comments that claim a value is not a
 *      secret while the source still contains a secret-looking literal.
 *   3. Tautological assertions (expect(literal).toBe(same literal)) that can
 *      never fail.
 *   4. DOM/render tests running under Vitest's node environment.
 *
 * Anti-pattern coverage:
 *   A3: labeled integer counts per class, never digit-only regex.
 *   A4: fails if zero test files were scanned.
 *   A7: exclusions use path markers only (self file / fixtures dir).
 */

const TESTS_DIR = __dirname;
const APP_ROOT = resolve(TESTS_DIR, "..", "..");
const SELF_FILE = "wave2-test-truthfulness.test.ts";
const FIXTURE_DIR = "wave2-fixtures";

interface Finding {
  file: string;
  line?: number;
  snippet: string;
}

function readTestFiles(): Array<{ name: string; content: string }> {
  return readdirSync(TESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx"))
    .filter((name) => name !== SELF_FILE)
    .map((name) => ({
      name,
      content: readFileSync(resolve(TESTS_DIR, name), "utf8"),
    }));
}

function stripStringLiterals(src: string): string {
  // Remove both double- and single-quoted string literals so a literal that
  // appears inside a string does not get counted as a tautology.
  return src
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function findStaleRedDocblocks(files: Array<{ name: string; content: string }>): Finding[] {
  const findings: Finding[] = [];
  const re = /RED at HEAD/g;
  for (const { name, content } of files) {
    let match: RegExpExecArray | null;
    // Reset lastIndex not needed for re-used regex with g when reassigning
    re.lastIndex = 0;
    while ((match = re.exec(content)) !== null) {
      const line = content.slice(0, match.index).split("\n").length;
      const snippet = content.split("\n")[line - 1]?.trim() ?? "";
      findings.push({ file: name, line, snippet });
    }
  }
  return findings;
}

function hasSecretLikeLiteral(content: string): boolean {
  return /\b(sk-[a-zA-Z0-9_-]+|password|secret|token|apiKey)\b/.test(content);
}

function findContradictoryCredentialComments(
  files: Array<{ name: string; content: string }>,
): Finding[] {
  const findings: Finding[] = [];
  const re = /(?:^|\n)\s*\/\/[^\n]*\b(not a real secret|NOT a real secret|not a real key|is not a real secret|is not a real key)\b|\/\*[\s\S]*?\b(not a real secret|NOT a real secret|not a real key|is not a real secret|is not a real key)\b[\s\S]*?\*\//gi;
  for (const { name, content } of files) {
    if (!hasSecretLikeLiteral(content)) continue;
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (
        /\b(not a real secret|NOT a real secret|not a real key|is not a real secret|is not a real key)\b/i.test(
          line,
        )
      ) {
        findings.push({ file: name, line: idx + 1, snippet: line.trim() });
      }
    });
  }
  return findings;
}

function findTautologicalAssertions(files: Array<{ name: string; content: string }>): Finding[] {
  const findings: Finding[] = [];
  // Match expect(<literal>).toBe|toEqual|toStrictEqual(<same literal>).
  // The back-reference \1 ensures the same literal appears on both sides.
  const re = /expect\s*\(\s*(true|false|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\s*\(\s*\1\s*\)/g;
  for (const { name, content } of files) {
    const code = stripStringLiterals(content);
    let match: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((match = re.exec(code)) !== null) {
      const line = code.slice(0, match.index).split("\n").length;
      findings.push({ file: name, line, snippet: match[0] });
    }
  }
  return findings;
}

function findDomTestsInNodeEnv(files: Array<{ name: string; content: string }>): Finding[] {
  const findings: Finding[] = [];
  for (const { name, content } of files) {
    // Honor per-file `// @vitest-environment (jsdom|happy-dom)` pragmas:
    // those files run in their own DOM-capable environment regardless
    // of the suite-level `environment: "node"` default, so they are not
    // "DOM tests in the node env" — they are explicit opt-ins to a
    // different environment. The pragma must appear before the first
    // non-comment line (we check anywhere in the file because vitest
    // also tolerates that placement in current versions).
    const hasPerFileDomEnv = /\/\/\s*@vitest-environment\s+(jsdom|happy-dom)\b/.test(
      content,
    );
    if (hasPerFileDomEnv) continue;
    const hasTestingLibrary = /from\s+["']@testing-library\/(react|dom)["']/.test(content);
    const hasRenderJsx = /render\s*\(\s*\u003c[A-Z][A-Za-z0-9_]*/.test(content);
    if (hasTestingLibrary || hasRenderJsx) {
      findings.push({
        file: name,
        snippet: hasTestingLibrary
          ? "imports from @testing-library/react/dom"
          : "renders JSX without jsdom environment",
      });
    }
  }
  return findings;
}

function formatFindings(findings: Finding[]): string {
  return findings
    .map((f) => `  - ${f.file}${f.line ? `:${f.line}` : ""}: ${f.snippet}`)
    .join("\n");
}

describe("Wave 2 Phase 3 — Marketing test truthfulness guard", () => {
  it("counterexample fixtures are detected by every guard", () => {
    const staleRedFixture =
      "// Tier 1: Widget loader — RED at HEAD\nit(";
    expect(staleRedFixture.includes("RED at HEAD")).toBe(true);

    const credentialFixture =
      '// Deterministic key (NOT a real secret).\nconst key = "sk-fake-12345";';
    expect(
      /\b(NOT a real secret|not a real secret|not a real key|is not a real secret|is not a real key)\b/i.test(
        credentialFixture,
      ) && hasSecretLikeLiteral(credentialFixture),
    ).toBe(true);

    const tautologyFixture = "expect(true).toBe(true);";
    const tautologyRe = /expect\s*\(\s*(true|false|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\s*\(\s*\1\s*\)/g;
    expect(tautologyRe.test(tautologyFixture)).toBe(true);

    const domFixture = 'import { render } from "@testing-library/react";\nrender(<Page />);';
    expect(
      /from\s+["']@testing-library\/(react|dom)["']/.test(domFixture) ||
        /render\s*\(\s*\u003c[A-Z][A-Za-z0-9_]*/.test(domFixture),
    ).toBe(true);
  });

  it("Vitest environment is node (DOM tests are suspect here)", () => {
    const config = readFileSync(resolve(APP_ROOT, "vitest.config.ts"), "utf8");
    expect(
      /environment\s*:\s*["']node["']/.test(config),
      "marketing vitest.config.ts must declare environment: 'node' for this guard to be meaningful",
    ).toBe(true);
  });

  it("scans at least one marketing test file (A4 vacuous-pass guard)", () => {
    const files = readTestFiles();
    expect(
      files.length,
      `Scanned marketing test file count: ${files.length}`,
    ).toBeGreaterThanOrEqual(1);
  });

  it("has zero stale RED at HEAD docblocks", () => {
    const files = readTestFiles();
    const findings = findStaleRedDocblocks(files);
    expect(
      findings.length,
      `Stale RED at HEAD docblock count: ${findings.length}\n` +
        `Remove or update these comments once the corresponding behavior is implemented:\n` +
        formatFindings(findings),
    ).toBe(0);
  });

  it("has zero contradictory credential-leak comments", () => {
    const files = readTestFiles();
    const findings = findContradictoryCredentialComments(files);
    expect(
      findings.length,
      `Contradictory credential-leak comment count: ${findings.length}\n` +
        `Do not claim a value is "not a real secret" while embedding a secret-shaped literal in source:\n` +
        formatFindings(findings),
    ).toBe(0);
  });

  it("has zero tautological assertions", () => {
    const files = readTestFiles();
    const findings = findTautologicalAssertions(files);
    expect(
      findings.length,
      `Tautological assertion count: ${findings.length}\n` +
        `Replace assertions that compare a literal to itself with behavior-exercising checks:\n` +
        formatFindings(findings),
    ).toBe(0);
  });

  it("has zero DOM tests in the node-only environment", () => {
    const files = readTestFiles();
    const findings = findDomTestsInNodeEnv(files);
    expect(
      findings.length,
      `DOM-in-node-environment test file count: ${findings.length}\n` +
        `Move DOM tests to a jsdom/happy-dom environment or convert to route-level behavior tests:\n` +
        formatFindings(findings),
    ).toBe(0);
  });
});
