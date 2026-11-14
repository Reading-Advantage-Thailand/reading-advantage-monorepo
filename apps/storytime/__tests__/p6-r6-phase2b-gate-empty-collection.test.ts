// @vitest-environment node
/**
 * The real-database verdict of the phase 2b browser gate fails on an empty collection (track
 * storytime_app_rebuild_20261025; plan task 6.6, Phase 6 remediation group r1; Review A finding A603).
 *
 * Source: Review A of Phase 6, finding A603: "apps/storytime/__tests__/phase2b-browser-gate.sh:108-113 parses
 * REAL_DB_TESTS and REAL_DB_FAILED and only echoes them (line 112); the pass depends on REAL_DB_RC alone
 * (line 113). A real-database file that collects zero rows (every row skipped) exits 0 and passes the row
 * with no work done." PM words, 2026-11-15: "A603 ... is a vacuous pass in a release check. Fold it into Green
 * 6.7 (fail on an empty collection)."
 *
 * The row proves behavior, not text. It cuts the real verdict block out of the gate script and runs it in bash
 * on a fake vitest log and a fake exit code. The gate cannot run in isolation (it needs the heavy lock, a
 * local database container, a build, and a browser), and the verdict is inline in the script, so the cut is
 * the narrowest honest way to run the real logic with no production change. The limit: the cut starts at the
 * line that begins `REAL_DB_SUMMARY=` and ends before the line `echo "=== Seed the accounts of the gate ==="`.
 * Green keeps both anchor lines, and keeps the verdict between them, so the cut still holds the whole verdict.
 * The block reads `$REAL_DB_LOG` (the vitest log) and `$REAL_DB_RC` (0 when vitest exited 0), and calls
 * `pass` and `fail`; the harness defines those two as stand-ins that print `VERDICT_PASS` and `VERDICT_FAIL`.
 *
 * Controls: a log with passed rows, 0 failed, and exit 0 gives no fail. A log with a failed row, and exit 1,
 * gives a fail. The empty collections (no summary line, 0 passed, every row skipped) must give a fail.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");

/** The gate script. */
const GATE = resolve(app, "__tests__/phase2b-browser-gate.sh");

/** The first line of the verdict block. */
const START = "REAL_DB_SUMMARY=";

/** The line before which the verdict block ends. */
const END = 'echo "=== Seed the accounts of the gate ==="';

/** The temp folders of the rows. */
const folders: string[] = [];

afterAll(() => {
  for (const folder of folders) rmSync(folder, { recursive: true, force: true });
});

/**
 * Cuts the verdict block out of the gate script.
 * @returns The block text.
 * @throws When an anchor line is missing.
 */
function verdictBlock(): string {
  const text = readFileSync(GATE, "utf8");
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(START));
  const end = lines.findIndex((line) => line.trim() === END);
  if (start < 0) throw new Error(`the gate script has no line that begins ${START}`);
  if (end < 0 || end <= start) throw new Error(`the gate script has no anchor line ${END} after the verdict block`);
  return lines.slice(start, end).join("\n");
}

/** The result of one verdict run. */
interface Verdict {
  status: number | null;
  passes: number;
  fails: number;
  output: string;
}

/**
 * Runs the real verdict block on a fake vitest log and a fake exit code.
 * @param log The fake vitest log text.
 * @param rc The fake exit code of the vitest run: 0 or 1.
 * @returns The exit status of the harness, the count of pass calls, the count of fail calls, and the output.
 */
function runVerdict(log: string, rc: number): Verdict {
  const folder = mkdtempSync(join(tmpdir(), "storytime-gate-verdict-"));
  folders.push(folder);
  const logPath = join(folder, "real-db.log");
  writeFileSync(logPath, log);
  const script = [
    "set -uo pipefail",
    "pass() { echo \"VERDICT_PASS: $1\"; }",
    "fail() { echo \"VERDICT_FAIL: $1\"; }",
    `REAL_DB_LOG='${logPath}'`,
    `REAL_DB_RC=${rc}`,
    verdictBlock(),
    "",
  ].join("\n");
  const run = spawnSync("bash", ["-c", script], { encoding: "utf8", timeout: 30_000 });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  return {
    status: run.status,
    passes: (output.match(/^VERDICT_PASS:/gm) ?? []).length,
    fails: (output.match(/^VERDICT_FAIL:/gm) ?? []).length,
    output,
  };
}

/**
 * Builds a vitest log with a summary.
 * @param summary The text of the `Tests` summary line, or null for a log with no summary line.
 * @returns The log text.
 */
function vitestLog(summary: string | null): string {
  const head = " RUN  v3.2.4 /repo/packages/backend\n\n";
  if (summary === null) return `${head}No test files found, exiting with code 0\n`;
  return `${head} Test Files  1 passed (1)\n      Tests  ${summary}\n   Start at  10:00:00\n   Duration  1.20s\n`;
}

/** The labeled counts of the Red evidence (A3, A4). */
let emptyRejected = 0;
let emptyCases = 0;

describe("P6 r6 A603 controls that stay as they were", () => {
  it("passed rows, 0 failed, and exit 0 give a pass and no fail", () => {
    const run = runVerdict(vitestLog("5 passed (5)"), 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output, "the block must run and print its labeled counts").toMatch(/real_db_tests=5 real_db_failed=0/);
    expect(run.fails, `a real run must give no fail, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.passes, "a real run must give a pass").toBeGreaterThanOrEqual(1);
  });

  it("a failed row and exit 1 give a fail", () => {
    const run = runVerdict(vitestLog("1 failed | 4 passed (5)"), 1);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output, "the block must run and print its labeled counts").toMatch(/real_db_tests=5 real_db_failed=1/);
    expect(run.fails, "a failed row must give a fail").toBeGreaterThanOrEqual(1);
  });
});

describe("P6 r6 A603 an empty collection with exit 0 is a fail", () => {
  const empty: Array<[string, string | null]> = [
    ["a log with no summary line (zero rows collected)", null],
    ["a summary of 0 passed (0)", "0 passed (0)"],
    ["every row skipped", "3 skipped (3)"],
    ["every row skipped or todo", "2 skipped | 1 todo (3)"],
  ];
  for (const [label, summary] of empty) {
    it(`fails on ${label}`, () => {
      emptyCases += 1;
      const run = runVerdict(vitestLog(summary), 0);
      expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
      expect(run.output, "the block must run and print its labeled counts").toMatch(/real_db_tests=\d+ real_db_failed=\d+/);
      expect(run.fails, `an empty collection must give a fail, output: ${run.output.slice(0, 300)}`).toBeGreaterThanOrEqual(1);
      expect(run.passes, "an empty collection must give no pass").toBe(0);
      emptyRejected += 1;
    });
  }

  it("labels the Red counts with floors (A3, A4)", () => {
    console.log(`empty_collection_cases=${emptyCases}`);
    console.log(`empty_collection_rejected=${emptyRejected}`);
    expect(emptyCases, "empty_collection_cases floor 4").toBeGreaterThanOrEqual(4);
    expect(emptyRejected, "empty_collection_rejected equals empty_collection_cases").toBe(emptyCases);
  });
});
