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

/**
 * Establishes the first timestamp whose committed SQL hash is authoritative.
 * Migrations before this governance boundary have known historical raw-SQL
 * drift in production; their timestamps remain mandatory, while newer hashes
 * must match the checked-in migration source exactly.
 */
const HASH_VALIDATION_FLOOR = 1779120003000;

/** Options for applying the shared product migration journal. */
export interface ProductMigrationOptions {
  readonly directDatabaseUrl: string;
  readonly migrationsFolder?: string;
}

interface ProductMigrationLedgerRow {
  readonly hash: string;
  readonly created_at: string | number | bigint | null;
}

/**
 * Converts a ledger timestamp returned by PostgreSQL into the migration timestamp representation.
 * @param createdAt The PostgreSQL ledger timestamp.
 * @returns The numeric migration timestamp.
 * @throws When the ledger timestamp is null or not finite.
 */
function toMigrationTimestamp(
  createdAt: ProductMigrationLedgerRow["created_at"],
): number {
  if (createdAt === null) {
    throw new Error(
      "Migration ledger contains a row with a null created_at timestamp.",
    );
  }
  const timestamp = Number(createdAt);
  if (!Number.isSafeInteger(timestamp)) {
    throw new Error(
      `Migration ledger contains an invalid created_at timestamp: ${String(createdAt)}.`,
    );
  }
  return timestamp;
}

/**
 * Validates ledger identity and historical continuity before applying migrations.
 * @param ledgerRows Every row currently recorded in the migration ledger.
 * @param migrations The checked-in migration journal entries.
 * @returns The unique applied migration timestamps.
 * @throws When ledger timestamps duplicate, known hashes diverge, or a historical gap is detected.
 */
function validateProductMigrationLedger(
  ledgerRows: readonly ProductMigrationLedgerRow[],
  migrations: readonly {
    readonly folderMillis: number;
    readonly hash: string;
  }[],
): ReadonlySet<number> {
  const knownMigrations = new Map<number, string>();
  for (const migration of migrations) {
    const previousHash = knownMigrations.get(migration.folderMillis);
    if (previousHash !== undefined) {
      throw new Error(
        `Migration journal contains duplicate timestamp ${migration.folderMillis}.`,
      );
    }
    knownMigrations.set(migration.folderMillis, migration.hash);
  }

  const appliedTimestamps = new Set<number>();
  for (const row of ledgerRows) {
    const timestamp = toMigrationTimestamp(row.created_at);
    if (appliedTimestamps.has(timestamp)) {
      throw new Error(
        `Migration ledger contains duplicate created_at timestamp ${timestamp}.`,
      );
    }
    const expectedHash = knownMigrations.get(timestamp);
    if (
      expectedHash !== undefined &&
      timestamp >= HASH_VALIDATION_FLOOR &&
      row.hash !== expectedHash
    ) {
      throw new Error(
        `Migration ledger hash mismatch at timestamp ${timestamp}.`,
      );
    }
    appliedTimestamps.add(timestamp);
  }

  let laterKnownMigrationApplied = false;
  const orderedMigrations = [...migrations].sort(
    (left, right) => left.folderMillis - right.folderMillis,
  );
  for (const migration of orderedMigrations.reverse()) {
    if (appliedTimestamps.has(migration.folderMillis)) {
      laterKnownMigrationApplied = true;
      continue;
    }
    if (laterKnownMigrationApplied) {
      throw new Error(
        `Migration ledger is missing historical migration timestamp ${migration.folderMillis} below a later applied migration.`,
      );
    }
  }

  return appliedTimestamps;
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
      const ledgerRows = await transaction.unsafe<ProductMigrationLedgerRow[]>(
        `SELECT hash, created_at
           FROM drizzle.__drizzle_migrations
          ORDER BY created_at, id`,
      );
      const appliedTimestamps = validateProductMigrationLedger(
        ledgerRows,
        migrations,
      );

      for (const migration of migrations) {
        if (appliedTimestamps.has(migration.folderMillis)) {
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
