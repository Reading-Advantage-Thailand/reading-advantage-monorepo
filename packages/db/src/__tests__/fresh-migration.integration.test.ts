import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const WORKSPACE_ROOT = resolve(PACKAGE_ROOT, "../..");
const MIGRATION_TAG = "0013_prisma_drizzle_schema_unification";
const MIGRATION_PATH = join(
  PACKAGE_ROOT,
  "drizzle",
  `${MIGRATION_TAG}.sql`,
);
const PG_TEST_URL = process.env.PG_TEST_URL;
const DESCRIBE = PG_TEST_URL ? describe : describe.skip;

interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Runs a database TypeScript entrypoint with the disposable direct connection.
 * @param args The tsx arguments to execute from the database package.
 * @param databaseUrl The disposable database connection URL.
 * @returns The child process exit status and captured output.
 */
function runDatabaseScript(
  args: readonly string[],
  databaseUrl: string,
): Promise<CommandResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      join(WORKSPACE_ROOT, "node_modules", ".bin", "tsx"),
      [...args],
      {
        cwd: PACKAGE_ROOT,
        env: {
          ...process.env,
          CI: "true",
          DATABASE_URL: databaseUrl,
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

/**
 * Replaces the database path while preserving credentials, host, port, and query parameters.
 * @param baseUrl The PostgreSQL administrator URL.
 * @param databaseName The database name to place in the URL path.
 * @returns A connection URL targeting the requested database.
 */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

let adminClient: ReturnType<typeof postgres> | undefined;
let databaseClient: ReturnType<typeof postgres> | undefined;
let scratchDatabaseName = "";
let scratchDatabaseUrl = "";

DESCRIBE("fresh PostgreSQL migration path", () => {
  beforeAll(async () => {
    if (!PG_TEST_URL) return;
    scratchDatabaseName =
      `fresh_migration_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    adminClient = postgres(PG_TEST_URL, { max: 1 });
    await adminClient.unsafe(`CREATE DATABASE "${scratchDatabaseName}"`);
    scratchDatabaseUrl = withDatabase(PG_TEST_URL, scratchDatabaseName);
    databaseClient = postgres(scratchDatabaseUrl, { max: 1 });
  }, 30_000);

  afterAll(async () => {
    await databaseClient?.end({ timeout: 5 });
    if (adminClient && scratchDatabaseName) {
      await adminClient.unsafe(
        `DROP DATABASE IF EXISTS "${scratchDatabaseName}" WITH (FORCE)`,
      );
    }
    await adminClient?.end({ timeout: 5 });
  }, 30_000);

  it("serializes two runners on an empty database, then passes the doctor", async () => {
    if (!databaseClient) {
      throw new Error("Disposable PostgreSQL client was not initialized.");
    }

    const migrateResults = await Promise.all([
      runDatabaseScript(["scripts/migrate.ts"], scratchDatabaseUrl),
      runDatabaseScript(["scripts/migrate.ts"], scratchDatabaseUrl),
    ]);
    for (const migrateResult of migrateResults) {
      expect(
        migrateResult.status,
        `Concurrent fresh migration failed. stdout=${migrateResult.stdout} stderr=${migrateResult.stderr}`,
      ).toBe(0);
    }

    const journal = JSON.parse(
      await readFile(join(PACKAGE_ROOT, "drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ tag: string; when: number }> };
    const [ledgerSummary] = await databaseClient.unsafe<
      Array<{ duplicate_timestamps: number; ledger_rows: number }>
    >(
      `SELECT count(*)::integer AS ledger_rows,
              (count(*) - count(DISTINCT created_at))::integer AS duplicate_timestamps
         FROM drizzle.__drizzle_migrations`,
    );
    expect(ledgerSummary).toEqual({
      duplicate_timestamps: 0,
      ledger_rows: journal.entries.length,
    });

    const [constraint] = await databaseClient.unsafe<
      Array<{ constraint_name: string }>
    >(
      `SELECT constraint_name
         FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'classrooms'
          AND constraint_name = 'classrooms_class_code_unique'`,
    );
    expect(constraint?.constraint_name).toBe("classrooms_class_code_unique");

    const [marketingTable] = await databaseClient.unsafe<
      Array<{ table_name: string }>
    >(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'campaigns'`,
    );
    expect(marketingTable?.table_name).toBe("campaigns");

    const migrationSql = await readFile(MIGRATION_PATH, "utf8");
    const expectedHash = createHash("sha256").update(migrationSql).digest("hex");
    const migrationEntry = journal.entries.find(
      (entry) => entry.tag === MIGRATION_TAG,
    );
    if (!migrationEntry) {
      throw new Error(`Migration journal is missing ${MIGRATION_TAG}.`);
    }
    const [ledgerRow] = await databaseClient.unsafe<Array<{ hash: string }>>(
      `SELECT hash
         FROM drizzle.__drizzle_migrations
        WHERE created_at = $1`,
      [migrationEntry.when],
    );
    expect(ledgerRow?.hash).toBe(expectedHash);

    const doctorResult = await runDatabaseScript(
      [
        "scripts/migration-ledger-doctor.ts",
        "--check",
        "--required-migration",
        "0021_sales_advantage",
      ],
      scratchDatabaseUrl,
    );
    expect(
      doctorResult.status,
      `Doctor rejected fresh migration. stdout=${doctorResult.stdout} stderr=${doctorResult.stderr}`,
    ).toBe(0);
  }, 180_000);
});
