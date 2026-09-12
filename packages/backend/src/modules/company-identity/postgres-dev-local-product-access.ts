import { randomUUID } from "node:crypto";

import { hashPassword } from "@reading-advantage/auth/company-identity";
import postgres from "postgres";

import {
  DEV_LOCAL_APPLICATION_ENSURE_OPERATION,
  DEV_LOCAL_OIDC_CLIENT_ENSURE_OPERATION,
  DEV_LOCAL_OIDC_REDIRECT_URI_ENSURE_OPERATION,
  DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION,
  DEV_LOCAL_PRODUCT_ACCESS_DATABASE,
  DEV_LOCAL_ROLE_DEFINITION_ENSURE_OPERATION,
  DEV_LOCAL_ROLE_GRANT_OPERATION,
  DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_DESCRIPTION,
  DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_DISPLAY_NAME,
  DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY,
  DEV_LOCAL_WORKBOOKS_APPLICATION_DISPLAY_NAME,
  DEV_LOCAL_WORKBOOKS_APPLICATION_KEY,
  DEV_LOCAL_WORKBOOKS_CLIENT_ID,
  DEV_LOCAL_WORKBOOKS_REDIRECT_URI,
  DEV_LOCAL_WORKBOOKS_SECRET_ENV,
  DevLocalProductAccessError,
  assertLocalOnlyDatabaseHost,
  devLocalAccountCandidateSchema,
  normalizeDevLocalUsername,
  planDevLocalProductAccess,
  resolveDevLocalTargetAccount,
  summarizeDevLocalProductAccessPlan,
  type DevLocalAccountCandidate,
  type DevLocalProductAccessPlan,
  type DevLocalProductAccessSummary,
  type PostgresDevLocalProductAccessInput,
} from "./dev-local-product-access.js";

type Sql = ReturnType<typeof postgres>;

function asSql(value: postgres.TransactionSql): Sql {
  return value as unknown as Sql;
}

const DEV_LOCAL_TABLES: readonly string[] = [
  "company_accounts",
  "company_organizations",
  "company_organization_memberships",
  "company_applications",
  "company_application_role_definitions",
  "company_application_role_assignments",
  "company_identity_audit_events",
  "company_oidc_clients",
  "company_oidc_redirect_uris",
];

interface ReadInventoryResult {
  readonly candidates: readonly DevLocalAccountCandidate[];
  readonly applications: readonly { id: string; stableKey: string }[];
}

interface WorkbooksEnsureState {
  readonly applicationPresent: boolean;
  readonly roleDefined: boolean;
  readonly oidcClientPresent: boolean;
  readonly redirectUriPresent: boolean;
}

/**
 * Validates explicit write authorization before opening a database connection.
 * @param input Operator-selected mode and explicit apply authorization.
 * @returns Nothing after validation succeeds.
 * @throws When dry-run includes write authorization or apply lacks the exact phrase.
 */
export function validateDevLocalProductAccessInput(
  input: PostgresDevLocalProductAccessInput,
): void {
  if (input.mode === "dry-run") {
    if (input.confirmation) {
      throw new DevLocalProductAccessError(
        "DRY_RUN_APPLY_INPUT_REJECTED",
        "Dry run does not accept apply authorization values.",
      );
    }
    return;
  }
  if (input.confirmation !== DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION) {
    throw new DevLocalProductAccessError(
      "APPLY_CONFIRMATION_REQUIRED",
      "Apply requires the exact local testing confirmation phrase.",
    );
  }
}

async function preflight(sql: Sql): Promise<void> {
  const [database] = await sql<Array<{ name: string }>>`
    select current_database() as name
  `;
  if (database?.name !== DEV_LOCAL_PRODUCT_ACCESS_DATABASE) {
    throw new DevLocalProductAccessError(
      "DATABASE_INVALID",
      `Local product access seed database must be ${DEV_LOCAL_PRODUCT_ACCESS_DATABASE}.`,
    );
  }
  const rows = await sql<Array<{ name: string }>>`
    select table_name as name from information_schema.tables
     where table_schema = 'public' and table_name = any(${DEV_LOCAL_TABLES as string[]})
  `;
  const present = new Set(rows.map((row) => row.name));
  const missing = DEV_LOCAL_TABLES.filter((table) => !present.has(table));
  if (missing.length > 0) {
    throw new DevLocalProductAccessError(
      "SCHEMA_NOT_READY",
      `Local product access seed schema is missing ${missing.length} required table(s).`,
    );
  }
}

