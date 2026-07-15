import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import * as productSchema from "../../schema/index.js";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const PRODUCT_MIGRATIONS = join(PACKAGE_ROOT, "drizzle");
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
  "company_organizations",
  "company_organization_memberships",
  "company_password_credentials",
  "company_role_assignments",
  "company_sso_sessions",
] as const;

function productTableNames(): string[] {
  const names = Object.values(productSchema).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    try {
      return [getTableConfig(value as PgTable).name];
    } catch {
      return [];
    }
  });
  return [...new Set(names)].sort();
}

const PRODUCT_TABLES = productTableNames();

interface MigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

async function loadMigrationModule(): Promise<MigrationModule> {
  try {
    const moduleUrl = new URL("../migration.js", import.meta.url).href;
    const loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
    expect(
      loaded.migrateCompanyIdentity,
      "PostgreSQL 16 was reached, but migrateCompanyIdentity is absent.",
    ).toBeTypeOf("function");
    return loaded as unknown as MigrationModule;
  } catch (error) {
    throw new Error(
      "PostgreSQL 16 was reached, but the production identity migrator is absent.",
      { cause: error },
    );
  }
}

async function publicTables(
  sql: ReturnType<typeof postgres>,
): Promise<string[]> {
  const rows = await sql<Array<{ table_name: string }>>`
    select table_name
      from information_schema.tables
     where table_schema = 'public'
       and table_type = 'BASE TABLE'
     order by table_name
  `;
  return rows.map(({ table_name }) => table_name);
}

async function ledgerHashes(
  sql: ReturnType<typeof postgres>,
): Promise<string[]> {
  const rows = await sql<Array<{ hash: string }>>`
    select hash
      from drizzle.__drizzle_migrations
     order by created_at, hash
  `;
  return rows.map(({ hash }) => hash);
}

describe("product and company identity migration isolation", () => {
  it("runs real migrators against disjoint databases, catalogs, and ledgers", async () => {
    await withCompanyIdentityScratchDatabase(async ({
      adminSql,
      directDatabaseUrl,
    }) => {
      expect(await adminSql`select current_database() as database`).toHaveLength(1);
      const identityMigration = await loadMigrationModule();
      await identityMigration.migrateCompanyIdentity({ directDatabaseUrl });
      const identitySql = postgres(directDatabaseUrl, { max: 1 });
      try {
        const identityTablesBeforeProduct = await publicTables(identitySql);
        const identityLedgerBeforeProduct = await ledgerHashes(identitySql);
        expect(identityLedgerBeforeProduct.length).toBeGreaterThan(0);
        expect(identityTablesBeforeProduct).toEqual([...IDENTITY_TABLES].sort());
        for (const tableName of PRODUCT_TABLES) {
          expect(identityTablesBeforeProduct).not.toContain(tableName);
        }

        await withCompanyIdentityScratchDatabase(
          async ({ directDatabaseUrl: productDatabaseUrl }) => {
            const productSql = postgres(productDatabaseUrl, { max: 1 });
            try {
              await migrate(drizzle(productSql), {
                migrationsFolder: PRODUCT_MIGRATIONS,
              });

              const productTablesAfterMigration = await publicTables(productSql);
              const productLedgerAfterMigration = await ledgerHashes(productSql);
              expect(productLedgerAfterMigration.length).toBeGreaterThan(0);
              expect(productTablesAfterMigration).toEqual(PRODUCT_TABLES);
              for (const tableName of IDENTITY_TABLES) {
                expect(productTablesAfterMigration).not.toContain(tableName);
              }

              expect(await publicTables(identitySql)).toEqual(
                identityTablesBeforeProduct,
              );
              expect(await ledgerHashes(identitySql)).toEqual(
                identityLedgerBeforeProduct,
              );
              expect(
                productLedgerAfterMigration.filter((hash) =>
                  identityLedgerBeforeProduct.includes(hash),
                ),
              ).toEqual([]);
            } finally {
              await productSql.end();
            }
          },
        );
      } finally {
        await identitySql.end();
      }
    });
  }, 180_000);
});
