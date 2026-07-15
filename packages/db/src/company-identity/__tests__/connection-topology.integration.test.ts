/**
 * Red-phase production-client topology tests for company identity.
 *
 * PostgreSQL 16 and PgBouncer are hard prerequisites. The explicit PgBouncer
 * preflight distinguishes a missing 6432 service from absent production
 * migration, privilege, or client-factory behavior.
 */
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import {
  withCompanyIdentityScratchDatabase,
  type CompanyIdentityScratchDatabaseContext,
} from "./test-postgres.js";

type ConnectionProbe = {
  database_name: string;
  role_name: string;
  server_port: number;
};

type DatabaseError = Error & { code?: string };

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

interface CompanyIdentityPrivilegeModule {
  configureCompanyIdentityDatabasePrivileges(input: {
    databaseUrl: string;
    runtimeRole: string;
    migrationRole: string;
  }): Promise<void>;
}

interface CompanyIdentityClientModule {
  createCompanyIdentityRuntimeClient(input: {
    databaseUrl: string;
    expectedDatabaseName: string;
    expectedRole: string;
  }): Promise<postgres.Sql>;
  createCompanyIdentityDirectClient(input: {
    directDatabaseUrl: string;
    expectedDatabaseName: string;
    expectedRole: string;
  }): Promise<postgres.Sql>;
  proveCompanyIdentityConnectionTopology(input: {
    directDatabaseUrl: string;
    runtimeDatabaseUrl: string;
  }): Promise<void>;
}

async function proveScratchPostgres16(
  context: CompanyIdentityScratchDatabaseContext,
): Promise<void> {
  const [row] = await context.adminSql<
    { database_name: string; version_number: string }[]
  >`select current_database() as database_name,
           current_setting('server_version_num') as version_number`;
  expect(row?.database_name).toBe(context.databaseName);
  expect(Number(row?.version_number)).toBeGreaterThanOrEqual(160000);
  expect(Number(row?.version_number)).toBeLessThan(170000);
}

async function loadProductionModule<T>(
  relativePath: string,
  exportNames: readonly string[],
): Promise<T> {
  let loaded: Record<string, unknown>;
  try {
    const moduleUrl = new URL(relativePath, import.meta.url).href;
    loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw new Error(
      `PostgreSQL 16 was reached, but production module ${relativePath} is absent`,
      { cause: error },
    );
  }
  for (const exportName of exportNames) {
    expect(
      loaded[exportName],
      `${relativePath} must export ${exportName}`,
    ).toBeTypeOf("function");
  }
  return loaded as T;
}

async function prepareIdentityInfrastructure(
  context: CompanyIdentityScratchDatabaseContext,
): Promise<CompanyIdentityClientModule> {
  await proveScratchPostgres16(context);
  const migration = await loadProductionModule<CompanyIdentityMigrationModule>(
    "../migration.js",
    ["migrateCompanyIdentity"],
  );
  await migration.migrateCompanyIdentity({
    directDatabaseUrl: context.directDatabaseUrl,
  });
  const privileges = await loadProductionModule<CompanyIdentityPrivilegeModule>(
    "../privileged.js",
    ["configureCompanyIdentityDatabasePrivileges"],
  );
  await privileges.configureCompanyIdentityDatabasePrivileges({
    databaseUrl: context.directDatabaseUrl,
    runtimeRole: context.runtimeRole,
    migrationRole: context.migrationRole,
  });
  return loadProductionModule<CompanyIdentityClientModule>("../client.js", [
    "createCompanyIdentityRuntimeClient",
    "createCompanyIdentityDirectClient",
    "proveCompanyIdentityConnectionTopology",
  ]);
}

async function probeConnection(sql: postgres.Sql): Promise<ConnectionProbe> {
  const [row] = await sql<ConnectionProbe[]>`
    select current_database() as database_name,
           current_user as role_name,
           inet_server_port() as server_port
  `;
  expect(row, "Connection probe must return one PostgreSQL row").toBeDefined();
  return row!;
}

async function expectDatabaseError(
  operation: () => Promise<unknown>,
  code: string,
): Promise<void> {
  let caught: DatabaseError | undefined;
  try {
    await operation();
  } catch (error) {
    caught = error as DatabaseError;
  }
  expect(caught, `Expected PostgreSQL SQLSTATE ${code}`).toBeDefined();
  expect(caught?.code).toBe(code);
}

describe("company identity pooled and direct topology prerequisites", () => {
  it(
    "exposes transaction-mode PgBouncer on 6432 instead of skipping topology",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await proveScratchPostgres16(context);
        const adminUrl = new URL(context.adminDatabaseUrl);
        adminUrl.port = "6432";
        adminUrl.pathname = "/pgbouncer";
        const pgbouncer = postgres(adminUrl.toString(), {
          max: 1,
          prepare: false,
          fetch_types: false,
          connect_timeout: 3,
        });
        try {
          const config =
            await pgbouncer.unsafe<{ key: string; value: string }[]>(
              "show config",
            );
          expect(
            config.find(({ key }) => key === "pool_mode")?.value,
            "PgBouncer 6432 must report transaction pool mode",
          ).toBe("transaction");
        } catch (error) {
          throw new Error(
            "PostgreSQL 16 scratch preflight passed, but required PgBouncer topology on 6432 is unavailable or not transaction-mode",
            { cause: error },
          );
        } finally {
          await pgbouncer.end({ timeout: 1 });
        }
      });
    },
  );
});

