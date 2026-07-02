/**
 * Wave 2 Phase 1 — Migration and Seed Governance Red tests.
 *
 * Track: wave2_confidence_restoration_20260628
 *
 * These tests are intentionally RED at the start of Phase 1. They verify that:
 *   1. Every migration through the latest journal entry has a sentinel probe.
 *   2. The ledger doctor exposes a deploy-gate contract that fails when an app
 *      declares a minimum migration newer than the DB ledger.
 *
 * All assertions use filesystem fixtures and source scans. Live DB proof is
 * optional and skipped when DIRECT_DATABASE_URL / PG_TEST_URL are absent.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const JOURNAL_PATH = join(PACKAGE_ROOT, "drizzle", "meta", "_journal.json");
const DOCTOR_SCRIPT = join(PACKAGE_ROOT, "scripts", "migration-ledger-doctor.ts");

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

let journal: Journal;

beforeAll(() => {
  journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
});

// -----------------------------------------------------------------------------
// Sentinel parity: every journal entry through the latest migration must have a
// sentinel probe. This invariant is already enforced by journal-integrity.test.ts;
// the block below makes the Wave 2 Phase 1 claim explicit and adds a labeled
// count for the latest three migrations.
// -----------------------------------------------------------------------------

describe("Wave 2 migration sentinel parity", () => {
  it("0022/0023/0024 have sentinel probes", async () => {
    const sentinelsModule = await import("../sentinels.js");
    const probes = sentinelsModule.sentinelProbes as Record<
      string,
      { tag: string; kind: "table" | "column"; target: string }
    >;
    const latestTags = journal.entries
      .filter((e) => e.idx >= 22)
      .map((e) => e.tag);
    const missing = latestTags.filter((tag) => !(tag in probes));
    expect(
      missing,
      `Missing sentinel count: ${missing.length} (latest migrations 0022-0024)`,
    ).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Deploy gate contract: the doctor must support a required-migration check so
// app deploy pipelines can fail closed when the ledger is behind.
// -----------------------------------------------------------------------------

describe("Wave 2 deploy doctor gate contract", () => {
  it("doctor script supports a required-migration flag", () => {
    const doctorSource = readFileSync(DOCTOR_SCRIPT, "utf8");
    const hasContract =
      doctorSource.includes("--required-migration") ||
      doctorSource.includes("REQUIRED_MIGRATION") ||
      doctorSource.includes("requiredMigration");
    expect(
      hasContract,
      "Required migration behind count: 1 — doctor script does not expose a required-migration deploy gate",
    ).toBe(true);
  });
});
