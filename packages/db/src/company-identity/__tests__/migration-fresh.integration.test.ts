import { describe, expect, it } from "vitest";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

const MIGRATION_MODULE = new URL("../migration.js", import.meta.url).href;
const IDENTITY_TABLES = [
  "company_accounts",
  "company_application_role_assignments",
  "company_application_role_definitions",
  "company_application_sessions",
  "company_applications",
  "company_identity_audit_events",
  "company_identity_idempotency_records",
  "company_login_attempts",
  "company_login_rate_limit_buckets",
  "company_oidc_authorization_codes",
  "company_oidc_clients",
  "company_oidc_redirect_uris",
  "company_organization_memberships",
  "company_organizations",
  "company_password_credentials",
  "company_role_assignments",
  "company_sso_sessions",
] as const;

const FORBIDDEN_PRODUCT_TABLES = [
  "billing",
  "campaigns",
  "classrooms",
  "codecamp_curriculum",
  "codecamp_submissions",
  "education_progress",
  "entitlements",
  "licenses",
  "sales_attempts",
  "sales_progress",
  "schools",
  "students",
  "teachers",
] as const;

async function loadMigrationModule(): Promise<CompanyIdentityMigrationModule> {
  let loaded: Record<string, unknown>;

  try {
    loaded = (await import(MIGRATION_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "PostgreSQL 16 scratch preflight passed, but the company-identity migration module is absent; " +
        "implement src/company-identity/migration.ts.",
      { cause: error }
    );
  }

  if (typeof loaded.migrateCompanyIdentity !== "function") {
    throw new Error(
      "PostgreSQL 16 scratch preflight passed, but migration.ts does not export migrateCompanyIdentity."
    );
  }

  return loaded as unknown as CompanyIdentityMigrationModule;
}

describe("company identity fresh migration", () => {
  it(
    "migrates an empty PostgreSQL 16 database once without product tables",
    { timeout: 30_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async ({
        adminSql,
        databaseName,
        directDatabaseUrl,
      }) => {
        const [probe] = await adminSql<
          { database_name: string; server_version_num: string }[]
        >`
          SELECT
            current_database() AS database_name,
            current_setting('server_version_num') AS server_version_num
        `;
        expect(probe?.database_name).toBe(databaseName);
        expect(Number(probe?.server_version_num)).toBeGreaterThanOrEqual(160_000);
        expect(Number(probe?.server_version_num)).toBeLessThan(170_000);

        const migration = await loadMigrationModule();
        await migration.migrateCompanyIdentity({ directDatabaseUrl });

        const publicTables = await adminSql<{ table_name: string }[]>`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `;
        expect(publicTables.map(({ table_name }) => table_name)).toEqual(
          IDENTITY_TABLES
        );

        for (const tableName of FORBIDDEN_PRODUCT_TABLES) {
          expect(publicTables.map(({ table_name }) => table_name)).not.toContain(
            tableName
          );
        }

        const ledgerBeforeRerun = await adminSql<
          { id: number; hash: string; created_at: string }[]
        >`
          SELECT id, hash, created_at::text
          FROM drizzle.__drizzle_migrations
          ORDER BY id
        `;
        expect(ledgerBeforeRerun.length).toBeGreaterThan(0);
        for (let index = 1; index < ledgerBeforeRerun.length; index += 1) {
          expect(
            BigInt(ledgerBeforeRerun[index]!.created_at),
            "identity migration ledger timestamps must be strictly monotonic"
          ).toBeGreaterThan(BigInt(ledgerBeforeRerun[index - 1]!.created_at));
        }

        await migration.migrateCompanyIdentity({ directDatabaseUrl });
        const ledgerAfterRerun = await adminSql<
          { id: number; hash: string; created_at: string }[]
        >`
          SELECT id, hash, created_at::text
          FROM drizzle.__drizzle_migrations
          ORDER BY id
        `;
        expect(ledgerAfterRerun).toEqual(ledgerBeforeRerun);
      });
    }
  );
});
