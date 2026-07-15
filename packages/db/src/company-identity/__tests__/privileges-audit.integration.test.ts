/**
 * Red-phase least-privilege and immutable-audit tests against PostgreSQL 16.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import {
  withCompanyIdentityScratchDatabase,
  type CompanyIdentityScratchDatabaseContext,
} from "./test-postgres.js";

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

interface CompanyIdentityDoctorModule {
  inspectCompanyIdentityDatabase(input: {
    directDatabaseUrl: string;
  }): Promise<{
    clean: boolean;
    issues: readonly unknown[];
    sentinels: readonly unknown[];
  }>;
}

type DatabaseError = Error & {
  code?: string;
  constraint_name?: string;
};

async function expectDatabaseError(
  operation: () => Promise<unknown>,
  code: string,
  message?: string,
): Promise<void> {
  let caught: DatabaseError | undefined;
  try {
    await operation();
  } catch (error) {
    caught = error as DatabaseError;
  }
  expect(caught, `Expected PostgreSQL SQLSTATE ${code}`).toBeDefined();
  expect(caught?.code).toBe(code);
  if (message) expect(caught?.message).toContain(message);
}

async function preparePrivileges(
  context: CompanyIdentityScratchDatabaseContext,
): Promise<void> {
  const [probe] = await context.adminSql<
    { database_name: string; version_number: string }[]
  >`select current_database() as database_name,
           current_setting('server_version_num') as version_number`;
  expect(probe?.database_name).toBe(context.databaseName);
  expect(Number(probe?.version_number)).toBeGreaterThanOrEqual(160000);
  expect(Number(probe?.version_number)).toBeLessThan(170000);

  let migration: Record<string, unknown>;
  try {
    const migrationUrl = new URL("../migration.js", import.meta.url).href;
    migration = (await import(/* @vite-ignore */ migrationUrl)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw new Error(
      "PostgreSQL 16 was reached, but company-identity/migration.ts is absent",
      { cause: error },
    );
  }
  expect(migration.migrateCompanyIdentity).toBeTypeOf("function");
  await (
    migration as unknown as CompanyIdentityMigrationModule
  ).migrateCompanyIdentity({ directDatabaseUrl: context.directDatabaseUrl });

  let privileged: Record<string, unknown>;
  try {
    const privilegedUrl = new URL("../privileged.js", import.meta.url).href;
    privileged = (await import(/* @vite-ignore */ privilegedUrl)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw new Error(
      "Identity migrations ran, but company-identity/privileged.ts is absent",
      { cause: error },
    );
  }
  expect(
    privileged.configureCompanyIdentityDatabasePrivileges,
    "privileged.ts must export configureCompanyIdentityDatabasePrivileges",
  ).toBeTypeOf("function");

  await (
    privileged as unknown as CompanyIdentityPrivilegeModule
  ).configureCompanyIdentityDatabasePrivileges({
    databaseUrl: context.directDatabaseUrl,
    runtimeRole: context.runtimeRole,
    migrationRole: context.migrationRole,
  });
}

