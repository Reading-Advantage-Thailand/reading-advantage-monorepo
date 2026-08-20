import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type postgres from "postgres";
import { createAccountingDirectClient } from "./client.js";

const ACCOUNTING_MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../accounting/drizzle", import.meta.url),
);

/**
 * Suppresses expected idempotent migration notices so command output stays structured.
 * @param _notice The PostgreSQL notice emitted by schema setup.
 * @returns Nothing.
 */
function suppressMigrationNotice(_notice: postgres.Notice): void {
  void _notice;
}

/**
 * Applies the dedicated accounting migration journal through a direct PostgreSQL connection.
 * @param input Direct accounting database URL owned by the migration role.
 * @returns A promise that resolves after every pending migration is committed.
 * @throws When the URL target, live database or role probe, migration SQL, or ledger update fails.
 */
export async function migrateAccounting(input: {
  readonly directDatabaseUrl: string;
}): Promise<void> {
  const sql = await createAccountingDirectClient({
    directDatabaseUrl: input.directDatabaseUrl,
    onnotice: suppressMigrationNotice,
  });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: ACCOUNTING_MIGRATIONS_FOLDER,
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