async function readCandidates(
  sql: Sql,
  username: string | undefined,
): Promise<DevLocalAccountCandidate[]> {
  if (username !== undefined) {
    const rows = await sql<Array<{
      accountId: string;
      username: string;
      normalizedUsername: string;
      membershipId: string;
      organizationId: string;
    }>>`
      select account.id::text as "accountId", account.username,
             account.normalized_username as "normalizedUsername",
             membership.id::text as "membershipId",
             membership.organization_id::text as "organizationId"
        from company_accounts account
        join company_organization_memberships membership
          on membership.account_id = account.id and membership.status = 'ACTIVE'
       where account.normalized_username = ${normalizeDevLocalUsername(username)}
         and account.status = 'ACTIVE'
       order by membership.created_at
    `;
    return rows.map((row) => devLocalAccountCandidateSchema.parse(row));
  }
  const rows = await sql<Array<{
    accountId: string;
    username: string;
    normalizedUsername: string;
    membershipId: string;
    organizationId: string;
  }>>`
    select account.id::text as "accountId", account.username,
           account.normalized_username as "normalizedUsername",
           membership.id::text as "membershipId",
           membership.organization_id::text as "organizationId"
      from company_application_role_assignments assignment
      join company_applications application on application.id = assignment.application_id
      join company_organization_memberships membership
        on membership.id = assignment.membership_id and membership.status = 'ACTIVE'
      join company_accounts account
        on account.id = membership.account_id and account.status = 'ACTIVE'
     where application.stable_key = 'codecamp'
       and assignment.role_key = 'ADMIN'
       and (assignment.expires_at is null or assignment.expires_at > now())
       and application.status = 'ACTIVE'
     order by account.normalized_username, membership.created_at
  `;
  return rows.map((row) => devLocalAccountCandidateSchema.parse(row));
}

async function readInventory(
  sql: Sql,
  username: string | undefined,
): Promise<ReadInventoryResult> {
  const [candidates, applications] = await Promise.all([
    readCandidates(sql, username),
    sql<Array<{ id: string; stableKey: string }>>`
      select id::text as id, stable_key as "stableKey"
        from company_applications order by stable_key
    `,
  ]);
  return { candidates, applications };
}

async function readRoleDefinitions(
  sql: Sql,
): Promise<Readonly<Record<string, readonly string[]>>> {
  const rows = await sql<Array<{ applicationId: string; roleKey: string }>>`
    select application_id::text as "applicationId", role_key as "roleKey"
      from company_application_role_definitions
     where status = 'ACTIVE'
     order by application_id, role_key
  `;
  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    (grouped[row.applicationId] ??= []).push(row.roleKey);
  }
  return grouped;
}

async function readHeldAssignments(
  sql: Sql,
  membershipId: string,
): Promise<{ applicationId: string; roleKey: string }[]> {
  return sql<Array<{ applicationId: string; roleKey: string }>>`
    select application_id::text as "applicationId", role_key as "roleKey"
      from company_application_role_assignments
     where membership_id = ${membershipId}
       and (expires_at is null or expires_at > now())
     order by application_id, role_key
  `;
}

async function readWorkbooksEnsureState(sql: Sql): Promise<WorkbooksEnsureState> {
  const [application] = await sql<Array<{ id: string }>>`
    select id::text as id from company_applications
     where stable_key = ${DEV_LOCAL_WORKBOOKS_APPLICATION_KEY}
     limit 1
  `;
  let roleDefined = false;
  if (application) {
    const [role] = await sql<Array<{ present: boolean }>>`
      select exists(
        select 1 from company_application_role_definitions
         where application_id = ${application.id}
           and role_key = ${DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY}
           and status = 'ACTIVE'
      ) as present
    `;
    roleDefined = Boolean(role?.present);
  }
  const [oidcClient] = await sql<Array<{ id: string }>>`
    select id::text as id from company_oidc_clients
     where client_id = ${DEV_LOCAL_WORKBOOKS_CLIENT_ID}
     limit 1
  `;
  let redirectUriPresent = false;
  if (oidcClient) {
    const [redirect] = await sql<Array<{ present: boolean }>>`
      select exists(
        select 1 from company_oidc_redirect_uris
         where oidc_client_id = ${oidcClient.id}
           and redirect_uri = ${DEV_LOCAL_WORKBOOKS_REDIRECT_URI}
      ) as present
    `;
    redirectUriPresent = Boolean(redirect?.present);
  }
  return {
    applicationPresent: application !== undefined,
    roleDefined,
    oidcClientPresent: oidcClient !== undefined,
    redirectUriPresent,
  };
}

async function appendSystemAudit(
  tx: Sql,
  input: {
    readonly organizationId: string;
    readonly applicationId: string;
    readonly operation: string;
    readonly metadata: Readonly<Record<string, string | number>>;
  },
): Promise<void> {
  await tx`
    insert into company_identity_audit_events (
      correlation_id, actor_type, actor_account_id, organization_id,
      application_id, target_account_id, operation, outcome, reason_code, metadata
    ) values (
      ${randomUUID()}, 'SYSTEM', null, ${input.organizationId},
      ${input.applicationId}, null,
      ${input.operation}, 'SUCCEEDED', null,
      ${tx.json({ source: "dev-local-product-access", ...input.metadata })}
    )
  `;
}