describe("company identity runtime database privileges", () => {
  it(
    "permits required account DML but denies runtime DDL",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        const runtimeSql = postgres(context.runtimeDirectDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        try {
          const accountId = randomUUID();
          await runtimeSql`
          insert into company_accounts
            (id, username, normalized_username, display_name)
          values (${accountId}, 'Runtime User', 'runtime.user', 'Runtime User')
        `;
          const [inserted] = await runtimeSql<
            { normalized_username: string }[]
          >`select normalized_username
            from company_accounts
           where id = ${accountId}`;
          expect(inserted?.normalized_username).toBe("runtime.user");
          await runtimeSql`
          update company_accounts
             set display_name = 'Updated Runtime User'
           where id = ${accountId}
        `;
          await expectDatabaseError(
            () => runtimeSql`create table runtime_must_not_create (id integer)`,
            "42501",
          );
        } finally {
          await runtimeSql.end();
        }
      });
    },
  );

  it(
    "removes pre-existing runtime CREATE, TRUNCATE, REFERENCES, and TRIGGER grants",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        await context.adminSql.unsafe(
          `GRANT CREATE ON SCHEMA public TO "${context.runtimeRole}"`,
        );
        await context.adminSql.unsafe(
          `GRANT TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO "${context.runtimeRole}"`,
        );

        const privileged = (await import(
          /* @vite-ignore */ new URL("../privileged.js", import.meta.url).href
        )) as unknown as CompanyIdentityPrivilegeModule;
        await privileged.configureCompanyIdentityDatabasePrivileges({
          databaseUrl: context.directDatabaseUrl,
          runtimeRole: context.runtimeRole,
          migrationRole: context.migrationRole,
        });

        const [grants] = await context.adminSql<
          Array<{
            can_create: boolean;
            can_references: boolean;
            can_trigger: boolean;
            can_truncate: boolean;
          }>
        >`
          select
            has_schema_privilege(${context.runtimeRole}, 'public', 'CREATE') as can_create,
            has_table_privilege(${context.runtimeRole}, 'company_accounts', 'REFERENCES') as can_references,
            has_table_privilege(${context.runtimeRole}, 'company_accounts', 'TRIGGER') as can_trigger,
            has_table_privilege(${context.runtimeRole}, 'company_accounts', 'TRUNCATE') as can_truncate
        `;
        expect(grants).toEqual({
          can_create: false,
          can_references: false,
          can_trigger: false,
          can_truncate: false,
        });
      });
    },
  );

  it(
    "fails closed when a runtime role can inherit or SET ROLE into a parent",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        const parentRole = context.runtimeRole.replace(
          "company_identity_rt_",
          "company_identity_parent_",
        );
        await context.adminSql.unsafe(`create role "${parentRole}" noinherit`);
        try {
          await context.adminSql.unsafe(
            `grant create on schema public to "${parentRole}"`,
          );
          await context.adminSql.unsafe(
            `grant "${parentRole}" to "${context.runtimeRole}"`,
          );
          const privileged = (await import(
            /* @vite-ignore */ new URL("../privileged.js", import.meta.url).href
          )) as unknown as CompanyIdentityPrivilegeModule;
          await expect(
            privileged.configureCompanyIdentityDatabasePrivileges({
              databaseUrl: context.directDatabaseUrl,
              runtimeRole: context.runtimeRole,
              migrationRole: context.migrationRole,
            }),
          ).rejects.toThrow(/membership|inherit|privilege/i);
        } finally {
          await context.adminSql.unsafe(
            `revoke "${parentRole}" from "${context.runtimeRole}"`,
          );
          await context.adminSql.unsafe(
            `revoke all privileges on schema public from "${parentRole}"`,
          );
          await context.adminSql.unsafe(`drop role "${parentRole}"`);
        }
      });
    },
  );

  it(
    "allows runtime audit insert/select while UPDATE and DELETE return 42501",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        const runtimeSql = postgres(context.runtimeDirectDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        try {
          const eventId = randomUUID();
          await runtimeSql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, operation, outcome, metadata)
          values
            (${eventId}, ${randomUUID()}, 'SYSTEM', 'identity:test',
             'SUCCEEDED', ${runtimeSql.json({ source: "privilege-test" })})
        `;
          const [event] = await runtimeSql<{ id: string }[]>`
          select id from company_identity_audit_events where id = ${eventId}
        `;
          expect(event?.id).toBe(eventId);
          await expectDatabaseError(
            () => runtimeSql`
            update company_identity_audit_events
               set outcome = 'FAILED'
             where id = ${eventId}
          `,
            "42501",
          );
          await expectDatabaseError(
            () => runtimeSql`
            delete from company_identity_audit_events where id = ${eventId}
          `,
            "42501",
          );
        } finally {
          await runtimeSql.end();
        }
      });
    },
  );
});

describe("company identity direct migration and doctor privileges", () => {
  it(
    "allows direct DDL and migration-ledger/catalog inspection",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        const directSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        try {
          await directSql`create table company_identity_direct_probe (id integer primary key)`;
          const [table] = await directSql<{ table_name: string }[]>`
          select table_name
            from information_schema.tables
           where table_schema = 'public'
             and table_name = 'company_identity_direct_probe'
        `;
          expect(table?.table_name).toBe("company_identity_direct_probe");
          const [ledger] = await directSql<{ migration_count: number }[]>`
          select count(*)::integer as migration_count
            from drizzle.__drizzle_migrations
        `;
          expect(ledger?.migration_count).toBeGreaterThan(0);
          await directSql`drop table company_identity_direct_probe`;
        } finally {
          await directSql.end();
        }
      });
    },
  );

  it(
    "denies direct-role audit UPDATE, DELETE, and TRUNCATE through the immutable trigger",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        const directSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        try {
          const eventId = randomUUID();
          await directSql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, operation, outcome, metadata)
          values
            (${eventId}, ${randomUUID()}, 'SYSTEM', 'identity:direct-test',
             'SUCCEEDED', ${directSql.json({ source: "direct-privilege-test" })})
        `;
          await expectDatabaseError(
            () => directSql`
            update company_identity_audit_events
               set outcome = 'FAILED'
             where id = ${eventId}
          `,
            "55000",
            "company_identity_audit_events is immutable",
          );
          await expectDatabaseError(
            () => directSql`
            delete from company_identity_audit_events where id = ${eventId}
          `,
            "55000",
            "company_identity_audit_events is immutable",
          );
          await expectDatabaseError(
            () => directSql`truncate table company_identity_audit_events`,
            "55000",
            "company_identity_audit_events is immutable",
          );
        } finally {
          await directSql.end();
        }
      });
    },
  );

  it(
    "runs the production identity doctor through direct credentials and reports clean",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await preparePrivileges(context);
        let doctor: Record<string, unknown>;
        try {
          const doctorUrl = new URL("../doctor.js", import.meta.url).href;
          doctor = (await import(/* @vite-ignore */ doctorUrl)) as Record<
            string,
            unknown
          >;
        } catch (error) {
          throw new Error(
            "PostgreSQL 16 and identity migrations were reached, but company-identity/doctor.ts is absent",
            { cause: error },
          );
        }
        expect(doctor.inspectCompanyIdentityDatabase).toBeTypeOf("function");
        const result = await (
          doctor as unknown as CompanyIdentityDoctorModule
        ).inspectCompanyIdentityDatabase({
          directDatabaseUrl: context.directDatabaseUrl,
        });
        expect(result).toMatchObject({ clean: true, issues: [] });
        expect(result.sentinels.length).toBeGreaterThan(0);
      });
    },
  );
});
