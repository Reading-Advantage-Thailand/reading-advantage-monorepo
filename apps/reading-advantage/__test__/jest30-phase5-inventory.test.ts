/**
 * Jest 30 Migration - Phase 5 Task 1: Suite Inventory Red Proof.
 *
 * The Phase 5 Completion-Audit Remediation (reopened 2026-06-21 after
 * the fleet completion audit rejected the prior closeout) requires a
 * full-suite evidence base rather than the targeted 14-suite
 * `__test__/` pattern. Task 1 is the inventory that records the
 * expected total suite count across the three in-scope apps
 * (reading-advantage, vocabulary-games, @reading-advantage/scripts)
 * BEFORE the full-suite run is executed in Task 2.
 *
 * This file is the Red proof for Task 1: it asserts the
 * `phase-5-inventory.json` artifact exists at the canonical Measure
 * path and has the four required shape facts. The implementer at
 * Phase 5 closeout will produce the artifact (see plan.md hand-off
 * §5.1) by running `find` over the three in-scope app directories
 * and saving the result.
 *
 * Design constraints (per measure/tracks/jest30_major_migration/test-strategy.md):
 *
 *   - One focused test file. It does not touch any other test, package,
 *     or config.
 *   - The test reads only the inventory artifact on disk; it does not
 *     run `find` or any filesystem probe. The pre-run inventory is the
 *     artifact, not the probe that produces it. The probe is owned by
 *     the Phase 5 implementer (the test only verifies the contract).
 *   - Bounded: `__test__/jest30-phase5-inventory.test.ts` is the
 *     single source of truth for "what runs"; no `--testPathPattern`
 *     widening, no full-suite smoke, no watch mode.
 *   - No global state, no polyfills, no mocks.
 *
 * Expected behavior:
 *
 *   - FAILS at the pre-Phase-5 HEAD (the inventory artifact does not
 *     exist). All 4 tests fail with "expected truthy, received null"
 *     on the missing file; the failures are paired with the
 *     live-behavior inventory probe that the implementer owns.
 *   - PASSES once the implementer writes
 *     `measure/tracks/jest30_major_migration/phase-5-inventory.json`
 *     with the schema documented in plan.md §5.1.
 */

import * as fs from "node:fs";
import * as path from "node:path";

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

interface Phase5Inventory {
  created_at: string;
  apps: {
    reading_advantage: string;
    vocabulary_games: string;
    reading_advantage_scripts: string;
  };
  suites: {
    reading_advantage: number;
    vocabulary_games: number;
    reading_advantage_scripts: number;
  };
  expected_total: number;
}

function readInventoryOrNull(): Phase5Inventory | null {
  if (!fs.existsSync(INVENTORY_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(INVENTORY_PATH, "utf8");
  try {
    return JSON.parse(raw) as Phase5Inventory;
  } catch (error) {
    throw new Error(
      `phase-5-inventory: JSON parse failed at ${INVENTORY_PATH}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

describe("jest30-phase5-inventory - full in-scope suite inventory exists", () => {
  const inventory = readInventoryOrNull();

  test("phase-5-inventory.json file exists at the canonical path", () => {
    expect(inventory).not.toBeNull();
  });

  test("inventory.suites.reading_advantage is a positive integer", () => {
    expect(inventory).not.toBeNull();
    const suites = inventory?.suites;
    expect(suites?.reading_advantage).toEqual(expect.any(Number));
    expect(suites?.reading_advantage).toBeGreaterThan(0);
  });

  test("inventory.suites.vocabulary_games is a positive integer", () => {
    expect(inventory).not.toBeNull();
    const suites = inventory?.suites;
    expect(suites?.vocabulary_games).toEqual(expect.any(Number));
    expect(suites?.vocabulary_games).toBeGreaterThan(0);
  });

  test(
    "inventory.expected_total equals the sum of the three in-scope suite counts",
    () => {
      expect(inventory).not.toBeNull();
      const suites = inventory?.suites;
      expect(suites).toBeDefined();
      const expected = inventory?.expected_total;
      expect(expected).toEqual(
        (suites?.reading_advantage ?? 0) +
          (suites?.vocabulary_games ?? 0) +
          (suites?.reading_advantage_scripts ?? 0),
      );
    },
  );
});