describe("company identity production connection factories", () => {
  it(
    "proves direct PostgreSQL and pooled runtime URLs reach one cluster",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        const clients = await prepareIdentityInfrastructure(context);
        await expect(
          clients.proveCompanyIdentityConnectionTopology({
            directDatabaseUrl: context.directDatabaseUrl,
            runtimeDatabaseUrl: context.runtimeDatabaseUrl,
          }),
        ).resolves.toBeUndefined();
      });
    },
  );

  it(
    "uses the runtime factory through 6432 for allowed DML and denied DDL",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        const clients = await prepareIdentityInfrastructure(context);
        expect(new URL(context.runtimeDatabaseUrl).port).toBe("6432");
        const runtimeSql = await clients.createCompanyIdentityRuntimeClient({
          databaseUrl: context.runtimeDatabaseUrl,
          expectedDatabaseName: context.databaseName,
          expectedRole: context.runtimeRole,
        });
        try {
          expect(runtimeSql.options.port).toEqual([6432]);
          expect(runtimeSql.options.prepare).toBe(false);
          const probe = await probeConnection(runtimeSql);
          expect(probe).toEqual({
            database_name: context.databaseName,
            role_name: context.runtimeRole,
            server_port: 5432,
          });
          await runtimeSql`
          insert into company_accounts
            (username, normalized_username, display_name)
          values ('Pooled Runtime', 'pooled.runtime', 'Pooled Runtime')
        `;
          const [account] = await runtimeSql<{ normalized_username: string }[]>`
          select normalized_username
            from company_accounts
           where normalized_username = 'pooled.runtime'
        `;
          expect(account?.normalized_username).toBe("pooled.runtime");
          await expectDatabaseError(
            () =>
              runtimeSql`create table pooled_runtime_forbidden (id integer)`,
            "42501",
          );
        } finally {
          await runtimeSql.end({ timeout: 1 });
        }
      });
    },
  );

  it(
    "uses the direct factory through 5432 for migration DDL",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        const clients = await prepareIdentityInfrastructure(context);
        expect(new URL(context.directDatabaseUrl).port).toBe("5432");
        const directSql = await clients.createCompanyIdentityDirectClient({
          directDatabaseUrl: context.directDatabaseUrl,
          expectedDatabaseName: context.databaseName,
          expectedRole: context.migrationRole,
        });
        try {
          expect(directSql.options.port).toEqual([5432]);
          const probe = await probeConnection(directSql);
          expect(probe).toEqual({
            database_name: context.databaseName,
            role_name: context.migrationRole,
            server_port: 5432,
          });
          await directSql`create table direct_factory_probe (id integer primary key)`;
          const [table] = await directSql<{ table_name: string }[]>`
          select table_name
            from information_schema.tables
           where table_schema = 'public' and table_name = 'direct_factory_probe'
        `;
          expect(table?.table_name).toBe("direct_factory_probe");
          await directSql`drop table direct_factory_probe`;
        } finally {
          await directSql.end({ timeout: 1 });
        }
      });
    },
  );

  it(
    "rejects a direct-role URL passed to the runtime factory",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        const clients = await prepareIdentityInfrastructure(context);
        await expect(
          Promise.resolve().then(() =>
            clients.createCompanyIdentityRuntimeClient({
              databaseUrl: context.directDatabaseUrl,
              expectedDatabaseName: context.databaseName,
              expectedRole: context.runtimeRole,
            }),
          ),
        ).rejects.toMatchObject({ code: "COMPANY_IDENTITY_ROLE_MISMATCH" });
      });
    },
  );

  it(
    "rejects runtime credentials when the factory targets a product database",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        const clients = await prepareIdentityInfrastructure(context);
        const [productDatabase] = await context.adminSql<{ datname: string }[]>`
        select datname from pg_database where datname = 'reading_advantage'
      `;
        expect(
          productDatabase,
          "Local PostgreSQL must expose reading_advantage for wrong-target proof",
        ).toBeDefined();
        const wrongDatabaseUrl = new URL(context.runtimeDatabaseUrl);
        wrongDatabaseUrl.pathname = "/reading_advantage";
        await expect(
          Promise.resolve().then(() =>
            clients.createCompanyIdentityRuntimeClient({
              databaseUrl: wrongDatabaseUrl.toString(),
              expectedDatabaseName: context.databaseName,
              expectedRole: context.runtimeRole,
            }),
          ),
        ).rejects.toMatchObject({ code: "COMPANY_IDENTITY_DATABASE_MISMATCH" });
      });
    },
  );
});
