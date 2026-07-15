import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

interface DrizzleJournalEntry {
  readonly idx: number;
  readonly when: number;
  readonly tag: string;
  readonly breakpoints: boolean;
}

interface DrizzleJournal {
  readonly version: string;
  readonly dialect: string;
  readonly entries: readonly DrizzleJournalEntry[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../..");
const COMPOSE_FILE = join(REPOSITORY_ROOT, "docker-compose.yml");
const MIGRATIONS_FOLDER = join(
  PACKAGE_ROOT,
  "company-identity",
  "drizzle"
);
const MIGRATION_MODULE = new URL("../migration.js", import.meta.url).href;
const ROLLBACK_SENTINEL_ID = "00000000-0000-4000-8000-000000000201";
const ROLLBACK_ACCOUNT_SENTINEL_ID =
  "00000000-0000-4000-8000-000000000202";

async function loadMigrationModule(): Promise<CompanyIdentityMigrationModule> {
  let loaded: Record<string, unknown>;

  try {
    loaded = (await import(MIGRATION_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "The prior-prefix backup succeeded, but the current migrateCompanyIdentity module is absent.",
      { cause: error }
    );
  }

  if (typeof loaded.migrateCompanyIdentity !== "function") {
    throw new Error(
      "The prior-prefix backup succeeded, but migration.ts does not export migrateCompanyIdentity."
    );
  }
  return loaded as unknown as CompanyIdentityMigrationModule;
}

async function readIdentityJournal(): Promise<DrizzleJournal> {
  try {
    const rawJournal = await readFile(
      join(MIGRATIONS_FOLDER, "meta", "_journal.json"),
      "utf8"
    );
    const journal = JSON.parse(rawJournal) as DrizzleJournal;
    if (!Array.isArray(journal.entries) || journal.entries.length < 2) {
      throw new Error(
        "Rollback proof requires at least two checked-in identity migrations."
      );
    }
    return journal;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Rollback proof")) {
      throw error;
    }
    throw new Error(
      "PostgreSQL 16 scratch preflight passed, but the checked-in company-identity migration journal is absent.",
      { cause: error }
    );
  }
}

async function stagePriorMigrationPrefix(
  journal: DrizzleJournal
): Promise<string> {
  const stagedFolder = await mkdtemp(
    join(tmpdir(), "company-identity-rollback-prefix-")
  );
  try {
    const stagedMeta = join(stagedFolder, "meta");
    await mkdir(stagedMeta, { recursive: true });
    const priorEntries = journal.entries.slice(0, -1);

    await writeFile(
      join(stagedMeta, "_journal.json"),
      `${JSON.stringify({ ...journal, entries: priorEntries }, null, 2)}\n`,
      "utf8"
    );
    for (const entry of priorEntries) {
      const sqlFile = `${entry.tag}.sql`;
      await copyFile(
        join(MIGRATIONS_FOLDER, sqlFile),
        join(stagedFolder, sqlFile)
      );
    }
    return stagedFolder;
  } catch (error) {
    await rm(stagedFolder, { recursive: true, force: true });
    throw error;
  }
}

async function schemaFingerprint(
  sql: ReturnType<typeof postgres>
): Promise<string> {
  const columns = await sql<
    {
      table_schema: string;
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }[]
  >`
    SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema IN ('public', 'drizzle')
    ORDER BY table_schema, table_name, ordinal_position
  `;
  const constraints = await sql<
    { schema_name: string; table_name: string; constraint_name: string; definition: string }[]
  >`
    SELECT namespace.nspname AS schema_name,
           relation.relname AS table_name,
           constraint.conname AS constraint_name,
           pg_get_constraintdef(constraint.oid, true) AS definition
    FROM pg_constraint AS constraint
    JOIN pg_class AS relation ON relation.oid = constraint.conrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
    ORDER BY namespace.nspname, relation.relname, constraint.conname
  `;
  const indexes = await sql<
    { schema_name: string; table_name: string; index_name: string; definition: string }[]
  >`
    SELECT schemaname AS schema_name,
           tablename AS table_name,
           indexname AS index_name,
           indexdef AS definition
    FROM pg_indexes
    WHERE schemaname IN ('public', 'drizzle')
    ORDER BY schemaname, tablename, indexname
  `;
  const enums = await sql<
    { schema_name: string; enum_name: string; enum_value: string; sort_order: number }[]
  >`
    SELECT namespace.nspname AS schema_name,
           type.typname AS enum_name,
           enum.enumlabel AS enum_value,
           enum.enumsortorder AS sort_order
    FROM pg_type AS type
    JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
    JOIN pg_enum AS enum ON enum.enumtypid = type.oid
    WHERE namespace.nspname IN ('public', 'drizzle')
    ORDER BY namespace.nspname, type.typname, enum.enumsortorder
  `;
  const triggers = await sql<
    { schema_name: string; table_name: string; trigger_name: string; definition: string }[]
  >`
    SELECT namespace.nspname AS schema_name,
           relation.relname AS table_name,
           trigger.tgname AS trigger_name,
           pg_get_triggerdef(trigger.oid, true) AS definition
    FROM pg_trigger AS trigger
    JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
      AND NOT trigger.tgisinternal
    ORDER BY namespace.nspname, relation.relname, trigger.tgname
  `;
  const privileges = await sql<
    { object_type: string; object_name: string; owner_name: string; acl: string }[]
  >`
    SELECT 'schema' AS object_type,
           namespace.nspname AS object_name,
           pg_get_userbyid(namespace.nspowner) AS owner_name,
           COALESCE(namespace.nspacl::text, '') AS acl
    FROM pg_namespace AS namespace
    WHERE namespace.nspname IN ('public', 'drizzle')
    UNION ALL
    SELECT 'relation' AS object_type,
           namespace.nspname || '.' || relation.relname AS object_name,
           pg_get_userbyid(relation.relowner) AS owner_name,
           COALESCE(relation.relacl::text, '') AS acl
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
      AND relation.relkind IN ('r', 'p', 'S', 'v', 'm')
    ORDER BY object_type, object_name
  `;
  return createHash("sha256")
    .update(
      JSON.stringify({
        columns,
        constraints,
        indexes,
        enums,
        triggers,
        privileges,
      })
    )
    .digest("hex");
}

async function readLedger(sql: ReturnType<typeof postgres>) {
  return sql<{ id: number; hash: string; created_at: string }[]>`
    SELECT id, hash, created_at::text
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `;
}

function runPostgresTool(
  args: readonly string[],
  input?: Buffer
): Buffer {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      COMPOSE_FILE,
      "exec",
      "-T",
      "postgres",
      ...args,
    ],
    {
      cwd: REPOSITORY_ROOT,
      input,
      maxBuffer: 64 * 1024 * 1024,
    }
  );

