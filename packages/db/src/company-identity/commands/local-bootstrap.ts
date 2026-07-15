import { ensureLocalCompanyIdentityDatabase } from "../bootstrap.js";
import {
  createCompanyIdentityDirectConfig,
  createCompanyIdentityRuntimeConfig,
  createCompanyIdentityTestConfig,
} from "../environment.js";

/**
 * Provisions or replays the local PostgreSQL 16 company-identity database.
 * @returns A promise that resolves after roles, database, migrations, grants, and bootstrap data are current.
 * @throws When local configuration, ownership, provisioning, or bootstrap fails.
 */
async function main(): Promise<void> {
  const { adminDatabaseUrl } = createCompanyIdentityTestConfig({
    COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL:
      process.env.COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL,
  });
  const { directDatabaseUrl } = createCompanyIdentityDirectConfig({
    COMPANY_AUTH_DIRECT_DATABASE_URL:
      process.env.COMPANY_AUTH_DIRECT_DATABASE_URL,
  });
  const { databaseUrl } = createCompanyIdentityRuntimeConfig({
    COMPANY_AUTH_DATABASE_URL: process.env.COMPANY_AUTH_DATABASE_URL,
    COMPANY_AUTH_DATABASE_POOL_MAX: process.env.COMPANY_AUTH_DATABASE_POOL_MAX,
    NODE_ENV: process.env.NODE_ENV as
      | "development"
      | "production"
      | "test"
      | undefined,
  });
  await ensureLocalCompanyIdentityDatabase({
    adminDatabaseUrl,
    directDatabaseUrl,
    runtimeDatabaseUrl: databaseUrl,
  });
  console.log(
    JSON.stringify({
      operation: "company_identity_local_bootstrap",
      status: "ok",
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "company_identity_local_bootstrap",
      status: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
