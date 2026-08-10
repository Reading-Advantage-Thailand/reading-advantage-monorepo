// @vitest-environment node
/**
 * Regression contract for the Codecamp 0049 production-ledger gap.
 *
 * Official 0047/0048 entries precede the new 0049 repair. A high-watermark-only
 * runner can still silently accept a wrong, duplicate, or missing historical
 * ledger row, so this suite requires a fail-closed normal runner and an exact
 * required-migration doctor gate.
 *
 * Run the full real-PostgreSQL proof with a Podman-provisioned disposable
 * database URL:
 * `CI=true PG_TEST_URL=postgres://... pnpm --filter @reading-advantage/db exec vitest run src/__tests__/codecamp-0049-historical-ledger-gap.test.ts`
 */

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { readPostgresMigrationFiles } from "../migration-files.js";
import { migrateProductDatabase } from "../migration.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");
const DOCTOR_SCRIPT = join(PACKAGE_ROOT, "scripts/migration-ledger-doctor.ts");
const TARGET_TAG = "0049_codecamp_exercise_quiz_repair";
const LAST_OFFICIAL_LEDGER_TIMESTAMP = 1785672462951;
const PG_TEST_URL = process.env.PG_TEST_URL;
const describeRealPostgres = PG_TEST_URL ? describe : describe.skip;

/** Captures a spawned migration-doctor process result. */
interface DoctorResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Captures the target journal metadata required to repair the ledger gap. */
interface TargetMigrationMetadata {
  readonly hash: string;
  readonly when: number;
}

/** Represents the journal fields needed to resolve a migration tag. */
interface MigrationJournal {
  readonly entries: ReadonlyArray<{
    readonly tag: string;
    readonly when: number;
  }>;
}

/**
 * Returns a URL targeting a named database while preserving its connection details.
 * @param baseUrl The PostgreSQL administrator URL.
 * @param databaseName The disposable database name.
 * @returns A connection URL for the named database.
 */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Reads and verifies the immutable journal metadata for the Codecamp repair.
 * @returns The timestamp and SHA-256 hash to record in the ledger.
 * @throws When the checked-in migration no longer matches the frozen contract.
 */
function readTargetMigrationMetadata(): TargetMigrationMetadata {
  const journal = JSON.parse(
    readFileSync(JOURNAL_PATH, "utf8"),
  ) as MigrationJournal;
  const journalEntry = journal.entries.find(
    (entry) => entry.tag === TARGET_TAG,
  );
  if (!journalEntry) {
    throw new Error(`Migration journal is missing ${TARGET_TAG}.`);
  }
  expect(journalEntry.when).toBeGreaterThan(LAST_OFFICIAL_LEDGER_TIMESTAMP);
  const migrations = readPostgresMigrationFiles({
    migrationsFolder: DRIZZLE_DIR,
  });
  const target = migrations.find(
    (migration) => migration.folderMillis === journalEntry.when,
  );
  if (!target) {
    throw new Error(`Migration journal is missing ${TARGET_TAG}.`);
  }
  const sourceHash = createHash("sha256")
    .update(readFileSync(join(DRIZZLE_DIR, `${TARGET_TAG}.sql`), "utf8"))
    .digest("hex");
  expect(sourceHash).toBe(target.hash);
  return { hash: target.hash, when: target.folderMillis };
}

/**
 * Returns ledger rows that are later than the target migration but not in its journal.
 * @param target The exact 0049 journal metadata.
 * @returns Two unrelated high-watermark rows.
 */
function laterUnknownLedgerRows(
  target: TargetMigrationMetadata,
): ReadonlyArray<{ readonly hash: string; readonly createdAt: number }> {
  return [
    {
      hash: "unknown-production-ledger-row-one",
      createdAt: target.when + 1,
    },
    {
      hash: "unknown-production-ledger-row-two",
      createdAt: target.when + 2,
    },
  ];
}

/**
 * Resolves one of the verified journal entries before 0049.
 * @param target The exact 0049 journal metadata.
 * @param offset The number of entries before 0049 to select.
 * @returns The selected predecessor's exact hash and timestamp.
 * @throws When the journal has insufficient prior entries.
 */
function readPrecedingMigrationMetadata(
  target: TargetMigrationMetadata,
  offset: number,
): TargetMigrationMetadata {
  const migrations = readPostgresMigrationFiles({
    migrationsFolder: DRIZZLE_DIR,
  });
  const targetIndex = migrations.findIndex(
    (migration) => migration.folderMillis === target.when,
  );
  const preceding = migrations[targetIndex - offset];
  if (!preceding) {
    throw new Error(
      `Migration journal has no entry ${offset} before ${TARGET_TAG}.`,
    );
  }
  return { hash: preceding.hash, when: preceding.folderMillis };
}

