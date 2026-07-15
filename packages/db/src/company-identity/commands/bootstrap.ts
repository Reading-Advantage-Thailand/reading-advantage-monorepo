import { bootstrapCompanyIdentity } from "../bootstrap.js";
import { proveCompanyIdentityConnectionTopology } from "../client.js";
import {
  createCompanyIdentityDirectConfig,
  createCompanyIdentityRuntimeConfig,
} from "../environment.js";
import { migrateCompanyIdentity } from "../migration.js";
import { configureCompanyIdentityDatabasePrivileges } from "../privileged.js";

/**
 * Extracts the already-validated PostgreSQL login role from a connection URL.
 * @param databaseUrl A validated runtime or direct company-identity URL.
 * @returns The decoded PostgreSQL login role.
 */
function databaseRole(databaseUrl: string): string {
  return decodeURIComponent(new URL(databaseUrl).username);
}

/**
 * Migrates and idempotently bootstraps the internal company identity records.
 * @returns A promise that resolves after migration, bootstrap, and evidence output complete.
 * @throws When configuration, migration, or deterministic bootstrap fails.
 */
async function main(): Promise<void> {
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
  await migrateCompanyIdentity({ directDatabaseUrl });
  await configureCompanyIdentityDatabasePrivileges({
    databaseUrl: directDatabaseUrl,
    migrationRole: databaseRole(directDatabaseUrl),
    runtimeRole: databaseRole(databaseUrl),
  });
  await proveCompanyIdentityConnectionTopology({
    directDatabaseUrl,
    runtimeDatabaseUrl: databaseUrl,
  });
  await bootstrapCompanyIdentity({ directDatabaseUrl });
  console.log(
    JSON.stringify({ operation: "company_identity_bootstrap", status: "ok" }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "company_identity_bootstrap",
      status: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