async function ensureWorkbooksInfrastructure(
  tx: Sql,
  input: {
    readonly plan: DevLocalProductAccessPlan;
    readonly workbooksApplicationPresent: boolean;
    readonly workbooksRoleDefined: boolean;
    readonly workbooksOidcClientPresent: boolean;
    readonly workbooksRedirectUriPresent: boolean;
    readonly workbooksLocalOidcClientSecret?: string;
  },
): Promise<number> {
  let auditEventCount = 0;
  const applicationId = input.plan.workbooksApplicationId;
  if (!input.workbooksApplicationPresent) {
    await tx`
      insert into company_applications (id, stable_key, display_name)
      values (
        ${applicationId}, ${DEV_LOCAL_WORKBOOKS_APPLICATION_KEY},
        ${DEV_LOCAL_WORKBOOKS_APPLICATION_DISPLAY_NAME}
      ) on conflict do nothing
    `;
    await appendSystemAudit(tx, {
      organizationId: input.plan.organizationId,
      applicationId,
      operation: DEV_LOCAL_APPLICATION_ENSURE_OPERATION,
      metadata: { normalizationVersion: 1 },
    });
    auditEventCount += 1;
  }
  if (!input.workbooksRoleDefined) {
    await tx`
      insert into company_application_role_definitions (
        application_id, role_key, display_name, description
      ) values (
        ${applicationId}, ${DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY},
        ${DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_DISPLAY_NAME},
        ${DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_DESCRIPTION}
      ) on conflict (application_id, role_key) do nothing
    `;
    await appendSystemAudit(tx, {
      organizationId: input.plan.organizationId,
      applicationId,
      operation: DEV_LOCAL_ROLE_DEFINITION_ENSURE_OPERATION,
      metadata: { roleKey: DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY },
    });
    auditEventCount += 1;
  }
  let oidcClientId: string;
  if (!input.workbooksOidcClientPresent) {
    const secret = input.workbooksLocalOidcClientSecret;
    if (secret === undefined || secret.length < 32) {
      throw new DevLocalProductAccessError(
        "OIDC_CLIENT_SECRET_REQUIRED",
        `Apply requires the ${DEV_LOCAL_WORKBOOKS_SECRET_ENV} environment variable (min 32 chars) because the local workbooks OIDC client must be created.`,
      );
    }
    const clientSecretHash = await hashPassword(secret);
    const [created] = await tx<Array<{ id: string }>>`
      insert into company_oidc_clients (
        application_id, client_id, client_type, token_auth_method,
        client_secret_hash, pkce_required, status
      ) values (
        ${applicationId}, ${DEV_LOCAL_WORKBOOKS_CLIENT_ID},
        'CONFIDENTIAL', 'CLIENT_SECRET_BASIC', ${clientSecretHash}, true, 'ACTIVE'
      ) returning id
    `;
    if (!created) throw new DevLocalProductAccessError(
      "OIDC_CLIENT_CREATE_FAILED",
      "The local workbooks OIDC client could not be created.",
    );
    oidcClientId = created.id;
    await appendSystemAudit(tx, {
      organizationId: input.plan.organizationId,
      applicationId,
      operation: DEV_LOCAL_OIDC_CLIENT_ENSURE_OPERATION,
      metadata: { clientId: DEV_LOCAL_WORKBOOKS_CLIENT_ID },
    });
    auditEventCount += 1;
  } else {
    const [existing] = await tx<Array<{ id: string }>>`
      select id::text as id from company_oidc_clients
       where client_id = ${DEV_LOCAL_WORKBOOKS_CLIENT_ID}
       limit 1
    `;
    if (!existing) throw new DevLocalProductAccessError(
      "OIDC_CLIENT_READ_FAILED",
      "The existing local workbooks OIDC client could not be resolved.",
    );
    oidcClientId = existing.id;
  }
  if (!input.workbooksRedirectUriPresent) {
    await tx`
      insert into company_oidc_redirect_uris (oidc_client_id, redirect_uri)
      values (${oidcClientId}, ${DEV_LOCAL_WORKBOOKS_REDIRECT_URI})
      on conflict (oidc_client_id, redirect_uri) do nothing
    `;
    await appendSystemAudit(tx, {
      organizationId: input.plan.organizationId,
      applicationId,
      operation: DEV_LOCAL_OIDC_REDIRECT_URI_ENSURE_OPERATION,
      metadata: { clientId: DEV_LOCAL_WORKBOOKS_CLIENT_ID },
    });
    auditEventCount += 1;
  }
  return auditEventCount;
}