  if (result.error || result.status !== 0) {
    const stderr = result.stderr?.toString("utf8").trim();
    throw new Error(
      `PostgreSQL backup tool ${args[0] ?? "unknown"} failed with status ${result.status ?? "spawn-error"}: ${stderr ?? "no diagnostics"}`,
      { cause: result.error }
    );
  }
  return result.stdout;
}

describe("company identity rollback rehearsal", () => {
  it(
    "restores a real prior-prefix backup after applying the current upgrade",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (source) => {
        const [probe] = await source.adminSql<
          { database_name: string; server_version_num: string }[]
        >`
          SELECT current_database() AS database_name,
                 current_setting('server_version_num') AS server_version_num
        `;
        expect(probe?.database_name).toBe(source.databaseName);
        expect(Number(probe?.server_version_num)).toBeGreaterThanOrEqual(160_000);
        expect(Number(probe?.server_version_num)).toBeLessThan(170_000);

        const journal = await readIdentityJournal();
        const stagedPrefix = await stagePriorMigrationPrefix(journal);
        try {
          const prefixSql = postgres(source.directDatabaseUrl, {
            max: 1,
            prepare: false,
          });
          try {
            await migrate(drizzle(prefixSql), {
              migrationsFolder: stagedPrefix,
            });
          } finally {
            await prefixSql.end({ timeout: 5 });
          }

          await source.adminSql`
            INSERT INTO company_organizations (
              id, stable_key, display_name, organization_type, status
            ) VALUES (
              ${ROLLBACK_SENTINEL_ID},
              'rollback-sentinel',
              'Rollback Sentinel Organization',
              'INTERNAL_COMPANY',
              'ACTIVE'
            )
          `;
          await source.adminSql`
            INSERT INTO company_accounts (
              id, username, normalized_username, normalization_version,
              display_name, status, auth_version
            ) VALUES (
              ${ROLLBACK_ACCOUNT_SENTINEL_ID},
              'rollback-sentinel',
              'rollback-sentinel',
              1,
              'Rollback Sentinel Account',
              'ACTIVE',
              1
            )
          `;

          const priorLedger = await readLedger(source.adminSql);
          const priorFingerprint = await schemaFingerprint(source.adminSql);
          const backup = runPostgresTool([
            "pg_dump",
            "-U",
            "postgres",
            "--format=custom",
            "--dbname",
            source.databaseName,
          ]);
          expect(backup.byteLength).toBeGreaterThan(0);

          const migration = await loadMigrationModule();
          await migration.migrateCompanyIdentity({
            directDatabaseUrl: source.directDatabaseUrl,
          });
          expect((await readLedger(source.adminSql)).length).toBeGreaterThan(
            priorLedger.length
          );
          expect(await schemaFingerprint(source.adminSql)).not.toBe(
            priorFingerprint
          );

          await withCompanyIdentityScratchDatabase(async (restored) => {
            runPostgresTool(
              [
                "pg_restore",
                "-U",
                "postgres",
                "--exit-on-error",
                "--dbname",
                restored.databaseName,
              ],
              backup
            );

            expect(await readLedger(restored.adminSql)).toEqual(priorLedger);
            expect(await schemaFingerprint(restored.adminSql)).toBe(
              priorFingerprint
            );
            const [sentinel] = await restored.adminSql<{ id: string }[]>`
              SELECT id
              FROM company_organizations
              WHERE id = ${ROLLBACK_SENTINEL_ID}
            `;
            expect(sentinel?.id).toBe(ROLLBACK_SENTINEL_ID);
            const [accountSentinel] = await restored.adminSql<
              {
                id: string;
                username: string;
                normalized_username: string;
              }[]
            >`
              SELECT id, username, normalized_username
              FROM company_accounts
              WHERE id = ${ROLLBACK_ACCOUNT_SENTINEL_ID}
            `;
            expect(accountSentinel).toEqual({
              id: ROLLBACK_ACCOUNT_SENTINEL_ID,
              username: "rollback-sentinel",
              normalized_username: "rollback-sentinel",
            });
          });
        } finally {
          await rm(stagedPrefix, { recursive: true, force: true });
        }
      });
    }
  );
});
