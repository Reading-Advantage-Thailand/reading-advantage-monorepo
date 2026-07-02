/**
 * Wave 2 Phase 4 — Reusable migration-doctor test helper.
 *
 * Track:  wave2_confidence_restoration_20260628
 * Phase:  4 — Reusable Harnesses
 *
 * Drives a shared test helper that simulates migration-doctor divergence
 * states without live database credentials. The helper generalizes the
 * hand-patched DB approach used in ledger-doctor.test.ts into deterministic
 * fake journal/ledger/sentinel fixtures.
 *
 * Intended home:
 *   packages/db/src/testing/migration-doctor-helper.ts
 *
 * RED expectations at HEAD:
 *   - The helper module does not exist, so the import fails.
 *   - If a stub exists, it must report fresh DB, existing DB,
 *     schema-present-ledger-missing, and ledger-present-schema-missing cases.
 *
 * Anti-pattern coverage:
 *   A1: assertions inspect structured journal/ledger/sentinel objects, not
 *       substring output.
 *   A3: labeled counts for divergence cases and ledger rows.
 *   A4: fails if the helper reports 0 divergence cases.
 *   A5: counterexample fixtures include a deliberate mismatch between schema
 *       and ledger that the helper must surface.
 */
import { describe, expect, it } from "vitest";
import { buildMigrationDoctorHelper } from "../testing/migration-doctor-helper.js";

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface SentinelProbe {
  kind: "table" | "column";
  target: string;
}

interface FakeLedgerRow {
  hash: string;
  createdAt: number;
}

interface MigrationState {
  journal: JournalEntry[];
  sentinels: Record<string, SentinelProbe>;
  schemaPresentTags: Set<string>;
  ledgerRows: FakeLedgerRow[];
}

interface DivergenceReport {
  freshDb: boolean;
  existingDb: boolean;
  schemaPresentLedgerMissing: Array<{ tag: string; idx: number }>;
  ledgerPresentSchemaMissing: Array<{ tag: string; idx: number }>;
  divergenceCount: number;
}

interface MigrationDoctorHelper {
  /**
   * Build a deterministic migration state fixture.
   * @param variant - which divergence shape to produce
   */
  buildState(variant: "fresh" | "existing" | "schema-missing-ledger" | "ledger-missing-schema"): MigrationState;
  /**
   * Run the doctor logic against a fake state (no live DB).
   */
  check(state: MigrationState): DivergenceReport;
}

function sampleJournal(): JournalEntry[] {
  return [
    { idx: 1, version: "1", when: 1000, tag: "0001_initial", breakpoints: false },
    { idx: 2, version: "1", when: 2000, tag: "0002_add_users", breakpoints: false },
    { idx: 3, version: "1", when: 3000, tag: "0003_add_schools", breakpoints: false },
  ];
}

function sampleSentinels(): Record<string, SentinelProbe> {
  return {
    "0001_initial": { kind: "table", target: "users" },
    "0002_add_users": { kind: "column", target: "users.email" },
    "0003_add_schools": { kind: "table", target: "schools" },
  };
}

describe("Wave 2 Phase 4 — migration doctor helper", () => {
  it("exists and exposes a builder function", () => {
    expect(
      buildMigrationDoctorHelper,
      "packages/db/src/testing/migration-doctor-helper.ts must export " +
        "`buildMigrationDoctorHelper()`. This helper generalizes the Phase 1 " +
        "ledger-doctor test pattern so tests can assert migration divergence " +
        "without a live Postgres instance.",
    ).toBeTypeOf("function");
  });

  it("reports a fresh DB with zero applied migrations and zero schema", () => {
    const helper = buildMigrationDoctorHelper() as MigrationDoctorHelper;
    const state = helper.buildState("fresh");
    expect(
      state.ledgerRows.length,
      `Fresh DB ledger row count: ${state.ledgerRows.length}. ` +
        `A fresh DB must have no applied ledger rows.`,
    ).toBe(0);
    expect(
      state.schemaPresentTags.size,
      `Fresh DB schema-present tag count: ${state.schemaPresentTags.size}. ` +
        `A fresh DB must have no schema artifacts.`,
    ).toBe(0);

    const report = helper.check(state);
    expect(
      report.freshDb,
      "DivergenceReport.freshDb must be true for a fresh DB.",
    ).toBe(true);
  });

  it("reports an existing DB with ledger and schema in parity", () => {
    const helper = buildMigrationDoctorHelper() as MigrationDoctorHelper;
    const state = helper.buildState("existing");
    const report = helper.check(state);
    expect(
      report.existingDb,
      "DivergenceReport.existingDb must be true when ledger and schema match.",
    ).toBe(true);
    expect(
      report.divergenceCount,
      `Existing DB divergence count: ${report.divergenceCount}. ` +
        `A fully-migrated DB must have zero divergence.`,
    ).toBe(0);
    expect(
      report.schemaPresentLedgerMissing.length,
      `schema-present/ledger-missing count: ${report.schemaPresentLedgerMissing.length}.`,
    ).toBe(0);
    expect(
      report.ledgerPresentSchemaMissing.length,
      `ledger-present/schema-missing count: ${report.ledgerPresentSchemaMissing.length}.`,
    ).toBe(0);
  });

  it("detects schema-present / ledger-missing divergence (A5 counterexample)", () => {
    const helper = buildMigrationDoctorHelper() as MigrationDoctorHelper;
    const state = helper.buildState("schema-missing-ledger");
    const report = helper.check(state);
    expect(
      report.schemaPresentLedgerMissing.length,
      `schema-present/ledger-missing count: ${report.schemaPresentLedgerMissing.length}. ` +
        `The helper must detect migrations whose schema artifacts exist but ` +
        `whose ledger rows are absent (the June 8 incident class).`,
    ).toBeGreaterThan(0);
  });

  it("detects ledger-present / schema-missing divergence", () => {
    const helper = buildMigrationDoctorHelper() as MigrationDoctorHelper;
    const state = helper.buildState("ledger-missing-schema");
    const report = helper.check(state);
    expect(
      report.ledgerPresentSchemaMissing.length,
      `ledger-present/schema-missing count: ${report.ledgerPresentSchemaMissing.length}. ` +
        `The helper must detect ledger rows that claim a migration was applied ` +
        `while the schema sentinel is missing.`,
    ).toBeGreaterThan(0);
  });

  describe("consumer — custom state assertion", () => {
    it("counts divergence for a hand-built mismatch", () => {
      const helper = buildMigrationDoctorHelper() as MigrationDoctorHelper;
      const journal = sampleJournal();
      const sentinels = sampleSentinels();
      // Simulate migration 0003 schema present but ledger missing
      const state: MigrationState = {
        journal,
        sentinels,
        schemaPresentTags: new Set(["0001_initial", "0002_add_users", "0003_add_schools"]),
        ledgerRows: [
          { hash: "h1", createdAt: 1000 },
          { hash: "h2", createdAt: 2000 },
          // 0003 row deliberately omitted
        ],
      };
      const report = helper.check(state);
      expect(
        report.divergenceCount,
        `Hand-built mismatch divergence count: ${report.divergenceCount}. ` +
          `Expected exactly 1 divergence for missing 0003 ledger row.`,
      ).toBe(1);
      expect(
        report.schemaPresentLedgerMissing.map((d) => d.tag),
      ).toContain("0003_add_schools");
    });
  });
});
