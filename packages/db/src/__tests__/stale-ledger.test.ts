/**
 * Phase 2 — Task 5 (Red): stale-ledger simulation for FR-1.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-1, NFR §2.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §1, §2, §5.
 *
 * Scenario: a database whose `drizzle.__drizzle_migrations` ledger already
 * ends at the production-ceiling stamp (1779120000000 — idx 16) MUST, when
 * `drizzle-kit migrate` runs against the current journal, apply idx 17
 * (sentinel: `gamification_profiles.school_id`).
 *
 * On master (2026-06-12), the journal has idx 17 stamped 1749081600000 —
 * strictly less than 1779120000000, so drizzle-orm 0.44.7's strict-`<`
 * semantics (pg-core/dialect.cjs:64) skip it. The migrator is a no-op for
 * 0017+, the `gamification_profiles.school_id` column is missing, and the
 * assertion below fails.
 *
 * Per test-strategy §7 (Live-Proof Plan), the targeted Red command is:
 *   CI=true PG_TEST_URL=postgres://... pnpm vitest run src/__tests__/stale-ledger.test.ts
 *
 * Requires docker compose `postgres` (or a local Postgres on :5432) reachable
 * via `PG_TEST_URL`. The fixture in __tests__/_fixtures/pg-test-db.ts owns
 * the scratch DB lifecycle.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");
const MIGRATION_0017_PATH = join(DRIZZLE_DIR, "0017_science_school_id.sql");

// Production-ledger ceiling recorded in drizzle/meta/README.md.
// 1779120000000 == idx 16 (0016_users_grade_level).
const PRODUCTION_CEILING = 1779120000000;

const PG_TEST_URL = process.env.PG_TEST_URL;
const DESCRIBE = PG_TEST_URL ? describe : describe.skip;

interface Journal {
  entries: { idx: number; tag: string; when: number }[];
}

let scratchClient: ReturnType<typeof postgres>;
let scratchDbName: string;
let scratchBaseUrl: string;

DESCRIBE("stale-ledger simulation — FR-1 regression for the June 8 incident", () => {
  beforeAll(async () => {
    if (!PG_TEST_URL) return;
    scratchDbName = `stale_ledger_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const adminUrl = new URL(PG_TEST_URL);
    const adminClient = postgres(PG_TEST_URL, { max: 1 });
    await adminClient.unsafe(`CREATE DATABASE "${scratchDbName}"`);
    await adminClient.end();
    scratchBaseUrl = new URL(PG_TEST_URL).toString().replace(/\/[^/]+(\?.*)?$/, `/${scratchDbName}$1`);
    scratchClient = postgres(scratchBaseUrl, { max: 1 });
  }, 60_000);

  afterAll(async () => {
    if (!scratchClient) return;
    try {
      await scratchClient.unsafe(`DROP DATABASE IF EXISTS ${scratchDbName}`);
    } catch {
      // best-effort cleanup
    }
    await scratchClient.end();
  }, 30_000);

  it("applies idx 17 (`0017_science_school_id`) on a ledger that ends at 0016 (sentinel: gamification_profiles.school_id)", async () => {
    // Pre-create the migrations ledger at the production ceiling — the
    // simulation of "any DB whose ledger max is 0016's stamp".
    await scratchClient.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await scratchClient.unsafe(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
    const idx16 = journal.entries.find((e) => e.idx === 16);
    if (!idx16) throw new Error("journal missing idx 16 — cannot simulate ceiling");
    const sql0016 = readFileSync(join(DRIZZLE_DIR, `${idx16.tag}.sql`), "utf8");
    const hash0016 = createHash("sha256").update(sql0016).digest("hex");

    // Insert the simulated ceiling row.
    await scratchClient.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES ($1, $2)`,
      [hash0016, PRODUCTION_CEILING]
    );

    // Sanity: the SQL file we expect to be re-applied actually exists.
    expect(
      readFileSync(MIGRATION_0017_PATH, "utf8"),
      "0017_science_school_id.sql must exist on disk for the stale-ledger sim"
    ).toContain("gamification_profiles");

    // Run drizzle's migrator against the scratch DB with the current journal.
    // The strict-`<` semantics (drizzle-orm 0.44.7 pg-core/dialect.cjs:64) mean
    // idx 17 (when=1749081600000) is < the ceiling row (1779120000000), so the
    // migrator skips it. After Green re-stamps idx 17 to a value > ceiling, the
    // migrator applies it.
    const db = drizzle(scratchClient);
    await migrate(db, { migrationsFolder: DRIZZLE_DIR });

    // Sentinel: 0017 creates gamification_profiles.school_id (0017_science_school_id.sql:12).
    const sentinelRow = await scratchClient.unsafe(
      `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'gamification_profiles'
           AND column_name = 'school_id'`
    );

    expect(
      sentinelRow.length,
      "After migrate on a ledger ending at 0016 (1779120000000), the sentinel " +
        "column `gamification_profiles.school_id` must exist — that proves 0017 " +
        "was applied. The current journal stamps 0017 at 1749081600000 (< ceiling), " +
        "so the migrator silently skips it (drizzle-orm 0.44.7 strict-`<`). " +
        "Green re-stamps 0017 above the ceiling; the assertion then passes."
    ).toBe(1);
  }, 60_000);
});