/**
 * Creates the narrow Codecamp schema required for 0049's transactional SQL.
 * @param client The disposable PostgreSQL client.
 * @param includeQuizQuestions Whether to create the quiz child table.
 * @returns Completion after the fixture schema is ready.
 */
async function createCodecampFixtureSchema(
  client: ReturnType<typeof postgres>,
  includeQuizQuestions = true,
): Promise<void> {
  await client.unsafe(`
    CREATE TYPE codecamp_lesson_type AS ENUM ('theory', 'exercise', 'quiz');
    CREATE TABLE codecamp_modules (
      id uuid PRIMARY KEY,
      slug text NOT NULL UNIQUE
    );
    CREATE TABLE codecamp_lessons (
      id uuid PRIMARY KEY,
      module_id uuid NOT NULL REFERENCES codecamp_modules(id),
      title text NOT NULL,
      "order" integer NOT NULL,
      type codecamp_lesson_type NOT NULL
    );
    CREATE TABLE codecamp_exercises (
      id uuid PRIMARY KEY,
      lesson_id uuid NOT NULL REFERENCES codecamp_lessons(id)
    );
  `);
  if (includeQuizQuestions) {
    await client.unsafe(`
      CREATE TABLE codecamp_quiz_questions (
        id uuid PRIMARY KEY,
        lesson_id uuid NOT NULL REFERENCES codecamp_lessons(id)
      );
    `);
  }
}

/**
 * Creates the Drizzle ledger table used by the migration runner and doctor.
 * @param client The disposable PostgreSQL client.
 * @returns Completion after the empty ledger exists.
 */
async function createMigrationLedger(
  client: ReturnType<typeof postgres>,
): Promise<void> {
  await client.unsafe(`
    CREATE SCHEMA drizzle;
    CREATE TABLE drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `);
}

/**
 * Seeds every verified journal entry before 0049 with its exact ledger hash.
 * @param client The disposable PostgreSQL client.
 * @param target The exact 0049 journal metadata.
 * @returns Completion after the pre-0049 ledger is present.
 */
async function seedVerifiedLedgerBefore0049(
  client: ReturnType<typeof postgres>,
  target: TargetMigrationMetadata,
): Promise<void> {
  await createMigrationLedger(client);
  const migrations = readPostgresMigrationFiles({
    migrationsFolder: DRIZZLE_DIR,
  });
  const targetIndex = migrations.findIndex(
    (migration) => migration.folderMillis === target.when,
  );
  if (targetIndex < 0) {
    throw new Error(`Migration journal is missing ${TARGET_TAG}.`);
  }
  for (const migration of migrations.slice(0, targetIndex)) {
    await client.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       VALUES ($1, $2)`,
      [migration.hash, migration.folderMillis],
    );
  }
}

/**
 * Seeds only the unknown higher timestamp rows used to prove doctor behavior.
 * @param client The disposable PostgreSQL client.
 * @param target The exact 0049 journal metadata.
 * @returns Completion after the high-watermark-only ledger is present.
 */
async function seedUnknownLaterLedgerRows(
  client: ReturnType<typeof postgres>,
  target: TargetMigrationMetadata,
): Promise<void> {
  await createMigrationLedger(client);
  for (const row of laterUnknownLedgerRows(target)) {
    await client.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       VALUES ($1, $2)`,
      [row.hash, row.createdAt],
    );
  }
}

/**
 * Adds a ledger row at 0049's timestamp, including malformed duplicates when requested.
 * @param client The disposable PostgreSQL client.
 * @param target The exact 0049 journal metadata.
 * @param hashes The hash values to insert at the exact 0049 timestamp.
 * @returns Completion after the requested target rows are recorded.
 */
async function seedTargetLedgerRows(
  client: ReturnType<typeof postgres>,
  target: TargetMigrationMetadata,
  hashes: readonly string[],
): Promise<void> {
  for (const hash of hashes) {
    await client.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       VALUES ($1, $2)`,
      [hash, target.when],
    );
  }
}

/**
 * Reports whether 0049's unique-order sentinel exists.
 * @param client The disposable PostgreSQL client.
 * @returns Whether the exact 0049 sentinel constraint exists.
 */
async function has0049Sentinel(
  client: ReturnType<typeof postgres>,
): Promise<boolean> {
  const rows = await client.unsafe<Array<{ present: boolean }>>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'codecamp_lessons_module_order_unique'
    ) AS present`,
  );
  return rows[0]?.present === true;
}

