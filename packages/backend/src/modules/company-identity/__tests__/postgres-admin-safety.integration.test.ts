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

/** Creates one active organization and two active company administrators. */
async function seedTwoAdministratorFixture(sql: Sql): Promise<{
  readonly firstAdminId: string;
  readonly secondAdminId: string;
}> {
  const organizationId = randomUUID();
  const firstAdminId = randomUUID();
  const secondAdminId = randomUUID();
  const firstMembershipId = randomUUID();
  const secondMembershipId = randomUUID();

  await sql`
    insert into company_organizations
      (id, stable_key, display_name, organization_type, status)
    values
      (${organizationId}, 'internal-company', 'Internal Company', 'INTERNAL_COMPANY', 'ACTIVE')
  `;
  await sql`
    insert into company_accounts
      (id, username, normalized_username, display_name, status)
    values
      (${firstAdminId}, 'first-admin', 'first-admin', 'First Admin', 'ACTIVE'),
      (${secondAdminId}, 'second-admin', 'second-admin', 'Second Admin', 'ACTIVE')
  `;
  await sql`
    insert into company_organization_memberships
      (id, organization_id, account_id, status)
    values
      (${firstMembershipId}, ${organizationId}, ${firstAdminId}, 'ACTIVE'),
      (${secondMembershipId}, ${organizationId}, ${secondAdminId}, 'ACTIVE')
  `;
  await sql`
    insert into company_role_assignments
      (organization_id, membership_id, role_key, assigned_by_account_id)
    values
      (${organizationId}, ${firstMembershipId}, 'COMPANY_ADMIN', ${secondAdminId}),
      (${organizationId}, ${secondMembershipId}, 'COMPANY_ADMIN', ${firstAdminId})
  `;

  return { firstAdminId, secondAdminId };
}

/** Creates an administrator, two ordinary targets, and live central/child sessions. */
async function seedRevocationFixture(sql: Sql): Promise<{
  readonly actorAccountId: string;
  readonly credentialTargetId: string;
  readonly suspensionTargetId: string;
  readonly credentialSsoSessionId: string;
  readonly credentialApplicationSessionId: string;
  readonly suspensionSsoSessionId: string;
  readonly suspensionApplicationSessionId: string;
}> {
  const organizationId = randomUUID();
  const applicationId = randomUUID();
  const actorAccountId = randomUUID();
  const credentialTargetId = randomUUID();
  const suspensionTargetId = randomUUID();
  const actorMembershipId = randomUUID();
  const credentialMembershipId = randomUUID();
  const suspensionMembershipId = randomUUID();
  const credentialSsoSessionId = randomUUID();
  const credentialApplicationSessionId = randomUUID();
  const suspensionSsoSessionId = randomUUID();
  const suspensionApplicationSessionId = randomUUID();
  const createdAt = new Date("2026-08-11T00:00:00.000Z");
  const expiresAt = new Date("2026-08-11T02:00:00.000Z");

  await sql`
    insert into company_organizations
      (id, stable_key, display_name, organization_type, status)
    values
      (${organizationId}, 'internal-company', 'Internal Company', 'INTERNAL_COMPANY', 'ACTIVE')
  `;
  await sql`
    insert into company_applications (id, stable_key, display_name, status)
    values (${applicationId}, 'admin-safety-app', 'Admin Safety App', 'ACTIVE')
  `;
  await sql`
    insert into company_accounts
      (id, username, normalized_username, display_name, status)
    values
      (${actorAccountId}, 'safety-admin', 'safety-admin', 'Safety Admin', 'ACTIVE'),
      (${credentialTargetId}, 'credential-target', 'credential-target', 'Credential Target', 'ACTIVE'),
      (${suspensionTargetId}, 'suspension-target', 'suspension-target', 'Suspension Target', 'ACTIVE')
  `;
  await sql`
    insert into company_password_credentials (account_id, password_hash, algorithm)
    values
      (${credentialTargetId}, '$argon2id$integration-old', 'ARGON2ID'),
      (${suspensionTargetId}, '$argon2id$integration-old', 'ARGON2ID')
  `;
  await sql`
    insert into company_organization_memberships
      (id, organization_id, account_id, status)
    values
      (${actorMembershipId}, ${organizationId}, ${actorAccountId}, 'ACTIVE'),
      (${credentialMembershipId}, ${organizationId}, ${credentialTargetId}, 'ACTIVE'),
      (${suspensionMembershipId}, ${organizationId}, ${suspensionTargetId}, 'ACTIVE')
  `;
  await sql`
    insert into company_role_assignments
      (organization_id, membership_id, role_key, assigned_by_account_id)
    values
      (${organizationId}, ${actorMembershipId}, 'COMPANY_ADMIN', ${actorAccountId}),
      (${organizationId}, ${credentialMembershipId}, 'EMPLOYEE', ${actorAccountId}),
      (${organizationId}, ${suspensionMembershipId}, 'EMPLOYEE', ${actorAccountId})
  `;
  await sql`
    insert into company_sso_sessions
      (id, token_hash, organization_id, membership_id, account_auth_version,
       created_at, last_seen_at, idle_expires_at, absolute_expires_at, user_agent)
    values
      (${credentialSsoSessionId}, ${"1".repeat(64)}, ${organizationId}, ${credentialMembershipId}, 1,
       ${createdAt}, ${createdAt}, ${new Date("2026-08-11T01:00:00.000Z")}, ${expiresAt}, 'red-test'),
      (${suspensionSsoSessionId}, ${"2".repeat(64)}, ${organizationId}, ${suspensionMembershipId}, 1,
       ${createdAt}, ${createdAt}, ${new Date("2026-08-11T01:00:00.000Z")}, ${expiresAt}, 'red-test')
  `;
  await sql`
    insert into company_application_sessions
      (id, token_hash, sso_session_id, organization_id, membership_id,
       application_id, account_auth_version, created_at, last_checked_at, expires_at)
    values
      (${credentialApplicationSessionId}, ${"3".repeat(64)}, ${credentialSsoSessionId}, ${organizationId}, ${credentialMembershipId},
       ${applicationId}, 1, ${createdAt}, ${createdAt}, ${expiresAt}),
      (${suspensionApplicationSessionId}, ${"4".repeat(64)}, ${suspensionSsoSessionId}, ${organizationId}, ${suspensionMembershipId},
       ${applicationId}, 1, ${createdAt}, ${createdAt}, ${expiresAt})
  `;

  return {
    actorAccountId,
    credentialTargetId,
    suspensionTargetId,
    credentialSsoSessionId,
    credentialApplicationSessionId,
    suspensionSsoSessionId,
    suspensionApplicationSessionId,
  };
}

