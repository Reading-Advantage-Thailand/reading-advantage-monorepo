/**
 * In-process PostgreSQL test harness (PGlite) for packages/domain.
 *
 * Boots a real Postgres engine (compiled to WASM) inside the test process so
 * domain functions run against genuine SQL semantics — real INSERT/SELECT,
 * real FK enforcement, real unique constraints, and real TenantDB auto-scoping —
 * with no server, Docker, or DATABASE_URL.
 *
 * TEST-ONLY. PGlite is a devDependency and is imported only from test helpers.
 * Production continues to use the managed Postgres via @reading-advantage/db.
 *
 * Usage:
 *   const h = await createTestDb();
 *   await h.db.insert(schools).values({ ... });
 *   const rows = await h.tenantDb({ schoolId: "..." }).select().from(classrooms);
 *   ...
 *   await h.close();
 *
 * The harness executes the real drizzle migration SQL files from
 * packages/db/drizzle in journal order. Running the raw SQL (instead of relying
 * on drizzle-orm's migrator statement-splitting) keeps PL/pgSQL blocks such as
 * `DO $$ ... END $$;` intact, which would otherwise be split at
 * `--> statement-breakpoint` markers.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readFileSync } from "node:fs";
import * as schema from "@reading-advantage/db";
import type { DB } from "@reading-advantage/db";
import type { Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../../db-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

/** Tables deliberately preserved by the test reset because production marks them append-only. */
export const TEST_DB_APPEND_ONLY_TABLES = Object.freeze([
  "standard_pack_successor_commitments",
  "standard_pack_successor_admission_receipts",
] as const);

export interface TestDb {
  /** Drizzle instance bound to the in-process PGlite database. */
  db: ReturnType<typeof drizzle<typeof schema>>;
  /** Factory for a TenantDB bound to the supplied tenant. */
  tenantDb: (tenant: Tenant) => ReturnType<typeof createTenantDB>;
  /** Truncate all user tables (run between tests for isolation). */
  reset: () => Promise<void>;
  /** Tear down the PGlite instance. */
  close: () => Promise<void>;
}

function readMigrationFiles(migrationsFolder: string): string[] {
  const journalPath = join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as Journal;
  return journal.entries
    .map((entry) => {
      const filePath = join(migrationsFolder, `${entry.tag}.sql`);
      const rawSql = readFileSync(filePath, "utf-8");
      // PGlite does not support loading extensions such as pgcrypto, and some
      // migrations rely on pgcrypto's `digest()` for data backfills. Skip those
      // files — the columns they add are not required by the games persistence
      // tests, and the real DDL is still exercised by production migrations.
      if (/digest\s*\(/i.test(rawSql)) {
        return null;
      }
      // Strip any standalone CREATE EXTENSION lines so the remaining SQL can run.
      return rawSql.replace(/CREATE EXTENSION IF NOT EXISTS \w+;\s*/gi, "");
    })
    .filter((sql): sql is string => sql !== null);
}

/**
 * Boots a fresh in-process Postgres, applies the real drizzle migration SQL,
 * and returns the raw Drizzle client plus a TenantDB factory.
 */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = resolve(__dirname, "../../../../db/drizzle");

  // Execute each migration file as a single script so PL/pgSQL DO blocks stay
  // intact. This mirrors the production migration order while being compatible
  // with PGlite's exec parser.
  const migrations = readMigrationFiles(migrationsFolder);
  for (const migrationSql of migrations) {
    await client.exec(migrationSql);
  }

  return {
    db,
    tenantDb: (tenant: Tenant) => createTenantDB(db as unknown as DB, tenant),
    reset: async () => {
      const result = await db.execute(
        sql.raw(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'drizzle_migrations'`,
        ),
      );
      const tableNames = (result.rows as { tablename: string }[])
        .map((r) => r.tablename)
        .filter(
          (tableName): tableName is string =>
            Boolean(tableName) &&
            !(TEST_DB_APPEND_ONLY_TABLES as readonly string[]).includes(tableName),
        );
      if (tableNames.length > 0) {
        // Do not disable immutable triggers or mutate append-only registries in
        // a test reset. Their rows are global release evidence, not fixtures.
        await db.execute(
          sql.raw(
            `TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE`,
          ),
        );
      }
    },
    close: async () => {
      await client.close();
    },
  };
}
