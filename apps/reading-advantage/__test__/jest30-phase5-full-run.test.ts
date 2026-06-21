/**
 * Jest 30 Migration - Phase 5 Task 2: Full-Suite Run Record Red Proof.
 *
 * Task 2 of the Phase 5 Completion-Audit Remediation requires a real
 * full-suite Jest run across all three in-scope apps
 * (reading-advantage, vocabulary-games, @reading-advantage/scripts) -
 * not just the targeted `__test__/` pattern that Phase 4 used. The
 * fleet completion audit rejected the prior closeout because
 * un-gated suites (game component tests, scripts package) had real
 * failures masked by the 14-suite targeted gate.
 *
 * This file is the Red proof for Task 2: it asserts the
 * `phase-5-full-run.json` artifact exists at the canonical Measure
 * path, was produced by an actual full-suite run, and has the
 * required shape (per-app counts, totals, inventory cross-check).
 *
 * Design constraints:
 *
 *   - One focused test file. It does not run Jest itself; the
 *     full-suite run is owned by the Phase 5 implementer (see
 *     plan.md hand-off §5.2). This test only verifies the
 *     run-record artifact contract.
 *   - The test reads the inventory from Task 1 and asserts the
 *     run record's totals match - that is the cross-check that
 *     proves the run was truly full-suite (not a targeted subset
 *     with a misleading record).
 *   - Bounded: `__test__/jest30-phase5-full-run.test.ts` is the
 *     single source of truth for "what runs"; no `--testPathPattern`
 *     widening, no full-suite smoke, no watch mode.
 *
 * Expected behavior:
 *
 *   - FAILS at the pre-Phase-5 HEAD (the run record artifact does
 *     not exist). All 4 tests fail with "expected truthy, received
 *     null" on the missing file; the failures are paired with the
 *     live-behavior full-suite run that the implementer owns.
 *   - PASSES once the implementer writes
 *     `measure/tracks/jest30_major_migration/phase-5-full-run.json`
 *     with the schema documented in plan.md §5.2.
 *
 *   IMPORTANT — fake harness / "smoke" test guard:
 *
 *   This test must NOT be satisfied by a fabricated JSON that
 *   *looks* like a full-suite run. The cross-check assertion
 *   (test 4) requires the run record's totals to equal the
 *   inventory's expected_total, which forces the implementer to
 *   actually run the suite and capture the real counts. A
 *   hand-written record that doesn't match the inventory is
 *   rejected by the test.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const RUN_RECORD_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks",
  "jest30_major_migration",
  "phase-5-full-run.json",
);

const INVENTORY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks",
  "jest30_major_migration",
  "phase-5-inventory.json",
);

interface Phase5AppRun {
  suites_run: number;
  tests_run: number;
  suites_passed: number;
  tests_passed: number;
  suites_failed: number;
  tests_failed: number;
  duration_seconds: number;
}

interface Phase5FullRun {
  started_at: string;
  completed_at: string;
  command: string;
  per_app: {
    reading_advantage: Phase5AppRun;
    vocabulary_games: Phase5AppRun;
    reading_advantage_scripts: Phase5AppRun;
  };
  totals: {
    suites_run: number;
    tests_run: number;
    expected_total_suites: number;
  };
}

function readRunRecordOrNull(): Phase5FullRun | null {
  if (!fs.existsSync(RUN_RECORD_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(RUN_RECORD_PATH, "utf8");
  try {
    return JSON.parse(raw) as Phase5FullRun;
  } catch (error) {
    throw new Error(
      `phase-5-full-run: JSON parse failed at ${RUN_RECORD_PATH}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function readInventoryOrNull(): {
  expected_total: number;
  suites: { reading_advantage: number; vocabulary_games: number; reading_advantage_scripts: number };
} | null {
  if (!fs.existsSync(INVENTORY_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8")) as {
    expected_total: number;
    suites: { reading_advantage: number; vocabulary_games: number; reading_advantage_scripts: number };
  };
}

describe("jest30-phase5-full-run - full in-scope suite run record exists", () => {
  const record = readRunRecordOrNull();

  test("phase-5-full-run.json file exists at the canonical path", () => {
    expect(record).not.toBeNull();
  });

  test("run record has per-app counts for all three in-scope apps", () => {
    expect(record).not.toBeNull();
    const perApp = record?.per_app;
    expect(perApp?.reading_advantage).toBeDefined();
    expect(perApp?.vocabulary_games).toBeDefined();
    expect(perApp?.reading_advantage_scripts).toBeDefined();
  });

  test("run record totals reflect the actual sum of per-app counts", () => {
    expect(record).not.toBeNull();
    const perApp = record?.per_app;
    const totals = record?.totals;
    if (!perApp || !totals) {
      return;
    }
    const sumSuites =
      perApp.reading_advantage.suites_run +
      perApp.vocabulary_games.suites_run +
      perApp.reading_advantage_scripts.suites_run;
    const sumTests =
      perApp.reading_advantage.tests_run +
      perApp.vocabulary_games.tests_run +
      perApp.reading_advantage_scripts.tests_run;
    expect(totals.suites_run).toBe(sumSuites);
    expect(totals.tests_run).toBe(sumTests);
  });

  test(
    "run record totals.suites_run matches inventory.expected_total (proves it was a real full run, not a smoke subset)",
    () => {
      expect(record).not.toBeNull();
      const inventory = readInventoryOrNull();
      const totals = record?.totals;
      if (!inventory || !totals) {
        return;
      }
      expect(totals.suites_run).toBe(inventory.expected_total);
      expect(totals.expected_total_suites).toBe(inventory.expected_total);
    },
  );
});
