import { createAccountingDirectConfig } from "../environment.js";
import { migrateAccounting } from "../migration.js";

/**
 * Runs the dedicated accounting migration command from explicit environment configuration.
 * @returns A promise that resolves after migrations and evidence output complete.
 * @throws When configuration, target validation, or migration execution fails.
 */
async function main(): Promise<void> {
  const { directDatabaseUrl } = createAccountingDirectConfig({
    ACCOUNTING_DIRECT_DATABASE_URL: process.env.ACCOUNTING_DIRECT_DATABASE_URL,
  });
  await migrateAccounting({ directDatabaseUrl });
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