/** Returns the safe code from one rejected concurrent repository operation. */
function errorCode(result: PromiseSettledResult<unknown>): string | undefined {
  return result.status === "rejected" &&
    typeof result.reason === "object" &&
    result.reason !== null &&
    "code" in result.reason
    ? String(result.reason.code)
    : undefined;
}

describe("company-identity last-administrator and revocation safety", () => {
  it(
    "allows exactly one of two concurrent last-admin role removals",
    { timeout: 60_000 },
    async () => {
      await withScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const seedSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        const firstSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        const secondSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        try {
          const fixture = await seedTwoAdministratorFixture(seedSql);
          const firstRepository =
            createPostgresCompanyIdentityRepository(firstSql);
          const secondRepository =
            createPostgresCompanyIdentityRepository(secondSql);
          const results = await Promise.allSettled([
            firstRepository.setCompanyRoles({
              actorAccountId: fixture.secondAdminId,
              targetAccountId: fixture.firstAdminId,
              roleKeys: ["EMPLOYEE"],
              idempotencyKey: "concurrent-role-removal-first",
              correlationId: randomUUID(),
            }),
            secondRepository.setCompanyRoles({
              actorAccountId: fixture.firstAdminId,
              targetAccountId: fixture.secondAdminId,
              roleKeys: ["EMPLOYEE"],
              idempotencyKey: "concurrent-role-removal-second",
              correlationId: randomUUID(),
            }),
          ]);

          expect(
            results.filter(({ status }) => status === "fulfilled"),
          ).toHaveLength(1);
          expect(
            results.filter(({ status }) => status === "rejected"),
          ).toHaveLength(1);
          expect(
            results.map((result) => errorCode(result)).filter(Boolean),
          ).toEqual(["LAST_COMPANY_ADMIN_REQUIRED"]);
          const [count] = await seedSql<Array<{ active_admins: number }>>`
            select count(*)::int as active_admins
              from company_role_assignments role
              join company_organization_memberships membership
                on membership.id = role.membership_id
               and membership.organization_id = role.organization_id
             join company_accounts account on account.id = membership.account_id
             where role.role_key = 'COMPANY_ADMIN'
               and membership.status = 'ACTIVE'
               and account.status = 'ACTIVE'
          `;
          expect(`Active administrators: ${count?.active_admins}`).toBe(
            "Active administrators: 1",
          );
        } finally {
          await Promise.all([
            seedSql.end({ timeout: 5 }),
            firstSql.end({ timeout: 5 }),
            secondSql.end({ timeout: 5 }),
          ]);
        }
      });
    },
  );

  it(
    "allows exactly one of two concurrent last-admin suspensions",
    { timeout: 60_000 },
    async () => {
      await withScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const seedSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        const firstSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        const secondSql = postgres(context.directDatabaseUrl, {
          max: 1,
          prepare: false,
        });
        try {
          const fixture = await seedTwoAdministratorFixture(seedSql);
          const firstRepository =
            createPostgresCompanyIdentityRepository(firstSql);
          const secondRepository =
            createPostgresCompanyIdentityRepository(secondSql);
          const results = await Promise.allSettled([
            firstRepository.setEmployeeStatus({
              actorAccountId: fixture.secondAdminId,
              targetAccountId: fixture.firstAdminId,
              status: "SUSPENDED",
              idempotencyKey: "concurrent-status-change-first",
              correlationId: randomUUID(),
            }),
            secondRepository.setEmployeeStatus({
              actorAccountId: fixture.firstAdminId,
              targetAccountId: fixture.secondAdminId,
              status: "SUSPENDED",
              idempotencyKey: "concurrent-status-change-second",
              correlationId: randomUUID(),
            }),
          ]);

          expect(
            results.filter(({ status }) => status === "fulfilled"),
          ).toHaveLength(1);
          expect(
            results.filter(({ status }) => status === "rejected"),
          ).toHaveLength(1);
          expect(
            results.map((result) => errorCode(result)).filter(Boolean),
          ).toEqual(["LAST_COMPANY_ADMIN_REQUIRED"]);
          const [count] = await seedSql<Array<{ active_admins: number }>>`
            select count(*)::int as active_admins
              from company_role_assignments role
              join company_organization_memberships membership
                on membership.id = role.membership_id
               and membership.organization_id = role.organization_id
             join company_accounts account on account.id = membership.account_id
             where role.role_key = 'COMPANY_ADMIN'
               and membership.status = 'ACTIVE'
               and account.status = 'ACTIVE'
          `;
          expect(`Active administrators: ${count?.active_admins}`).toBe(
            "Active administrators: 1",
          );
        } finally {
          await Promise.all([
            seedSql.end({ timeout: 5 }),
            firstSql.end({ timeout: 5 }),
            secondSql.end({ timeout: 5 }),
          ]);
        }
      });
    },
  );

  it(
    "increments auth versions and revokes central and child sessions for reset and suspension",
    { timeout: 60_000 },
    async () => {
      await withScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = postgres(context.directDatabaseUrl, {
          max: 2,
          prepare: false,
        });
        try {
          const fixture = await seedRevocationFixture(sql);
          const repository = createPostgresCompanyIdentityRepository(sql);

          await expect(
            repository.resetCredential({
              actorAccountId: fixture.actorAccountId,
              targetAccountId: fixture.credentialTargetId,
              passwordHash: "$argon2id$integration-new",
              credentialFingerprint: "a".repeat(64),
              idempotencyKey: "credential-reset-session-revoke",
              correlationId: randomUUID(),
            }),
          ).resolves.toMatchObject({ sessionsRevoked: 1 });

          await expect(
            repository.setEmployeeStatus({
              actorAccountId: fixture.actorAccountId,
              targetAccountId: fixture.suspensionTargetId,
              status: "SUSPENDED",
              idempotencyKey: "suspension-session-revoke",
              correlationId: randomUUID(),
            }),
          ).resolves.toMatchObject({ sessionsRevoked: 1 });

          const accountRows = await sql<
            Array<{ id: string; auth_version: number }>
          >`
            select id, auth_version::int as auth_version
              from company_accounts
             where id = ${fixture.credentialTargetId}
                or id = ${fixture.suspensionTargetId}
             order by id
          `;
          expect(accountRows).toHaveLength(2);
          expect(
            accountRows.every(({ auth_version }) => auth_version === 2),
          ).toBe(true);

          const sessions = await sql<
            Array<{
              id: string;
              revoked_at: Date | null;
              revoke_reason: string | null;
            }>
          >`
            select id, revoked_at, revoke_reason
              from company_sso_sessions
             where id = ${fixture.credentialSsoSessionId}
                or id = ${fixture.suspensionSsoSessionId}
             order by id
          `;
          const childSessions = await sql<
            Array<{
              id: string;
              revoked_at: Date | null;
              revoke_reason: string | null;
            }>
          >`
            select id, revoked_at, revoke_reason
              from company_application_sessions
             where id = ${fixture.credentialApplicationSessionId}
                or id = ${fixture.suspensionApplicationSessionId}
             order by id
          `;
          expect(sessions).toHaveLength(2);
          expect(childSessions).toHaveLength(2);
          expect(sessions.every(({ revoked_at }) => revoked_at !== null)).toBe(
            true,
          );
          expect(
            childSessions.every(({ revoked_at }) => revoked_at !== null),
          ).toBe(true);
          expect(
            sessions.map(({ revoke_reason }) => revoke_reason).sort(),
          ).toEqual(["ACCOUNT_SUSPENDED", "CREDENTIAL_RESET"]);
          expect(
            childSessions.map(({ revoke_reason }) => revoke_reason).sort(),
          ).toEqual(["ACCOUNT_SUSPENDED", "CREDENTIAL_RESET"]);
        } finally {
          await sql.end({ timeout: 5 });
        }
      });
    },
  );
});
