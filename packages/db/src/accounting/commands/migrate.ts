import {
  createAccountingDirectConfig,
  createAccountingRuntimeConfig,
} from "../environment.js";
import { migrateAccounting } from "../migration.js";
import { configureAccountingDatabasePrivileges } from "../privileged.js";

/**
 * Extracts the validated PostgreSQL login role from a connection URL.
 * @param databaseUrl A validated runtime or direct accounting URL.
 * @returns The decoded PostgreSQL login role.
 */
function databaseRole(databaseUrl: string): string {
  return decodeURIComponent(new URL(databaseUrl).username);
}

/**
 * Runs the dedicated accounting migration command from explicit environment configuration.
 * @returns A promise that resolves after migrations and evidence output complete.
 * @throws When configuration, target validation, or migration execution fails.
 */
async function main(): Promise<void> {
  const { directDatabaseUrl } = createAccountingDirectConfig({
    ACCOUNTING_DIRECT_DATABASE_URL: process.env.ACCOUNTING_DIRECT_DATABASE_URL,
  });
  const { databaseUrl } = createAccountingRuntimeConfig({
    ACCOUNTING_DATABASE_URL: process.env.ACCOUNTING_DATABASE_URL,
  });
  await migrateAccounting({ directDatabaseUrl });
  await configureAccountingDatabasePrivileges({
    databaseUrl: directDatabaseUrl,
    migrationRole: databaseRole(directDatabaseUrl),
    runtimeRole: databaseRole(databaseUrl),
  });
  console.log(
    JSON.stringify({ operation: "accounting_migrate", status: "ok" }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "accounting_migrate",
      status: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