async function applyPlan(
  sql: Sql,
  plan: DevLocalProductAccessPlan,
  input: PostgresDevLocalProductAccessInput,
): Promise<{ appliedGrantCount: number; auditEventCount: number }> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('dev_local_product_access'))`;
    let appliedGrantCount = 0;
    let auditEventCount = 0;
    const ensureState = await readWorkbooksEnsureState(asSql(tx));
    auditEventCount += await ensureWorkbooksInfrastructure(asSql(tx), {
      plan,
      workbooksApplicationPresent: ensureState.applicationPresent,
      workbooksRoleDefined: ensureState.roleDefined,
      workbooksOidcClientPresent: ensureState.oidcClientPresent,
      workbooksRedirectUriPresent: ensureState.redirectUriPresent,
      workbooksLocalOidcClientSecret: input.workbooksLocalOidcClientSecret,
    });
    for (const grant of plan.grants) {
      if (grant.status !== "TO_GRANT" || grant.roleKey === null) continue;
      const existing = await tx<Array<{ id: string; expiresAt: Date | null }>>`
        select id, expires_at as "expiresAt"
          from company_application_role_assignments
         where membership_id = ${plan.membershipId}
           and application_id = ${grant.applicationId}
           and role_key = ${grant.roleKey}
         for update
      `;
      if (existing.length > 0 && existing[0]!.expiresAt === null) continue;
      if (existing.length > 0) {
        await tx`
          update company_application_role_assignments
             set expires_at = null
           where id = ${existing[0]!.id}
        `;
      } else {
        await tx`
          insert into company_application_role_assignments (
            organization_id, membership_id, application_id, role_key
          ) values (
            ${plan.organizationId}, ${plan.membershipId},
            ${grant.applicationId}, ${grant.roleKey}
          )
        `;
      }
      appliedGrantCount += 1;
      await appendSystemAudit(asSql(tx), {
        organizationId: plan.organizationId,
        applicationId: grant.applicationId,
        operation: DEV_LOCAL_ROLE_GRANT_OPERATION,
        metadata: { roleKey: grant.roleKey },
      });
      auditEventCount += 1;
    }
    return { appliedGrantCount, auditEventCount };
  });
}

/**
 * Runs a fail-closed local-only dry run or explicitly approved product grant seed.
 * @param input Direct localhost database URL, mode, and explicit apply authorization.
 * @returns A non-identifying aggregate grant and ensure report.
 * @throws When the host is not loopback-only or any database gate fails.
 */
export async function runPostgresDevLocalProductAccess(
  input: PostgresDevLocalProductAccessInput,
): Promise<DevLocalProductAccessSummary> {
  validateDevLocalProductAccessInput(input);
  assertLocalOnlyDatabaseHost(input.targetDatabaseUrl);
  const sql = postgres(input.targetDatabaseUrl, { max: 1, prepare: false });
  try {
    await preflight(sql);
    const { candidates, applications } = await readInventory(
      sql,
      input.username,
    );
    const target = resolveDevLocalTargetAccount({
      username: input.username,
      discoveryCandidates: candidates,
    });
    const [roleDefinitionsByApplicationId, heldAssignments, workbooksEnsureState] =
      await Promise.all([
        readRoleDefinitions(sql),
        readHeldAssignments(sql, target.membershipId),
        readWorkbooksEnsureState(sql),
      ]);
    const plan = planDevLocalProductAccess({
      mode: input.mode,
      target,
      applications,
      roleDefinitionsByApplicationId,
      heldAssignments,
      workbooksApplicationPresent: workbooksEnsureState.applicationPresent,
      workbooksRoleDefined: workbooksEnsureState.roleDefined,
      workbooksLocalOidcClientPresent: workbooksEnsureState.oidcClientPresent,
      workbooksLocalRedirectUriPresent: workbooksEnsureState.redirectUriPresent,
      workbooksLocalOidcClientSecret: input.workbooksLocalOidcClientSecret,
    });
    if (input.mode === "dry-run") {
      return summarizeDevLocalProductAccessPlan({ mode: "dry-run", plan });
    }
    const { appliedGrantCount, auditEventCount } = await applyPlan(
      sql,
      plan,
      input,
    );
    return summarizeDevLocalProductAccessPlan({
      mode: "apply",
      plan,
      appliedGrantCount,
      auditEventCount,
    });
  } catch (error) {
    if (error instanceof DevLocalProductAccessError) throw error;
    throw new DevLocalProductAccessError(
      "SEED_DATABASE_ERROR",
      "Local product access seed stopped because a database gate failed.",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
