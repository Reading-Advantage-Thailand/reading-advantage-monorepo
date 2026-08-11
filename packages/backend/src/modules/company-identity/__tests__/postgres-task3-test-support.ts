import { randomUUID } from "node:crypto";

import postgres from "postgres";

const MIGRATION_ADVISORY_LOCK_KEY = 1_947_071_501;
const FORBIDDEN_DATABASE_NAMES = new Set([
  "reading_advantage",
  "primary_advantage",
  "science_advantage",
]);
const DISPOSABLE_DATABASE_PATTERN = /^company_identity_test_[0-9]+_[0-9a-f]+$/u;

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

/** Verifies that a live Finance trust-root URL names a disposable non-product database. */
export async function assertDisposableCompanyIdentityDatabase(
  sql: ReturnType<typeof postgres>,
): Promise<void> {
  const [probe] = await sql<{ database_name: string }[]>`
    select current_database() as database_name
  `;
  if (
    probe === undefined ||
    FORBIDDEN_DATABASE_NAMES.has(probe.database_name) ||
    !DISPOSABLE_DATABASE_PATTERN.test(probe.database_name)
  ) {
    throw new Error(
      "Company Identity PostgreSQL tests require an explicit company_identity_test_<digits>_<hex> database.",
    );
  }
}

/** Applies the Company Identity journal once at a time so parallel files cannot race the ledger. */
export async function migrateCompanyIdentityWithLock(
  directDatabaseUrl: string,
): Promise<void> {
  const sql = postgres(directDatabaseUrl, { max: 1, prepare: false });
  try {
    await assertDisposableCompanyIdentityDatabase(sql);
    await sql.begin(async (transaction) => {
      await transaction`
        select pg_catalog.pg_advisory_xact_lock(${MIGRATION_ADVISORY_LOCK_KEY})
      `;
      const migrationUrl = new URL(
        "../../../../../db/src/company-identity/migration.js",
        import.meta.url,
      ).href;
      const migration = (await import(
        /* @vite-ignore */ migrationUrl
      )) as CompanyIdentityMigrationModule;
      await migration.migrateCompanyIdentity({ directDatabaseUrl });
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Returns the one active internal company, creating it only when the disposable database is empty. */
export async function ensureOneActiveInternalCompany(
  sql: ReturnType<typeof postgres>,
): Promise<string> {
  return sql.begin(async (transaction) => {
    await transaction`
      select pg_catalog.pg_advisory_xact_lock(${MIGRATION_ADVISORY_LOCK_KEY})
    `;
    const [existing] = await transaction<{ id: string }[]>`
      select id
        from company_organizations
       where organization_type = 'INTERNAL_COMPANY'
         and status = 'ACTIVE'
       order by created_at, id
       limit 1
    `;
    if (existing !== undefined) return existing.id;

    const organizationId = randomUUID();
    await transaction`
      insert into company_organizations
        (id, stable_key, display_name, organization_type, status)
      values
        (${organizationId}, 'company-identity-test-internal',
         'Company Identity Test Internal Company', 'INTERNAL_COMPANY', 'ACTIVE')
    `;
    return organizationId;
  });
}
