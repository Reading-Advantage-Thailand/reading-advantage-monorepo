import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type postgres from "postgres";
import { createCompanyIdentityDirectClient } from "./client.js";

const COMPANY_IDENTITY_MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../company-identity/drizzle", import.meta.url),
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
 * Applies the dedicated company identity migration journal through a direct PostgreSQL connection.
 * @param input Direct company identity database URL owned by the migration role.
 * @returns A promise that resolves after every pending migration is committed.
 * @throws When the URL target, live database or role probe, migration SQL, or ledger update fails.
 */
export async function migrateCompanyIdentity(input: {
  readonly directDatabaseUrl: string;
}): Promise<void> {
  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: input.directDatabaseUrl,
    onnotice: suppressMigrationNotice,
  });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: COMPANY_IDENTITY_MIGRATIONS_FOLDER,
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