/**
 * Installs 0049's sentinel without applying the repair migration.
 * @param client The disposable PostgreSQL client.
 * @returns Completion after the exact unique constraint exists.
 */
async function create0049Sentinel(
  client: ReturnType<typeof postgres>,
): Promise<void> {
  await client.unsafe(`
    ALTER TABLE codecamp_lessons
      ADD CONSTRAINT codecamp_lessons_module_order_unique
      UNIQUE (module_id, "order")
  `);
}

/**
 * Reads all exact 0049 ledger rows in stable identity order.
 * @param client The disposable PostgreSQL client.
 * @param target The exact 0049 journal metadata.
 * @returns The hash/timestamp rows recorded for 0049.
 */
async function read0049LedgerRows(
  client: ReturnType<typeof postgres>,
  target: TargetMigrationMetadata,
): Promise<Array<{ hash: string; createdAt: string }>> {
  return client.unsafe<Array<{ hash: string; createdAt: string }>>(
    `SELECT hash, created_at::text AS "createdAt"
     FROM drizzle.__drizzle_migrations
     WHERE created_at = $1
     ORDER BY id`,
    [target.when],
  );
}

/**
 * Runs migration-ledger-doctor against the disposable database.
 * @param databaseUrl The disposable direct PostgreSQL URL.
 * @returns The process exit status and captured output.
 */
function runDoctor(databaseUrl: string): Promise<DoctorResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "tsx",
        DOCTOR_SCRIPT,
        "--check",
        "--required-migration",
        TARGET_TAG,
      ],
      {
        cwd: PACKAGE_ROOT,
        env: {
          ...process.env,
          CI: "true",
          DIRECT_DATABASE_URL: databaseUrl,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("exit", (status) => {
      resolvePromise({ status, stderr, stdout });
    });
  });
}

