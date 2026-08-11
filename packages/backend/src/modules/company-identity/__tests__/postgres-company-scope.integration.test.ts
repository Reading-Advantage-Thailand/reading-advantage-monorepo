import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

type Sql = ReturnType<typeof postgres>;

interface ScratchDatabaseContext {
  readonly directDatabaseUrl: string;
  readonly databaseName: string;
  readonly adminSql: Sql;
}

interface ScratchDatabaseModule {
  withCompanyIdentityScratchDatabase<T>(
    testBody: (context: ScratchDatabaseContext) => Promise<T> | T,
  ): Promise<T>;
}

/** Loads the shared disposable PostgreSQL harness without widening the backend type-check root. */
async function withScratchDatabase<T>(
  testBody: (context: ScratchDatabaseContext) => Promise<T> | T,
): Promise<T> {
  const module = (await import(
    /* @vite-ignore */ new URL(
      "../../../../../db/src/company-identity/__tests__/test-postgres.js",
      import.meta.url,
    ).href
  )) as ScratchDatabaseModule;
  return module.withCompanyIdentityScratchDatabase(testBody);
}

/** Applies the dedicated company-identity migration to one disposable database. */
async function migrateScratchDatabase(
  context: ScratchDatabaseContext,
): Promise<void> {
  const migration = (await import(
    /* @vite-ignore */ new URL(
      "../../../../../db/src/company-identity/migration.js",
      import.meta.url,
    ).href
  )) as CompanyIdentityMigrationModule;
  await migration.migrateCompanyIdentity({
    directDatabaseUrl: context.directDatabaseUrl,
  });
}

/** Seeds two organization contexts with an administrator outside the active company. */
async function seedSuspendedCrossCompanyFixture(sql: Sql): Promise<{
  readonly actorAccountId: string;
  readonly targetAccountId: string;
}> {
  const activeOrganizationId = randomUUID();
  const suspendedOrganizationId = randomUUID();
  const actorAccountId = randomUUID();
  const targetAccountId = randomUUID();
  const actorMembershipId = randomUUID();
  const targetMembershipId = randomUUID();

  await sql`
    insert into company_organizations
      (id, stable_key, display_name, organization_type, status)
    values
      (${activeOrganizationId}, 'internal-company', 'Internal Company', 'INTERNAL_COMPANY', 'ACTIVE'),
      (${suspendedOrganizationId}, 'other-company', 'Other Company', 'INTERNAL_COMPANY', 'SUSPENDED')
  `;
  await sql`
    insert into company_accounts
      (id, username, normalized_username, display_name, status)
    values
      (${actorAccountId}, 'other-admin', 'other-admin', 'Other Company Admin', 'ACTIVE'),
      (${targetAccountId}, 'internal-employee', 'internal-employee', 'Internal Employee', 'ACTIVE')
  `;
  await sql`
    insert into company_organization_memberships
      (id, organization_id, account_id, status)
    values
      (${actorMembershipId}, ${suspendedOrganizationId}, ${actorAccountId}, 'ACTIVE'),
      (${targetMembershipId}, ${activeOrganizationId}, ${targetAccountId}, 'ACTIVE')
  `;
  await sql`
    insert into company_role_assignments
      (organization_id, membership_id, role_key, assigned_by_account_id)
    values
      (${suspendedOrganizationId}, ${actorMembershipId}, 'COMPANY_ADMIN', ${actorAccountId}),
      (${activeOrganizationId}, ${targetMembershipId}, 'EMPLOYEE', ${actorAccountId})
  `;

  return { actorAccountId, targetAccountId };
}

/** Captures whether one administrative operation was denied or incorrectly allowed. */
async function captureAttempt(
  operation: () => Promise<unknown>,
): Promise<{ readonly outcome: "DENIED" | "ALLOWED"; readonly code?: string }> {
  try {
    await operation();
    return { outcome: "ALLOWED" };
  } catch (error) {
    return {
      outcome: "DENIED",
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "UNKNOWN",
    };
  }
}

describe("company-identity organization safety", () => {
  it(
    "denies list and mutation operations across organization boundaries",
    { timeout: 60_000 },
    async () => {
      await withScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = postgres(context.directDatabaseUrl, {
          max: 2,
          prepare: false,
        });
        try {
          const fixture = await seedSuspendedCrossCompanyFixture(sql);
          const repository = createPostgresCompanyIdentityRepository(sql);
          const attempts = [
            await captureAttempt(() =>
              repository.listEmployees(fixture.actorAccountId),
            ),
            await captureAttempt(() =>
              repository.setEmployeeStatus({
                actorAccountId: fixture.actorAccountId,
                targetAccountId: fixture.targetAccountId,
                status: "SUSPENDED",
                idempotencyKey: "cross-company-status-0001",
                correlationId: randomUUID(),
              }),
            ),
            await captureAttempt(() =>
              repository.setCompanyRoles({
                actorAccountId: fixture.actorAccountId,
                targetAccountId: fixture.targetAccountId,
                roleKeys: ["COMPANY_ADMIN"],
                idempotencyKey: "cross-company-roles-0001",
                correlationId: randomUUID(),
              }),
            ),
          ];

          expect(attempts).toEqual([
            { outcome: "DENIED", code: "FORBIDDEN" },
            { outcome: "DENIED", code: "FORBIDDEN" },
            { outcome: "DENIED", code: "FORBIDDEN" },
          ]);

          const [target] = await sql<Array<{ status: "ACTIVE" | "SUSPENDED" }>>`
            select status from company_accounts where id = ${fixture.targetAccountId}
          `;
          const roles = await sql<Array<{ role_key: string }>>`
            select role_key
              from company_role_assignments
             where membership_id = (
               select id
                 from company_organization_memberships
                where account_id = ${fixture.targetAccountId}
             )
             order by role_key
          `;
          expect(target?.status).toBe("ACTIVE");
          expect(roles.map(({ role_key }) => role_key)).toEqual(["EMPLOYEE"]);
        } finally {
          await sql.end({ timeout: 5 });
        }
      });
    },
  );

  it(
    "rejects a second active internal-company organization",
    { timeout: 60_000 },
    async () => {
      await withScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        await context.adminSql`
          insert into company_organizations
            (id, stable_key, display_name, organization_type, status)
          values
            (${randomUUID()}, 'internal-company', 'Internal Company', 'INTERNAL_COMPANY', 'ACTIVE')
        `;

        let secondInsertError: unknown;
        try {
          await context.adminSql`
            insert into company_organizations
              (id, stable_key, display_name, organization_type, status)
            values
              (${randomUUID()}, 'second-company', 'Second Company', 'INTERNAL_COMPANY', 'ACTIVE')
          `;
        } catch (error) {
          secondInsertError = error;
        }

        expect(secondInsertError).toBeDefined();
        const [count] = await context.adminSql<
          Array<{ active_internal_company_organizations: number }>
        >`
          select count(*)::int as active_internal_company_organizations
            from company_organizations
           where organization_type = 'INTERNAL_COMPANY'
             and status = 'ACTIVE'
        `;
        expect(
          `Active internal-company organizations: ${count?.active_internal_company_organizations}`,
        ).toBe("Active internal-company organizations: 1");
      });
    },
  );
});
