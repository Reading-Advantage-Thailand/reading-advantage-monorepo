import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Wave 2 Phase 3 — @reading-advantage/types regression guard.
 *
 * Wave 0 made @reading-advantage/types test-bearing (4 files / 88 tests).
 * This test protects that outcome from regression; it is NOT a new Red.
 *
 * It re-runs the peer test files (excluding this guard) with Vitest's JSON
 * reporter and asserts the counted suites/tests stay above the Wave 0
 * baseline.
 *
 * Anti-pattern coverage:
 *   A3: labeled integer counts from Vitest JSON output, not digit-only regex.
 *   A4: fails if zero test files were scanned.
 */

const TESTS_DIR = __dirname;
const PACKAGE_ROOT = resolve(TESTS_DIR, "../..");
const SELF_FILE = "wave2-types-regression-guard.test.ts";

function listPeerTestFiles(): string[] {
  return readdirSync(TESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".test.ts"))
    .filter((name) => name !== SELF_FILE)
    .map((name) => resolve(TESTS_DIR, name));
}

interface VitestJsonSummary {
  numTotalTestSuites: number;
  numTotalTests: number;
  success: boolean;
}

function runPeerSuite(files: string[]): VitestJsonSummary {
  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "--reporter=json", ...files],
    {
      cwd: PACKAGE_ROOT,
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    },
  );
  const output = result.stdout ?? "";
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(
      `Vitest JSON reporter produced no JSON. stdout:\n${output}\nstderr:\n${result.stderr ?? ""}`,
    );
  }
  const parsed = JSON.parse(output.slice(jsonStart)) as VitestJsonSummary;
  return parsed;
}

describe("Wave 2 Phase 3 — @reading-advantage/types regression guard", () => {
  it("remains test-bearing with at least 4 test files (A4 guard)", () => {
    const files = listPeerTestFiles();
    expect(
      files.length,
      `Types test file count: ${files.length}`,
    ).toBeGreaterThanOrEqual(4);
  });

  it("remains test-bearing with at least 88 test cases", () => {
    const files = listPeerTestFiles();
    expect(
      files.length,
      "Cannot count tests when no peer test files exist (A4 guard)",
    ).toBeGreaterThanOrEqual(1);

    const summary = runPeerSuite(files);
    expect(
      summary.numTotalTests,
      `Types test count: ${summary.numTotalTests}`,
    ).toBeGreaterThanOrEqual(88);
  }, 30000);
});
