import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "./connection-options.js";
import { readPostgresMigrationFiles } from "./migration-files.js";

const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../drizzle", import.meta.url),
);

/** Options for applying the shared product migration journal. */
export interface ProductMigrationOptions {
  readonly directDatabaseUrl: string;
  readonly migrationsFolder?: string;
}

/**
 * Applies pending shared product migrations through one serialized transaction.
 * @param options The direct database URL and optional migration folder override.
 * @returns A promise that resolves once the ledger and schema are current.
 * @throws When the database connection, migration SQL, or ledger update fails.
 */
export async function migrateProductDatabase(
  options: ProductMigrationOptions,
): Promise<void> {
  const migrations = readPostgresMigrationFiles({
    migrationsFolder: options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER,
  });
  const client = postgres(
    normalizePostgresConnectionString(options.directDatabaseUrl),
    {
      ...buildPostgresOptions(options.directDatabaseUrl),
      max: 1,
    },
  );

  try {
    await client.begin(async (transaction) => {
      await transaction.unsafe(
        "SELECT pg_advisory_xact_lock(hashtext('reading_advantage_product_migrations'))",
      );
      await transaction.unsafe("CREATE SCHEMA IF NOT EXISTS drizzle");
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )
      `);
      const [lastMigration] = await transaction.unsafe<
        Array<{ created_at: string | number | bigint | null }>
      >(
        `SELECT created_at
           FROM drizzle.__drizzle_migrations
          ORDER BY created_at DESC
          LIMIT 1`,
      );
      const lastAppliedAt = lastMigration?.created_at == null
        ? null
        : Number(lastMigration.created_at);

      for (const migration of migrations) {
        if (
          lastAppliedAt !== null &&
          lastAppliedAt >= migration.folderMillis
        ) {
          continue;
        }
        for (const statement of migration.sql) {
          if (statement.trim()) {
            await transaction.unsafe(statement);
          }
        }
        await transaction.unsafe(
          `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
           VALUES ($1, $2)`,
          [migration.hash, migration.folderMillis],
        );
      }
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}