describe("0049 historical-ledger migration contract", () => {
  it("registers 0049 after the restored official ledger ceiling", () => {
    const target = readTargetMigrationMetadata();
    expect(target.when).toBeGreaterThan(LAST_OFFICIAL_LEDGER_TIMESTAMP);
    expect(target.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

let adminClient: ReturnType<typeof postgres> | undefined;
let scratchClient: ReturnType<typeof postgres> | undefined;
let scratchDatabaseName = "";
let scratchDatabaseUrl = "";

/**
 * Returns the initialized disposable PostgreSQL client for a test.
 * @returns The current scratch database client.
 * @throws When PostgreSQL setup did not complete.
 */
function requireScratchClient(): ReturnType<typeof postgres> {
  if (!scratchClient) {
    throw new Error("Disposable PostgreSQL client was not initialized.");
  }
  return scratchClient;
}

describeRealPostgres("0049 historical-ledger gap (real PostgreSQL)", () => {
  beforeAll(async () => {
    if (!PG_TEST_URL) return;
    scratchDatabaseName = `codecamp_0049_ledger_gap_${randomUUID().replaceAll("-", "")}`;
    adminClient = postgres(PG_TEST_URL, { max: 1 });
    await adminClient.unsafe(`CREATE DATABASE "${scratchDatabaseName}"`);
    scratchDatabaseUrl = withDatabase(PG_TEST_URL, scratchDatabaseName);
    scratchClient = postgres(scratchDatabaseUrl, { max: 1 });
  }, 30_000);

  beforeEach(async () => {
    const client = requireScratchClient();
    await client.unsafe(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `);
  });

  afterAll(async () => {
    await scratchClient?.end({ timeout: 5 });
    if (adminClient && scratchDatabaseName) {
      await adminClient.unsafe(
        `DROP DATABASE IF EXISTS "${scratchDatabaseName}" WITH (FORCE)`,
      );
    }
    await adminClient?.end({ timeout: 5 });
  }, 30_000);

  it("applies normal forward 0049 and records its checked-in timestamp and hash", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client);
    await seedVerifiedLedgerBefore0049(client, target);

    await migrateProductDatabase({
      directDatabaseUrl: scratchDatabaseUrl,
      migrationsFolder: DRIZZLE_DIR,
    });

    await expect(has0049Sentinel(client)).resolves.toBe(true);
    await expect(read0049LedgerRows(client, target)).resolves.toEqual([
      { hash: target.hash, createdAt: String(target.when) },
    ]);
  }, 60_000);

  it("rolls back the normal 0049 ledger write and sentinel when its SQL rejects", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client, false);
    await client.unsafe(`
      INSERT INTO codecamp_modules (id, slug)
      VALUES ('10000000-0000-4000-8000-000000000001', 'trpc-server-actions')
    `);
    await seedVerifiedLedgerBefore0049(client, target);

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: scratchDatabaseUrl,
        migrationsFolder: DRIZZLE_DIR,
      }),
    ).rejects.toThrow();
    await expect(has0049Sentinel(client)).resolves.toBe(false);
    await expect(read0049LedgerRows(client, target)).resolves.toEqual([]);
  }, 60_000);

  it("fails closed when a historical entry is absent below the verified 0048 high-watermark", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    const missingHistorical = readPrecedingMigrationMetadata(target, 2);
    await createCodecampFixtureSchema(client);
    await seedVerifiedLedgerBefore0049(client, target);
    await client.unsafe(
      `DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1`,
      [missingHistorical.when],
    );

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: scratchDatabaseUrl,
        migrationsFolder: DRIZZLE_DIR,
      }),
    ).rejects.toThrow(/historical|ledger|missing/i);
    await expect(read0049LedgerRows(client, target)).resolves.toEqual([]);
  }, 60_000);

  it("fails closed when a known pre-0049 timestamp has the wrong hash", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    const predecessor = readPrecedingMigrationMetadata(target, 1);
    await createCodecampFixtureSchema(client);
    await seedVerifiedLedgerBefore0049(client, target);
    await client.unsafe(
      `UPDATE drizzle.__drizzle_migrations
       SET hash = 'wrong-pre-0049-hash'
       WHERE created_at = $1`,
      [predecessor.when],
    );

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: scratchDatabaseUrl,
        migrationsFolder: DRIZZLE_DIR,
      }),
    ).rejects.toThrow(/hash|ledger/i);
    await expect(read0049LedgerRows(client, target)).resolves.toEqual([]);
  }, 60_000);

  it("fails closed when a known pre-0049 timestamp has duplicate ledger rows", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    const predecessor = readPrecedingMigrationMetadata(target, 1);
    await createCodecampFixtureSchema(client);
    await seedVerifiedLedgerBefore0049(client, target);
    await seedTargetLedgerRows(client, predecessor, [predecessor.hash]);

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: scratchDatabaseUrl,
        migrationsFolder: DRIZZLE_DIR,
      }),
    ).rejects.toThrow(/duplicate|ledger/i);
    await expect(read0049LedgerRows(client, target)).resolves.toEqual([]);
  }, 60_000);

  it("makes the doctor reject a missing exact 0049 row even when later unknown timestamps exist", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client);
    await seedUnknownLaterLedgerRows(client, target);

    const result = await runDoctor(scratchDatabaseUrl);
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toMatch(/0049|required migration/i);
  }, 60_000);

  it("makes the doctor reject a wrong exact 0049 hash even when its sentinel exists", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client);
    await create0049Sentinel(client);
    await seedUnknownLaterLedgerRows(client, target);
    await seedTargetLedgerRows(client, target, ["wrong-0049-hash"]);

    const result = await runDoctor(scratchDatabaseUrl);
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toMatch(/0049|hash|required migration/i);
  }, 60_000);

  it("makes the doctor reject duplicate rows at the exact 0049 timestamp even when their hashes match", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client);
    await create0049Sentinel(client);
    await seedUnknownLaterLedgerRows(client, target);
    await seedTargetLedgerRows(client, target, [target.hash, target.hash]);

    const result = await runDoctor(scratchDatabaseUrl);
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toMatch(/0049|duplicate|required migration/i);
  }, 60_000);

  it("makes the doctor reject an exact 0049 row when its sentinel is absent", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client);
    await seedUnknownLaterLedgerRows(client, target);
    await seedTargetLedgerRows(client, target, [target.hash]);

    const result = await runDoctor(scratchDatabaseUrl);
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toMatch(/0049|schema missing|divergence/i);
  }, 60_000);

  it("accepts exactly one matching 0049 ledger row only when its sentinel exists", async () => {
    const client = requireScratchClient();
    const target = readTargetMigrationMetadata();
    await createCodecampFixtureSchema(client);
    await create0049Sentinel(client);
    await seedUnknownLaterLedgerRows(client, target);
    await seedTargetLedgerRows(client, target, [target.hash]);

    const result = await runDoctor(scratchDatabaseUrl);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toMatch(/Required migration gate OK/i);
  }, 60_000);
});
