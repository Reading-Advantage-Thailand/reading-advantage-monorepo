/**
 * Phase 2 — Task 6 (Red): ledger-doctor integration tests for FR-3.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-3.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §1, §5, §7.
 *
 * Spawns `scripts/migration-ledger-doctor.ts` against a scratch DB and asserts
 * the exit codes specified by the sentinel contract (sent-inels.ts:
 *   0 = clean
 *   1 = divergence
 *   2 = connection / config error
 * ).
 *
 * On master (2026-06-12) the doctor is a Phase-1 stub that exits 2
 * unconditionally ("not yet implemented"). Every assertion here is therefore
 * Red for the *intended* reason — the script does not yet honor the contract.
 *
 * Per test-strategy §7 (Live-Proof Plan), the targeted Red command is:
 *   CI=true PG_TEST_URL=postgres://... pnpm vitest run src/__tests__/ledger-doctor.test.ts
 *
 * Requires docker compose `postgres` (or a local Postgres on :5432) reachable
 * via `PG_TEST_URL`. The whole describe block skips when PG_TEST_URL is not
 * set so the file does not hang on missing infrastructure.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const DOCTOR_SCRIPT = join(PACKAGE_ROOT, "scripts/migration-ledger-doctor.ts");

const PG_TEST_URL = process.env.PG_TEST_URL;
const DESCRIBE = PG_TEST_URL ? describe : describe.skip;

interface DoctorResult {
  status: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
}

/**
 * Spawns the doctor script with the given env. Resolves with the result;
 * rejects on spawn error only. The doctor is expected to be non-zero on
 * contract failures — that is the assertion, not a test failure.
 */
function runDoctor(env: Record<string, string>, args: string[]): Promise<DoctorResult> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(
      "pnpm",
      ["exec", "tsx", DOCTOR_SCRIPT, ...args],
      {
        cwd: PACKAGE_ROOT,
        env: { ...process.env, ...env, CI: "true" },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectP(new Error(`doctor timed out after 30s. stdout=${stdout} stderr=${stderr}`));
    }, 30_000);
    child.on("error", (err) => {
      clearTimeout(killTimer);
      rejectP(err);
    });
    child.on("exit", (status, signal) => {
      clearTimeout(killTimer);
      resolveP({ status, stdout, stderr, signal });
    });
  });
}

let scratchClient: ReturnType<typeof postgres>;
let scratchDbName: string;
let scratchBaseUrl: string;

DESCRIBE("ledger-doctor — FR-3 contract (exit codes 0 / 1 / 2)", () => {
  beforeAll(async () => {
    if (!PG_TEST_URL) return;
    scratchDbName = `doctor_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const adminUrl = new URL(PG_TEST_URL);
    await postgres(PG_TEST_URL, { max: 1 })`CREATE DATABASE ${postgres.unsafe(scratchDbName)}`;
    scratchBaseUrl = new URL(PG_TEST_URL).toString().replace(/\/[^/]+(\?.*)?$/, `/${scratchDbName}$1`);
    scratchClient = postgres(scratchBaseUrl, { max: 1 });

    // Apply every migration so the DB is "clean" (ledger matches journal,
    // schema matches sentinels). The doctor should exit 0 in this state.
    const db = drizzle(scratchClient);
    await migrate(db, { migrationsFolder: DRIZZLE_DIR });
  }, 120_000);

  afterAll(async () => {
    if (!scratchClient) return;
    try {
      await scratchClient.unsafe(`DROP DATABASE IF EXISTS ${scratchDbName}`);
    } catch {
      // best-effort
    }
    await scratchClient.end();
  }, 30_000);

  it("clean DB: --check exits 0 (currently Red — stub exits 2)", async () => {
    const result = await runDoctor(
      { DIRECT_DATABASE_URL: scratchBaseUrl },
      ["--check"]
    );
    expect(
      result.status,
      `doctor --check on a fully-migrated scratch DB must exit 0 (clean). ` +
        `Got ${result.status} with stdout=${result.stdout} stderr=${result.stderr}. ` +
        `On master the doctor is a Phase-1 stub that exits 2 unconditionally — ` +
        `Green implements the report matrix in Task 9.`
    ).toBe(0);
  }, 60_000);

  it("hand-patched simulation: drop a ledger row for an applied migration; --check exits 1 (currently Red — stub exits 2)", async () => {
    // Hand-patch: delete the ledger row for idx 14 (the one that shipped
    // users.license_id in the June 8 incident per spec §FR-3). Schema is
    // present (already migrated), so the doctor must flag the divergence.
    await scratchClient.unsafe(`
      DELETE FROM drizzle.__drizzle_migrations
       WHERE created_at IN (
         SELECT created_at FROM drizzle.__drizzle_migrations
          ORDER BY created_at DESC OFFSET 4 LIMIT 1
       )
    `);

    const result = await runDoctor(
      { DIRECT_DATABASE_URL: scratchBaseUrl },
      ["--check"]
    );
    expect(
      result.status,
      `doctor --check on a hand-patched DB (ledger row deleted, schema present) ` +
        `must exit 1 (divergence). Got ${result.status} with stderr=${result.stderr}. ` +
        `The doctor must detect the missing ledger row and surface it.`
    ).toBe(1);
  }, 60_000);

  it("hand-patched simulation: --repair inserts the missing row, exits 0, then --check exits 0 (currently Red — stub exits 2)", async () => {
    const repair = await runDoctor(
      { DIRECT_DATABASE_URL: scratchBaseUrl },
      ["--repair"]
    );
    expect(
      repair.status,
      `doctor --repair must insert missing ledger rows and exit 0. ` +
        `Got ${repair.status} with stderr=${repair.stderr}.`
    ).toBe(0);

    // After repair, --check should be clean.
    const check = await runDoctor(
      { DIRECT_DATABASE_URL: scratchBaseUrl },
      ["--check"]
    );
    expect(
      check.status,
      `doctor --check after --repair must exit 0. ` +
        `Got ${check.status} with stderr=${check.stderr}.`
    ).toBe(0);
  }, 90_000);
});
