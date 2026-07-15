/**
 * Red-phase PostgreSQL constraint tests for the company-identity schema.
 *
 * Every test proves a real PostgreSQL 16 scratch connection before loading
 * the absent production migrator. Missing configuration is never skipped.
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

type DatabaseError = Error & {
  code?: string;
  constraint_name?: string;
};

async function migrateScratchDatabase(
  context: CompanyIdentityScratchDatabaseContext,
): Promise<void> {
  const [row] = await context.adminSql<
    { database_name: string; version_number: string }[]
  >`select current_database() as database_name,
           current_setting('server_version_num') as version_number`;
  expect(row?.database_name).toBe(context.databaseName);
  expect(Number(row?.version_number)).toBeGreaterThanOrEqual(160000);
  expect(Number(row?.version_number)).toBeLessThan(170000);

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
}

async function expectDatabaseError(
  operation: () => Promise<unknown>,
  code: string,
  constraintName?: string,
): Promise<void> {
  let caught: DatabaseError | undefined;
  try {
    await operation();
  } catch (error) {
    caught = error as DatabaseError;
  }
  expect(caught, `Expected PostgreSQL SQLSTATE ${code}`).toBeDefined();
  expect(caught?.code).toBe(code);
  if (constraintName) expect(caught?.constraint_name).toBe(constraintName);
}

async function seedRoleAssignmentGraph(sql: postgres.Sql): Promise<{
  accountId: string;
  membershipId: string;
  organizationId: string;
  otherOrganizationId: string;
  salesApplicationId: string;
  marketingApplicationId: string;
}> {
  const accountId = randomUUID();
  const membershipId = randomUUID();
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const salesApplicationId = randomUUID();
  const marketingApplicationId = randomUUID();

  await sql`
    insert into company_accounts
      (id, username, normalized_username, display_name)
    values (${accountId}, 'Ada', 'ada', 'Ada Lovelace')
  `;
  await sql`
    insert into company_organizations (id, stable_key, display_name)
    values
      (${organizationId}, 'internal-company', 'Internal Company'),
      (${otherOrganizationId}, 'other-internal', 'Other Internal')
  `;
  await sql`
    insert into company_organization_memberships
      (id, organization_id, account_id)
    values (${membershipId}, ${organizationId}, ${accountId})
  `;
  await sql`
    insert into company_applications (id, stable_key, display_name)
    values
      (${salesApplicationId}, 'sales', 'Sales Advantage'),
      (${marketingApplicationId}, 'marketing', 'Marketing')
  `;
  await sql`
    insert into company_application_role_definitions
      (application_id, role_key, display_name, description)
    values
      (${salesApplicationId}, 'SALES_REP', 'Sales representative', 'Sales access'),
      (${marketingApplicationId}, 'MEMBER', 'Marketing member', 'Marketing access')
  `;

  return {
    accountId,
    membershipId,
    organizationId,
    otherOrganizationId,
    salesApplicationId,
    marketingApplicationId,
  };
}

async function insertValidSsoSession(
  sql: postgres.Sql,
  graph: Awaited<ReturnType<typeof seedRoleAssignmentGraph>>,
): Promise<string> {
  const sessionId = randomUUID();
  const createdAt = new Date("2026-07-15T00:00:00.000Z");
  await sql`
    insert into company_sso_sessions
      (id, token_hash, organization_id, membership_id, account_auth_version,
       created_at, last_seen_at, idle_expires_at, absolute_expires_at)
    values
      (${sessionId}, ${"a".repeat(64)}, ${graph.organizationId},
       ${graph.membershipId}, 1, ${createdAt}, ${createdAt},
       ${new Date("2026-07-15T01:00:00.000Z")},
       ${new Date("2026-07-16T00:00:00.000Z")})
  `;
  return sessionId;
}

async function insertOidcClientAndRedirect(
  sql: postgres.Sql,
  applicationId: string,
  suffix: string,
): Promise<{ clientId: string; redirectId: string }> {
  const clientId = randomUUID();
  const redirectId = randomUUID();
  await sql`
    insert into company_oidc_clients
      (id, application_id, client_id, client_type, token_auth_method)
    values (${clientId}, ${applicationId}, ${`client-${suffix}`}, 'PUBLIC', 'NONE')
  `;
  await sql`
    insert into company_oidc_redirect_uris
      (id, oidc_client_id, redirect_uri)
    values
      (${redirectId}, ${clientId},
       ${`https://${suffix}.example.test/auth/callback`})
  `;
  return { clientId, redirectId };
}

describe("company identity PostgreSQL constraints", () => {
  it(
    "rejects normalized username collisions by reviewed unique name",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        try {
          await sql`
          insert into company_accounts
            (id, username, normalized_username, display_name)
          values (${randomUUID()}, 'Ada', 'ada', 'Ada Lovelace')
        `;
          await expectDatabaseError(
            () => sql`
            insert into company_accounts
              (id, username, normalized_username, display_name)
            values (${randomUUID()}, 'ADA', 'ada', 'Another Ada')
          `,
            "23505",
            "company_accounts_normalized_username_unique",
          );
        } finally {
          // The shared harness owns and closes adminSql after this callback.
        }
      });
    },
  );

  it(
    "rejects cross-organization memberships and cross-application roles",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        try {
          const graph = await seedRoleAssignmentGraph(sql);
          await expectDatabaseError(
            () => sql`
            insert into company_application_role_assignments
              (organization_id, membership_id, application_id, role_key)
            values
              (${graph.otherOrganizationId}, ${graph.membershipId},
               ${graph.salesApplicationId}, 'SALES_REP')
          `,
            "23503",
            "company_app_role_assignments_membership_fk",
          );
          await expectDatabaseError(
            () => sql`
            insert into company_application_role_assignments
              (organization_id, membership_id, application_id, role_key)
            values
              (${graph.organizationId}, ${graph.membershipId},
               ${graph.salesApplicationId}, 'MEMBER')
          `,
            "23503",
            "company_app_role_assignments_role_definition_fk",
          );
        } finally {
          // The shared harness owns and closes adminSql after this callback.
        }
      });
    },
  );

  it(
    "rejects duplicate membership/application/role grants",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        try {
          const graph = await seedRoleAssignmentGraph(sql);
          await sql`
          insert into company_application_role_assignments
            (organization_id, membership_id, application_id, role_key)
          values
            (${graph.organizationId}, ${graph.membershipId},
             ${graph.salesApplicationId}, 'SALES_REP')
        `;
          await expectDatabaseError(
            () => sql`
            insert into company_application_role_assignments
              (organization_id, membership_id, application_id, role_key)
            values
              (${graph.organizationId}, ${graph.membershipId},
               ${graph.salesApplicationId}, 'SALES_REP')
          `,
            "23505",
            "company_app_role_assignments_membership_app_role_unique",
          );
        } finally {
          // The shared harness owns and closes adminSql after this callback.
        }
      });
    },
  );

  it(
    "rejects non-future grant expiry and inconsistent membership end state",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        try {
          const graph = await seedRoleAssignmentGraph(sql);
          const assignedAt = new Date("2026-07-15T00:00:00.000Z");
          await expectDatabaseError(
            () => sql`
            insert into company_application_role_assignments
              (organization_id, membership_id, application_id, role_key,
               assigned_at, expires_at)
            values
              (${graph.organizationId}, ${graph.membershipId},
               ${graph.salesApplicationId}, 'SALES_REP',
               ${assignedAt}, ${assignedAt})
          `,
            "23514",
            "company_app_role_assignments_expiry_check",
          );
          await expectDatabaseError(
            () => sql`
            update company_organization_memberships
               set status = 'ACTIVE', ended_at = now()
             where id = ${graph.membershipId}
          `,
            "23514",
            "company_memberships_ended_state_check",
          );
        } finally {
          // The shared harness owns and closes adminSql after this callback.
        }
      });
    },
  );

  it(
    "rejects unknown PostgreSQL status enum values with SQLSTATE 22P02",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        try {
          await expectDatabaseError(
            () => sql`
            insert into company_accounts
              (id, username, normalized_username, display_name, status)
            values
              (${randomUUID()}, 'Grace', 'grace', 'Grace Hopper', 'DELETED')
          `,
            "22P02",
          );
        } finally {
          // The shared harness owns and closes adminSql after this callback.
        }
      });
    },
  );

  it(
    "allows one company role and rejects orphan or duplicate membership roles",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        const graph = await seedRoleAssignmentGraph(sql);
        await sql`
        insert into company_role_assignments
          (organization_id, membership_id, role_key)
        values (${graph.organizationId}, ${graph.membershipId}, 'EMPLOYEE')
      `;
        const assigned = await sql<{ role_key: string }[]>`
        select role_key from company_role_assignments
         where membership_id = ${graph.membershipId}
      `;
        expect(assigned.map(({ role_key }) => role_key)).toEqual(["EMPLOYEE"]);
        await expectDatabaseError(
          () => sql`
          insert into company_role_assignments
            (organization_id, membership_id, role_key)
          values (${graph.otherOrganizationId}, ${graph.membershipId}, 'COMPANY_ADMIN')
        `,
          "23503",
          "company_role_assignments_membership_fk",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_role_assignments
            (organization_id, membership_id, role_key)
          values (${graph.organizationId}, ${graph.membershipId}, 'EMPLOYEE')
        `,
          "23505",
          "company_role_assignments_pkey",
        );
      });
    },
  );

  it(
    "allows membership-anchored sessions and rejects orphan SSO or application sessions",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        const graph = await seedRoleAssignmentGraph(sql);
        const ssoSessionId = await insertValidSsoSession(sql, graph);
        await sql`
        insert into company_application_sessions
          (id, token_hash, sso_session_id, organization_id, membership_id,
           application_id, account_auth_version, created_at, last_checked_at,
           expires_at)
        values
          (${randomUUID()}, ${"b".repeat(64)}, ${ssoSessionId},
           ${graph.organizationId}, ${graph.membershipId},
           ${graph.salesApplicationId}, 1,
           ${new Date("2026-07-15T00:00:00.000Z")},
           ${new Date("2026-07-15T00:00:00.000Z")},
           ${new Date("2026-07-15T01:00:00.000Z")})
      `;
        const [counts] = await sql<{ sso_count: number; app_count: number }[]>`
        select
          (select count(*)::integer from company_sso_sessions) as sso_count,
          (select count(*)::integer from company_application_sessions) as app_count
      `;
        expect(counts).toEqual({ sso_count: 1, app_count: 1 });

        await expectDatabaseError(
          () => sql`
          insert into company_sso_sessions
            (id, token_hash, organization_id, membership_id,
             account_auth_version, idle_expires_at, absolute_expires_at)
          values
            (${randomUUID()}, ${"c".repeat(64)}, ${graph.organizationId},
             ${randomUUID()}, 1, now() + interval '1 hour',
             now() + interval '1 day')
        `,
          "23503",
          "company_sso_sessions_membership_fk",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_application_sessions
            (id, token_hash, sso_session_id, organization_id, membership_id,
             application_id, account_auth_version, expires_at)
          values
            (${randomUUID()}, ${"d".repeat(64)}, ${randomUUID()},
             ${graph.organizationId}, ${graph.membershipId},
             ${graph.salesApplicationId}, 1, now() + interval '1 hour')
        `,
          "23503",
          "company_application_sessions_sso_scope_fk",
        );
      });
    },
  );

  it(
    "allows one exact-client OIDC code and rejects orphan or cross-client codes",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        const graph = await seedRoleAssignmentGraph(sql);
        const ssoSessionId = await insertValidSsoSession(sql, graph);
        const salesClient = await insertOidcClientAndRedirect(
          sql,
          graph.salesApplicationId,
          "sales",
        );
        const marketingClient = await insertOidcClientAndRedirect(
          sql,
          graph.marketingApplicationId,
          "marketing",
        );
        await sql`
        insert into company_oidc_authorization_codes
          (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
           code_challenge, nonce, expires_at)
        values
          (${randomUUID()}, ${"e".repeat(64)}, ${salesClient.clientId},
           ${salesClient.redirectId}, ${ssoSessionId}, ${"A".repeat(43)},
           'nonce-valid', now() + interval '5 minutes')
      `;
        const [{ count }] = await sql<{ count: number }[]>`
        select count(*)::integer as count
          from company_oidc_authorization_codes
      `;
        expect(count).toBe(1);
        await expectDatabaseError(
          () => sql`
          insert into company_oidc_authorization_codes
            (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
             code_challenge, nonce, expires_at)
          values
            (${randomUUID()}, ${"f".repeat(64)}, ${randomUUID()},
             ${salesClient.redirectId}, ${ssoSessionId}, ${"B".repeat(43)},
             'nonce-orphan', now() + interval '5 minutes')
        `,
          "23503",
          "company_oidc_authorization_codes_client_fk",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_oidc_authorization_codes
            (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
             code_challenge, nonce, expires_at)
          values
            (${randomUUID()}, ${"0".repeat(64)}, ${marketingClient.clientId},
             ${salesClient.redirectId}, ${ssoSessionId}, ${"C".repeat(43)},
             'nonce-cross-client', now() + interval '5 minutes')
        `,
          "23503",
          "company_oidc_authorization_codes_redirect_client_fk",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_oidc_authorization_codes
            (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
             code_challenge, nonce, expires_at)
          values
            (${randomUUID()}, ${"1".repeat(64)}, ${salesClient.clientId},
             ${salesClient.redirectId}, ${randomUUID()}, ${"D".repeat(43)},
             'nonce-orphan-session', now() + interval '5 minutes')
        `,
          "23503",
          "company_oidc_authorization_codes_sso_session_fk",
        );
      });
    },
  );

  it(
    "rejects invalid SSO, application-session, and authorization-code expiry ordering",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        const graph = await seedRoleAssignmentGraph(sql);
        const createdAt = new Date("2026-07-15T00:00:00.000Z");
        await expectDatabaseError(
          () => sql`
          insert into company_sso_sessions
            (id, token_hash, organization_id, membership_id,
             account_auth_version, created_at, last_seen_at,
             idle_expires_at, absolute_expires_at)
          values
            (${randomUUID()}, ${"2".repeat(64)}, ${graph.organizationId},
             ${graph.membershipId}, 1, ${createdAt}, ${createdAt},
             ${createdAt}, ${new Date("2026-07-16T00:00:00.000Z")})
        `,
          "23514",
          "company_sso_sessions_expiry_order_check",
        );
        const ssoSessionId = await insertValidSsoSession(sql, graph);
        await expectDatabaseError(
          () => sql`
          insert into company_application_sessions
            (id, token_hash, sso_session_id, organization_id, membership_id,
             application_id, account_auth_version, created_at, expires_at)
          values
            (${randomUUID()}, ${"3".repeat(64)}, ${ssoSessionId},
             ${graph.organizationId}, ${graph.membershipId},
             ${graph.salesApplicationId}, 1, ${createdAt}, ${createdAt})
        `,
          "23514",
          "company_application_sessions_expiry_check",
        );
        const client = await insertOidcClientAndRedirect(
          sql,
          graph.salesApplicationId,
          "expiry",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_oidc_authorization_codes
            (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
             code_challenge, nonce, issued_at, expires_at)
          values
            (${randomUUID()}, ${"4".repeat(64)}, ${client.clientId},
             ${client.redirectId}, ${ssoSessionId}, ${"E".repeat(43)},
             'nonce-expired', ${createdAt}, ${createdAt})
        `,
          "23514",
          "company_oidc_codes_expiry_check",
        );
      });
    },
  );

  it(
    "enforces ACCOUNT, SERVICE, and SYSTEM audit actor rules",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        const graph = await seedRoleAssignmentGraph(sql);
        await sql`
        insert into company_identity_audit_events
          (id, correlation_id, actor_type, operation, outcome, metadata)
        values
          (${randomUUID()}, ${randomUUID()}, 'SYSTEM', 'identity:test',
           'SUCCEEDED', ${sql.json({ source: "constraint-test" })})
      `;
        await sql`
        insert into company_identity_audit_events
          (id, correlation_id, actor_type, actor_account_id, operation,
           outcome, metadata)
        values
          (${randomUUID()}, ${randomUUID()}, 'ACCOUNT', ${graph.accountId},
           'identity:test', 'SUCCEEDED',
           ${sql.json({ source: "constraint-test" })})
      `;
        await sql`
        insert into company_identity_audit_events
          (id, correlation_id, actor_type, actor_service_key, operation,
           outcome, metadata)
        values
          (${randomUUID()}, ${randomUUID()}, 'SERVICE', 'sales-advantage',
           'identity:test', 'SUCCEEDED',
           ${sql.json({ source: "constraint-test" })})
      `;
        await expectDatabaseError(
          () => sql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, operation, outcome, metadata)
          values
            (${randomUUID()}, ${randomUUID()}, 'ACCOUNT', 'identity:test',
             'DENIED', ${sql.json({ source: "constraint-test" })})
        `,
          "23514",
          "company_identity_audit_events_actor_check",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, actor_account_id, operation,
             outcome, metadata)
          values
            (${randomUUID()}, ${randomUUID()}, 'ACCOUNT', ${randomUUID()},
             'identity:test', 'DENIED',
             ${sql.json({ source: "constraint-test" })})
        `,
          "23503",
          "company_identity_audit_events_actor_account_fk",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, operation, outcome, metadata)
          values
            (${randomUUID()}, ${randomUUID()}, 'SERVICE', 'identity:test',
             'DENIED', ${sql.json({ source: "constraint-test" })})
        `,
          "23514",
          "company_identity_audit_events_actor_check",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, actor_account_id,
             actor_service_key, operation, outcome, metadata)
          values
            (${randomUUID()}, ${randomUUID()}, 'SERVICE', ${graph.accountId},
             'sales-advantage', 'identity:test', 'DENIED',
             ${sql.json({ source: "constraint-test" })})
        `,
          "23514",
          "company_identity_audit_events_actor_check",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_identity_audit_events
            (id, correlation_id, actor_type, actor_account_id, operation,
             outcome, metadata)
          values
            (${randomUUID()}, ${randomUUID()}, 'SYSTEM', ${graph.accountId},
             'identity:test', 'DENIED',
             ${sql.json({ source: "constraint-test" })})
        `,
          "23514",
          "company_identity_audit_events_actor_check",
        );
      });
    },
  );

  it(
    "allows one terminal idempotency result and rejects duplicate, invalid-state, and invalid-expiry rows",
    { timeout: 60_000 },
    async () => {
      await withCompanyIdentityScratchDatabase(async (context) => {
        await migrateScratchDatabase(context);
        const sql = context.adminSql;
        const createdAt = new Date("2026-07-15T00:00:00.000Z");
        const expiresAt = new Date("2026-07-16T00:00:00.000Z");
        await sql`
        insert into company_identity_idempotency_records
          (id, operation, scope_key, idempotency_key_hash, request_hash,
           state, safe_result, created_at, completed_at, expires_at)
        values
          (${randomUUID()}, 'identity:create', 'global', ${"5".repeat(64)},
           ${"6".repeat(64)}, 'SUCCEEDED', ${sql.json({ accountId: randomUUID() })},
           ${createdAt}, ${createdAt}, ${expiresAt})
      `;
        await expectDatabaseError(
          () => sql`
          insert into company_identity_idempotency_records
            (id, operation, scope_key, idempotency_key_hash, request_hash,
             state, safe_result, created_at, completed_at, expires_at)
          values
            (${randomUUID()}, 'identity:create', 'global', ${"5".repeat(64)},
             ${"7".repeat(64)}, 'SUCCEEDED', ${sql.json({ accountId: randomUUID() })},
             ${createdAt}, ${createdAt}, ${expiresAt})
        `,
          "23505",
          "company_identity_idempotency_operation_scope_key_unique",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_identity_idempotency_records
            (id, operation, scope_key, idempotency_key_hash, request_hash,
             state, created_at, expires_at)
          values
            (${randomUUID()}, 'identity:update', 'global', ${"8".repeat(64)},
             ${"9".repeat(64)}, 'IN_PROGRESS', ${createdAt}, ${expiresAt})
        `,
          "23514",
          "company_identity_idempotency_state_check",
        );
        await expectDatabaseError(
          () => sql`
          insert into company_identity_idempotency_records
            (id, operation, scope_key, idempotency_key_hash, request_hash,
             state, owner_token_hash, created_at, lease_expires_at, expires_at)
          values
            (${randomUUID()}, 'identity:reset', 'global', ${"a".repeat(64)},
             ${"b".repeat(64)}, 'IN_PROGRESS', ${"c".repeat(64)},
             ${createdAt}, ${expiresAt}, ${createdAt})
        `,
          "23514",
          "company_identity_idempotency_expiry_check",
        );
      });
    },
  );
});
