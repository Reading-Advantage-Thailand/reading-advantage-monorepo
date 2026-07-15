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
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

interface CompanyIdentityDoctorSentinel {
  readonly migrationTag: string;
  readonly kind: "table" | "column";
  readonly schemaName: string;
  readonly tableName: string;
  readonly columnName?: string;
}

interface CompanyIdentityDoctorReport {
  readonly clean: boolean;
  readonly issues: readonly {
    readonly code: string;
    readonly migrationTag: string;
  }[];
  readonly sentinels: readonly CompanyIdentityDoctorSentinel[];
}

interface CompanyIdentityDoctorModule {
  inspectCompanyIdentityDatabase(input: {
    directDatabaseUrl: string;
  }): Promise<CompanyIdentityDoctorReport>;
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
const MIGRATIONS_FOLDER = join(
  PACKAGE_ROOT,
  "company-identity",
  "drizzle"
);
const MIGRATION_MODULE = new URL("../migration.js", import.meta.url).href;
const DOCTOR_MODULE = new URL("../doctor.js", import.meta.url).href;
const SENTINEL_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000101";
const SENTINEL_ACCOUNT_ID = "00000000-0000-4000-8000-000000000102";

async function loadMigrationModule(): Promise<CompanyIdentityMigrationModule> {
  let loaded: Record<string, unknown>;

  try {
    loaded = (await import(MIGRATION_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "The checked-in prior identity migration prefix applied, but the current migrateCompanyIdentity module is absent.",
      { cause: error }
    );
  }

  if (typeof loaded.migrateCompanyIdentity !== "function") {
    throw new Error(
      "The checked-in prior identity migration prefix applied, but migration.ts does not export migrateCompanyIdentity."
    );
  }

  return loaded as unknown as CompanyIdentityMigrationModule;
}

async function loadDoctorModule(): Promise<CompanyIdentityDoctorModule> {
  let loaded: Record<string, unknown>;

  try {
    loaded = (await import(DOCTOR_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "The current identity migration applied, but the company-identity doctor module is absent.",
      { cause: error }
    );
  }

  if (typeof loaded.inspectCompanyIdentityDatabase !== "function") {
    throw new Error(
      "doctor.ts must export inspectCompanyIdentityDatabase after the current identity migration applies."
    );
  }
  return loaded as unknown as CompanyIdentityDoctorModule;
}

function quoteCatalogIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error("Doctor returned an unsafe catalog sentinel identifier.");
  }
  return `"${identifier}"`;
}

async function renameDoctorSentinel(
  sql: ReturnType<typeof postgres>,
  sentinel: CompanyIdentityDoctorSentinel,
  sourceName: string,
  targetName: string
): Promise<void> {
  const schemaName = quoteCatalogIdentifier(sentinel.schemaName);
  const tableName = quoteCatalogIdentifier(sentinel.tableName);
  const sourceIdentifier = quoteCatalogIdentifier(sourceName);
  const targetIdentifier = quoteCatalogIdentifier(targetName);

  if (sentinel.kind === "table") {
    await sql.unsafe(
      `ALTER TABLE ${schemaName}.${sourceIdentifier} RENAME TO ${targetIdentifier}`
    );
    return;
  }

  await sql.unsafe(
    `ALTER TABLE ${schemaName}.${tableName} RENAME COLUMN ${sourceIdentifier} TO ${targetIdentifier}`
  );
}

async function readIdentityJournal(): Promise<DrizzleJournal> {
  const journalPath = join(MIGRATIONS_FOLDER, "meta", "_journal.json");
  let rawJournal: string;

  try {
    rawJournal = await readFile(journalPath, "utf8");
  } catch (error) {
    throw new Error(
      "PostgreSQL 16 scratch preflight passed, but the checked-in company-identity migration journal is absent.",
      { cause: error }
    );
  }

  const journal = JSON.parse(rawJournal) as DrizzleJournal;
  if (!Array.isArray(journal.entries) || journal.entries.length < 2) {
    throw new Error(
      "Upgrade proof requires at least two checked-in company-identity migrations so a real prior prefix exists."
    );
  }
  return journal;
}

async function stagePriorMigrationPrefix(
  journal: DrizzleJournal
): Promise<string> {
  const stagedFolder = await mkdtemp(
    join(tmpdir(), "company-identity-prior-prefix-")
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
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema IN ('public', 'drizzle')
    ORDER BY table_schema, table_name, ordinal_position
  `;
  const constraints = await sql<
    { schema_name: string; table_name: string; constraint_name: string; definition: string }[]
  >`
    SELECT
      namespace.nspname AS schema_name,
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

describe("company identity upgrade migration", () => {
  it(
    "applies a checked-in prior prefix, preserves sentinel data, and upgrades exactly once",
    { timeout: 45_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async ({
        adminSql,
        databaseName,
        directDatabaseUrl,
      }) => {
        const [probe] = await adminSql<
          { database_name: string; server_version_num: string }[]
        >`
          SELECT current_database() AS database_name,
                 current_setting('server_version_num') AS server_version_num
        `;
        expect(probe?.database_name).toBe(databaseName);
        expect(Number(probe?.server_version_num)).toBeGreaterThanOrEqual(160_000);
        expect(Number(probe?.server_version_num)).toBeLessThan(170_000);

        const journal = await readIdentityJournal();
        const stagedPrefix = await stagePriorMigrationPrefix(journal);
        try {
          const prefixSql = postgres(directDatabaseUrl, {
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

          await adminSql`
            INSERT INTO company_organizations (
              id, stable_key, display_name, organization_type, status
            ) VALUES (
              ${SENTINEL_ORGANIZATION_ID},
              'upgrade-sentinel',
              'Upgrade Sentinel Organization',
              'INTERNAL_COMPANY',
              'ACTIVE'
            )
          `;
          await adminSql`
            INSERT INTO company_accounts (
              id, username, normalized_username, normalization_version,
              display_name, status, auth_version
            ) VALUES (
              ${SENTINEL_ACCOUNT_ID},
              'upgrade-sentinel',
              'upgrade-sentinel',
              1,
              'Upgrade Sentinel Account',
              'ACTIVE',
              1
            )
          `;

          const priorLedger = await readLedger(adminSql);
          const priorFingerprint = await schemaFingerprint(adminSql);
          expect(priorLedger).toHaveLength(journal.entries.length - 1);

          const migration = await loadMigrationModule();
          await migration.migrateCompanyIdentity({ directDatabaseUrl });

          const currentLedger = await readLedger(adminSql);
          const currentFingerprint = await schemaFingerprint(adminSql);
          const [sentinel] = await adminSql<
            { id: string; username: string; normalized_username: string }[]
          >`
            SELECT id, username, normalized_username
            FROM company_accounts
            WHERE id = ${SENTINEL_ACCOUNT_ID}
          `;

          expect(sentinel).toEqual({
            id: SENTINEL_ACCOUNT_ID,
            username: "upgrade-sentinel",
            normalized_username: "upgrade-sentinel",
          });
          expect(currentLedger).toHaveLength(journal.entries.length);
          expect(currentLedger.length).toBeGreaterThan(priorLedger.length);
          expect(currentFingerprint).not.toBe(priorFingerprint);
          for (let index = 1; index < currentLedger.length; index += 1) {
            expect(BigInt(currentLedger[index]!.created_at)).toBeGreaterThan(
              BigInt(currentLedger[index - 1]!.created_at)
            );
          }

          const doctor = await loadDoctorModule();
          const cleanInspection = await doctor.inspectCompanyIdentityDatabase({
            directDatabaseUrl,
          });
          expect(cleanInspection.clean).toBe(true);
          expect(cleanInspection.issues).toEqual([]);
          expect(cleanInspection.sentinels.length).toBeGreaterThan(0);

          const latestLedger = currentLedger[currentLedger.length - 1];
          if (!latestLedger) {
            throw new Error("Current identity ledger unexpectedly has no rows.");
          }
          await adminSql`
            DELETE FROM drizzle.__drizzle_migrations
            WHERE id = ${latestLedger.id}
          `;
          try {
            const missingLedgerInspection =
              await doctor.inspectCompanyIdentityDatabase({ directDatabaseUrl });
            expect(missingLedgerInspection.clean).toBe(false);
            expect(
              missingLedgerInspection.issues.map(({ code }) => code)
            ).toContain("MISSING_LEDGER");
          } finally {
            await adminSql`
              INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
              VALUES (
                ${latestLedger.id},
                ${latestLedger.hash},
                ${latestLedger.created_at}::bigint
              )
            `;
          }

          const latestSentinel =
            cleanInspection.sentinels[cleanInspection.sentinels.length - 1];
          if (!latestSentinel) {
            throw new Error("Identity doctor returned no migration sentinel.");
          }
          const originalSentinelName =
            latestSentinel.kind === "table"
              ? latestSentinel.tableName
              : latestSentinel.columnName;
          if (!originalSentinelName) {
            throw new Error("Identity doctor returned an incomplete column sentinel.");
          }
          const missingSentinelName = "__company_identity_doctor_missing";
          await renameDoctorSentinel(
            adminSql,
            latestSentinel,
            originalSentinelName,
            missingSentinelName
          );
          try {
            const missingSentinelInspection =
              await doctor.inspectCompanyIdentityDatabase({ directDatabaseUrl });
            expect(missingSentinelInspection.clean).toBe(false);
            expect(
              missingSentinelInspection.issues.map(({ code }) => code)
            ).toContain("MISSING_SENTINEL");
          } finally {
            await renameDoctorSentinel(
              adminSql,
              latestSentinel,
              missingSentinelName,
              originalSentinelName
            );
          }

          expect(
            await doctor.inspectCompanyIdentityDatabase({ directDatabaseUrl })
          ).toMatchObject({ clean: true, issues: [] });
          expect(await schemaFingerprint(adminSql)).toBe(currentFingerprint);

          await migration.migrateCompanyIdentity({ directDatabaseUrl });
          expect(await readLedger(adminSql)).toEqual(currentLedger);
          expect(await schemaFingerprint(adminSql)).toBe(currentFingerprint);
        } finally {
          await rm(stagedPrefix, { recursive: true, force: true });
        }
      });
    }
  );
});
