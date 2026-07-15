import { createCompanyIdentityDirectConfig } from "../environment.js";
import { migrateCompanyIdentity } from "../migration.js";

/**
 * Runs the dedicated company-identity migration command from explicit environment configuration.
 * @returns A promise that resolves after migrations and evidence output complete.
 * @throws When configuration, target validation, or migration execution fails.
 */
async function main(): Promise<void> {
  const { directDatabaseUrl } = createCompanyIdentityDirectConfig({
    COMPANY_AUTH_DIRECT_DATABASE_URL:
      process.env.COMPANY_AUTH_DIRECT_DATABASE_URL,
  });
  await migrateCompanyIdentity({ directDatabaseUrl });
  console.log(
    JSON.stringify({ operation: "company_identity_migrate", status: "ok" }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "company_identity_migrate",
      status: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
