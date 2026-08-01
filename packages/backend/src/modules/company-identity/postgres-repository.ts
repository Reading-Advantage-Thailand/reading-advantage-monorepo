import { createHash, randomBytes, randomUUID } from "node:crypto";

import type postgres from "postgres";

import type { Employee } from "./contracts.js";
import { CompanyIdentityError } from "./errors.js";
import type {
  AuthorizationCodeRecord,
  CompanyIdentityRepository,
  IdentityAuditInput,
  OidcClientRecord,
  SsoSessionRecord,
} from "./repository.js";

type Sql = postgres.Sql;

function asSql(value: postgres.TransactionSql): Sql {
  return value as unknown as Sql;
}

function normalizeUsername(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalized)) {
    throw new CompanyIdentityError("AUTHENTICATION_FAILED", "Username or password is invalid.");
  }
  return normalized;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Converts a PostgreSQL bigint result into the bounded numeric auth-version contract.
 * @param value Driver result for an account auth-version column.
 * @returns Positive safe integer used by identity claims and session comparisons.
 * @throws When the database value is not a positive safe integer.
 */
function parseAuthVersion(value: string | number | bigint): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("COMPANY_IDENTITY_AUTH_VERSION_INVALID");
  }
  return parsed;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function assertCompanyAdmin(sql: Sql, actorAccountId: string): Promise<void> {
  const [row] = await sql<Array<{ allowed: boolean }>>`
    select exists (
      select 1
      from company_accounts account
      join company_organization_memberships membership
        on membership.account_id = account.id and membership.status = 'ACTIVE'
      join company_role_assignments role
        on role.membership_id = membership.id
       and role.organization_id = membership.organization_id
       and role.role_key = 'COMPANY_ADMIN'
      where account.id = ${actorAccountId} and account.status = 'ACTIVE'
    ) as allowed
  `;
  if (!row?.allowed) {
    await appendAudit(sql, {
      correlationId: randomUUID(),
      actorAccountId,
      operation: "identity:admin-denied",
      outcome: "DENIED",
      reasonCode: "COMPANY_ADMIN_REQUIRED",
      metadata: { reasonCategory: "authorization" },
    });
    throw new CompanyIdentityError("FORBIDDEN", "Company administrator access is required.");
  }
}

async function loadEmployee(sql: Sql, accountId: string): Promise<Employee | null> {
  const [account] = await sql<
    Array<{
      id: string;
      username: string;
      display_name: string;
      status: "ACTIVE" | "SUSPENDED";
      created_at: Date;
      membership_id: string;
    }>
  >`
    select account.id, account.username, account.display_name, account.status,
           account.created_at, membership.id as membership_id
    from company_accounts account
    join company_organization_memberships membership on membership.account_id = account.id
    where account.id = ${accountId}
    order by membership.created_at
    limit 1
  `;
  if (!account) return null;
  const [companyRoles, appRoles] = await Promise.all([
    sql<Array<{ role_key: "EMPLOYEE" | "COMPANY_ADMIN" }>>`
      select role_key from company_role_assignments
       where membership_id = ${account.membership_id}
       order by role_key
    `,
    sql<Array<{ application_key: string; role_key: string }>>`
      select application.stable_key as application_key, assignment.role_key
      from company_application_role_assignments assignment
      join company_applications application on application.id = assignment.application_id
      where assignment.membership_id = ${account.membership_id}
        and (assignment.expires_at is null or assignment.expires_at > now())
      order by application.stable_key, assignment.role_key
    `,
  ]);
  const rolesByApp: Record<string, string[]> = {};
  for (const role of appRoles) {
    (rolesByApp[role.application_key] ??= []).push(role.role_key);
  }
  return {
    id: account.id,
    username: account.username,
    displayName: account.display_name,
    status: account.status,
    companyRoles: companyRoles.map((role) => role.role_key),
    appRoles: rolesByApp,
    createdAt: account.created_at.toISOString(),
  };
}

async function appendAudit(sql: Sql, input: IdentityAuditInput): Promise<void> {
  await sql`
    insert into company_identity_audit_events (
      correlation_id, actor_type, actor_account_id, organization_id,
      application_id, target_account_id, operation, outcome, reason_code, metadata
    ) values (
      ${input.correlationId}, ${input.actorAccountId ? "ACCOUNT" : "SYSTEM"},
      ${input.actorAccountId ?? null}, ${input.organizationId ?? null},
      ${input.applicationId ?? null}, ${input.targetAccountId ?? null},
      ${input.operation}, ${input.outcome}, ${input.reasonCode ?? null},
      ${sql.json(input.metadata)}
    )
  `;
}

async function revokeForAccount(sql: Sql, accountId: string, now: Date, reason: string): Promise<number> {
  const sessions = await sql<Array<{ id: string }>>`
    update company_sso_sessions session
       set revoked_at = ${now}, revoke_reason = ${reason}
      from company_organization_memberships membership
     where session.membership_id = membership.id
       and membership.account_id = ${accountId}
       and session.revoked_at is null
    returning session.id
  `;
  if (sessions.length > 0) {
    await sql`
      update company_application_sessions
         set revoked_at = ${now}, revoke_reason = ${reason}
       where sso_session_id in ${sql(sessions.map((row) => row.id))}
         and revoked_at is null
    `;
  }
  return sessions.length;
}

async function runIdempotent<T extends Record<string, unknown>>(input: {
  readonly sql: Sql;
  readonly operation: string;
  readonly scopeKey: string;
  readonly idempotencyKey: string;
  readonly request: unknown;
  readonly work: (transaction: Sql) => Promise<T>;
}): Promise<T> {
  return input.sql.begin(async (transaction) => {
    const tx = asSql(transaction);
    const keyHash = digest(input.idempotencyKey);
    const requestHash = digest(stableJson(input.request));
    const ownerHash = digest(randomBytes(32).toString("base64url"));
    await tx`
      insert into company_identity_idempotency_records (
        operation, scope_key, idempotency_key_hash, request_hash, state,
        owner_token_hash, lease_expires_at, expires_at
      ) values (
        ${input.operation}, ${input.scopeKey}, ${keyHash}, ${requestHash}, 'IN_PROGRESS',
        ${ownerHash}, now() + interval '60 seconds', now() + interval '7 days'
      ) on conflict (operation, scope_key, idempotency_key_hash) do nothing
    `;
    const [record] = await tx<Array<{
      request_hash: string;
      state: "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
      owner_token_hash: string | null;
      safe_result: T | null;
      safe_error_code: string | null;
    }>>`
      select request_hash, state, owner_token_hash, safe_result, safe_error_code
      from company_identity_idempotency_records
      where operation = ${input.operation} and scope_key = ${input.scopeKey}
        and idempotency_key_hash = ${keyHash}
      for update
    `;
    if (!record || record.request_hash !== requestHash) {
      throw new CompanyIdentityError("USERNAME_CONFLICT", "Idempotency key conflicts with another request.");
    }
    if (record.state === "SUCCEEDED" && record.safe_result) return record.safe_result;
    if (record.state === "FAILED") {
      throw new CompanyIdentityError("FORBIDDEN", "The previous operation did not complete.");
    }
    if (record.owner_token_hash !== ownerHash) {
      throw new CompanyIdentityError("USERNAME_CONFLICT", "The operation is already in progress.");
    }
    const result = await input.work(tx);
    await tx`
      update company_identity_idempotency_records
         set state = 'SUCCEEDED', owner_token_hash = null, lease_expires_at = null,
             safe_result = ${stableJson(result)}::jsonb, completed_at = now()
       where operation = ${input.operation} and scope_key = ${input.scopeKey}
         and idempotency_key_hash = ${keyHash} and owner_token_hash = ${ownerHash}
    `;
    return result;
  }) as Promise<T>;
}

/**
 * Creates the only PostgreSQL adapter permitted to access company identity tables.
 * @param sql Validated least-privilege company identity runtime connection.
 * @returns Transport-independent repository used by Accounts capabilities.
 */
export function createPostgresCompanyIdentityRepository(sql: Sql): CompanyIdentityRepository {
  const repository: CompanyIdentityRepository = {
    async findCredentialByUsername(username) {
      let normalized: string;
      try { normalized = normalizeUsername(username); } catch { return null; }
      const [row] = await sql<Array<{
        account_id: string; membership_id: string; organization_id: string;
        organization_key: string; auth_version: string | number; password_hash: string;
        algorithm: "ARGON2ID" | "BCRYPT";
      }>>`
        select account.id as account_id, membership.id as membership_id,
               membership.organization_id, organization.stable_key as organization_key,
               account.auth_version, credential.password_hash, credential.algorithm
        from company_accounts account
        join company_password_credentials credential on credential.account_id = account.id
        join company_organization_memberships membership
          on membership.account_id = account.id and membership.status = 'ACTIVE'
        join company_organizations organization
          on organization.id = membership.organization_id and organization.status = 'ACTIVE'
        where account.normalized_username = ${normalized}
        limit 1
      `;
      if (!row) return null;
      const employee = await loadEmployee(sql, row.account_id);
      return employee ? {
        employee,
        membershipId: row.membership_id,
        organizationId: row.organization_id,
        organizationKey: row.organization_key,
        authVersion: parseAuthVersion(row.auth_version),
        passwordHash: row.password_hash,
        passwordAlgorithm: row.algorithm,
      } : null;
    },

    async upgradePasswordHash(accountId, passwordHash) {
      await sql`
        update company_password_credentials
           set password_hash = ${passwordHash}, algorithm = 'ARGON2ID',
               credential_version = credential_version + 1,
               last_verified_at = now(), updated_at = now()
         where account_id = ${accountId}
      `;
    },

    async createSsoSession(input) {
      await sql`
        insert into company_sso_sessions (
          id, token_hash, organization_id, membership_id, account_auth_version,
          created_at, last_seen_at, idle_expires_at, absolute_expires_at, user_agent
        ) values (
          ${input.id}, ${input.tokenHash}, ${input.organizationId}, ${input.membershipId},
          ${input.authVersion}, ${input.createdAt}, ${input.createdAt},
          ${input.idleExpiresAt}, ${input.absoluteExpiresAt}, ${input.userAgent}
        )
      `;
    },

    async findSsoSession(tokenHash, now, nextIdleExpiresAt) {
      const [row] = await sql<Array<{
        id: string; account_id: string; membership_id: string; organization_id: string;
        organization_key: string; auth_version: string | number; absolute_expires_at: Date;
      }>>`
        update company_sso_sessions session
           set last_seen_at = ${now},
               idle_expires_at = least(session.absolute_expires_at, ${nextIdleExpiresAt})
          from company_organization_memberships membership,
               company_accounts account,
               company_organizations organization
         where membership.id = session.membership_id
           and membership.status = 'ACTIVE'
           and account.id = membership.account_id
           and account.status = 'ACTIVE'
           and account.auth_version = session.account_auth_version
           and organization.id = session.organization_id
           and organization.status = 'ACTIVE'
           and session.token_hash = ${tokenHash}
           and session.revoked_at is null
           and session.idle_expires_at > ${now}
           and session.absolute_expires_at > ${now}
        returning session.id, membership.account_id, session.membership_id,
               session.organization_id, organization.stable_key as organization_key,
               account.auth_version, session.absolute_expires_at
      `;
      return row ? {
        id: row.id, accountId: row.account_id, membershipId: row.membership_id,
        organizationId: row.organization_id, organizationKey: row.organization_key,
        authVersion: parseAuthVersion(row.auth_version), expiresAt: row.absolute_expires_at,
      } satisfies SsoSessionRecord : null;
    },

    async findSsoSessionById(sessionId, now, nextIdleExpiresAt) {
      const [row] = await sql<Array<{
        id: string; account_id: string; membership_id: string; organization_id: string;
        organization_key: string; auth_version: string | number; absolute_expires_at: Date;
      }>>`
        update company_sso_sessions session
           set last_seen_at = ${now},
               idle_expires_at = least(session.absolute_expires_at, ${nextIdleExpiresAt})
          from company_organization_memberships membership,
               company_accounts account,
               company_organizations organization
         where membership.id = session.membership_id
           and membership.status = 'ACTIVE'
           and account.id = membership.account_id
           and account.status = 'ACTIVE'
           and account.auth_version = session.account_auth_version
           and organization.id = session.organization_id
           and organization.status = 'ACTIVE'
           and session.id = ${sessionId}
           and session.revoked_at is null
           and session.idle_expires_at > ${now}
           and session.absolute_expires_at > ${now}
        returning session.id, membership.account_id, session.membership_id,
               session.organization_id, organization.stable_key as organization_key,
               account.auth_version, session.absolute_expires_at
      `;
      return row ? {
        id: row.id, accountId: row.account_id, membershipId: row.membership_id,
        organizationId: row.organization_id, organizationKey: row.organization_key,
        authVersion: parseAuthVersion(row.auth_version), expiresAt: row.absolute_expires_at,
      } : null;
    },

    async findOidcClient(clientId, redirectUri) {
      const [row] = await sql<Array<{
        id: string; client_id: string; application_id: string; application_key: string;
        client_type: "PUBLIC" | "CONFIDENTIAL"; client_secret_hash: string | null;
        redirect_uri_id: string; redirect_uri: string;
      }>>`
        select client.id, client.client_id, client.application_id,
               application.stable_key as application_key, client.client_type,
               client.client_secret_hash, redirect.id as redirect_uri_id,
               redirect.redirect_uri
        from company_oidc_clients client
        join company_applications application
          on application.id = client.application_id and application.status = 'ACTIVE'
        join company_oidc_redirect_uris redirect on redirect.oidc_client_id = client.id
        where client.client_id = ${clientId} and client.status = 'ACTIVE'
          and redirect.redirect_uri = ${redirectUri}
      `;
      return row ? {
        id: row.id, clientId: row.client_id, applicationId: row.application_id,
        applicationKey: row.application_key, clientType: row.client_type,
        clientSecretHash: row.client_secret_hash, redirectUriId: row.redirect_uri_id,
        redirectUri: row.redirect_uri,
      } satisfies OidcClientRecord : null;
    },

    async findOidcClientByClientId(clientId) {
      const [row] = await sql<Array<{
        id: string;
        application_key: string;
        client_type: "PUBLIC" | "CONFIDENTIAL";
        client_secret_hash: string | null;
      }>>`
        select client.id, application.stable_key as application_key,
               client.client_type, client.client_secret_hash
        from company_oidc_clients client
        join company_applications application
          on application.id = client.application_id and application.status = 'ACTIVE'
        where client.client_id = ${clientId} and client.status = 'ACTIVE'
      `;
      return row ? {
        id: row.id,
        applicationKey: row.application_key,
        clientType: row.client_type,
        clientSecretHash: row.client_secret_hash,
      } : null;
    },

    async listApplicationRoles(membershipId, applicationId, now) {
      const rows = await sql<Array<{ role_key: string }>>`
        select assignment.role_key
        from company_application_role_assignments assignment
        join company_application_role_definitions definition
          on definition.application_id = assignment.application_id
         and definition.role_key = assignment.role_key and definition.status = 'ACTIVE'
        where assignment.membership_id = ${membershipId}
          and assignment.application_id = ${applicationId}
          and (assignment.expires_at is null or assignment.expires_at > ${now})
        order by assignment.role_key
      `;
      return rows.map((row) => row.role_key);
    },

    async createAuthorizationCode(input) {
      await sql.begin(async (transaction) => {
        const tx = asSql(transaction);
        await tx`
          insert into company_oidc_authorization_codes (
            id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
            code_challenge, code_challenge_method, nonce, scope, issued_at, expires_at
          ) values (
            ${input.id}, ${input.codeHash}, ${input.clientId}, ${input.redirectUriId},
            ${input.ssoSessionId}, ${input.codeChallenge}, 'S256', ${input.nonce},
            ${input.scope}, ${input.issuedAt}, ${input.expiresAt}
          )
        `;
        await appendAudit(tx, input.audit);
      });
    },

    async consumeAuthorizationCode(codeHash, now, handler) {
      return (await sql.begin(async (transaction) => {
        const tx = asSql(transaction);
        const [row] = await tx<Array<{
          id: string; sso_session_id: string; code_challenge: string; nonce: string;
          expires_at: Date; oidc_client_id: string; client_id: string;
          application_id: string; application_key: string;
          client_type: "PUBLIC" | "CONFIDENTIAL"; client_secret_hash: string | null;
          redirect_uri_id: string; redirect_uri: string;
        }>>`
          select code.id, code.sso_session_id, code.code_challenge, code.nonce,
                 code.expires_at, client.id as oidc_client_id, client.client_id,
                 client.application_id, application.stable_key as application_key,
                 client.client_type, client.client_secret_hash,
                 redirect.id as redirect_uri_id, redirect.redirect_uri
          from company_oidc_authorization_codes code
          join company_oidc_clients client on client.id = code.oidc_client_id
          join company_applications application on application.id = client.application_id
          join company_oidc_redirect_uris redirect on redirect.id = code.redirect_uri_id
          where code.code_hash = ${codeHash} and code.consumed_at is null
            and code.revoked_at is null and code.expires_at > ${now}
            and client.status = 'ACTIVE' and application.status = 'ACTIVE'
          for update of code
        `;
        if (!row) return null;
        const client: OidcClientRecord = {
          id: row.oidc_client_id, clientId: row.client_id,
          applicationId: row.application_id, applicationKey: row.application_key,
          clientType: row.client_type, clientSecretHash: row.client_secret_hash,
          redirectUriId: row.redirect_uri_id, redirectUri: row.redirect_uri,
        };
        const code: AuthorizationCodeRecord = {
          id: row.id, client, ssoSessionId: row.sso_session_id,
          codeChallenge: row.code_challenge, nonce: row.nonce, expiresAt: row.expires_at,
        };
        const result = await handler(transaction, code);
        await tx`update company_oidc_authorization_codes set consumed_at = ${now} where id = ${row.id}`;
        return result;
      })) as Awaited<ReturnType<typeof handler>> | null;
    },

    async createApplicationSession(input) {
      const tx = asSql(input.transaction);
      await tx`
        insert into company_application_sessions (
          id, token_hash, sso_session_id, organization_id, membership_id,
          application_id, account_auth_version, created_at, last_checked_at, expires_at
        ) values (
          ${input.id}, ${input.tokenHash}, ${input.ssoSessionId}, ${input.organizationId},
          ${input.membershipId}, ${input.applicationId}, ${input.authVersion},
          ${input.createdAt}, ${input.createdAt}, ${input.expiresAt}
        )
      `;
      await appendAudit(tx, input.audit);
    },

    async introspectApplicationSession(tokenHash, now, nextIdleExpiresAt) {
      const [row] = await sql<Array<{
        session_id: string; account_id: string; organization_id: string;
        organization_key: string; application_id: string; application_key: string;
        auth_version: string | number; expires_at: Date; membership_id: string;
      }>>`
        with refreshed_sso as (
          update company_sso_sessions sso
             set last_seen_at = ${now},
                 idle_expires_at = least(sso.absolute_expires_at, ${nextIdleExpiresAt})
            from company_application_sessions candidate,
                 company_organization_memberships candidate_membership,
                 company_accounts candidate_account
           where candidate.token_hash = ${tokenHash}
             and candidate.sso_session_id = sso.id
             and candidate_membership.id = candidate.membership_id
             and candidate_membership.status = 'ACTIVE'
             and candidate_account.id = candidate_membership.account_id
             and candidate_account.status = 'ACTIVE'
             and candidate_account.auth_version = candidate.account_auth_version
             and candidate.revoked_at is null
             and candidate.expires_at > ${now}
             and sso.revoked_at is null
             and sso.idle_expires_at > ${now}
             and sso.absolute_expires_at > ${now}
          returning sso.id
        )
        select app_session.id as session_id, membership.account_id,
               app_session.organization_id, organization.stable_key as organization_key,
               app_session.application_id, application.stable_key as application_key,
               account.auth_version, app_session.expires_at, app_session.membership_id
        from company_application_sessions app_session
        join company_sso_sessions sso on sso.id = app_session.sso_session_id
        join refreshed_sso refreshed on refreshed.id = sso.id
        join company_organization_memberships membership
          on membership.id = app_session.membership_id and membership.status = 'ACTIVE'
        join company_accounts account
          on account.id = membership.account_id and account.status = 'ACTIVE'
         and account.auth_version = app_session.account_auth_version
        join company_organizations organization on organization.id = app_session.organization_id
        join company_applications application on application.id = app_session.application_id
        where app_session.token_hash = ${tokenHash} and app_session.revoked_at is null
          and app_session.expires_at > ${now} and sso.revoked_at is null
          and sso.idle_expires_at > ${now} and sso.absolute_expires_at > ${now}
      `;
      if (!row) return null;
      const [employee, roles] = await Promise.all([
        loadEmployee(sql, row.account_id),
        this.listApplicationRoles(row.membership_id, row.application_id, now),
      ]);
      return employee ? {
        sessionId: row.session_id, employee, organizationId: row.organization_id,
        organizationKey: row.organization_key, applicationKey: row.application_key,
        roles, authVersion: parseAuthVersion(row.auth_version), expiresAt: row.expires_at,
      } : null;
    },

    async revokeApplicationSession(input) {
      return sql.begin(async (transaction) => {
        const tx = asSql(transaction);
        const [session] = await tx<Array<{
          account_id: string;
          application_id: string;
          organization_id: string;
        }>>`
          update company_application_sessions app_session
             set revoked_at = ${input.now}, revoke_reason = 'LOCAL_LOGOUT'
            from company_organization_memberships membership
           where app_session.token_hash = ${input.tokenHash}
             and app_session.revoked_at is null
             and membership.id = app_session.membership_id
          returning membership.account_id, app_session.application_id,
                    app_session.organization_id
        `;
        if (!session) return false;
        await appendAudit(tx, {
          ...input.audit,
          actorAccountId: session.account_id,
          applicationId: session.application_id,
          organizationId: session.organization_id,
          metadata: { ...input.audit.metadata, sessionCount: 1 },
        });
        return true;
      });
    },

    async revokeSsoSession(input) {
      return sql.begin(async (transaction) => {
        const tx = asSql(transaction);
        const sessions = await tx<Array<{
          id: string;
          account_id: string;
          organization_id: string;
        }>>`
          update company_sso_sessions sso_session
             set revoked_at = ${input.now}, revoke_reason = 'GLOBAL_LOGOUT'
            from company_organization_memberships membership
           where sso_session.token_hash = ${input.tokenHash}
             and sso_session.revoked_at is null
             and membership.id = sso_session.membership_id
          returning sso_session.id, membership.account_id,
                    sso_session.organization_id
        `;
        if (sessions.length === 0) return 0;
        const children = await tx`
          update company_application_sessions
             set revoked_at = ${input.now}, revoke_reason = 'GLOBAL_LOGOUT'
           where sso_session_id = ${sessions[0]!.id} and revoked_at is null
          returning id
        `;
        await appendAudit(tx, {
          ...input.audit,
          actorAccountId: sessions[0]!.account_id,
          organizationId: sessions[0]!.organization_id,
          metadata: {
            ...input.audit.metadata,
            sessionCount: children.length + 1,
          },
        });
        return children.length;
      });
    },

    async appendAudit(input) { await appendAudit(sql, input); },

    async listEmployees(actorAccountId) {
      await assertCompanyAdmin(sql, actorAccountId);
      const accounts = await sql<Array<{ id: string }>>`
        select id from company_accounts order by display_name, normalized_username
      `;
      return (await Promise.all(accounts.map((row) => loadEmployee(sql, row.id))))
        .filter((employee): employee is Employee => employee !== null);
    },

    async getEmployee(accountId) {
      return loadEmployee(sql, accountId);
    },

    async createEmployee(input) {
      await assertCompanyAdmin(sql, input.actorAccountId);
      const result = await runIdempotent({
        sql, operation: "identity:employee-create", scopeKey: "global",
        idempotencyKey: input.idempotencyKey, request: {
          username: input.username, displayName: input.displayName,
          companyRoles: input.companyRoles, appRoles: input.appRoles,
          credentialFingerprint: input.credentialFingerprint,
        },
        work: async (tx) => {
          const normalized = normalizeUsername(input.username);
          const [organization] = await tx<Array<{ id: string }>>`
            select id from company_organizations where stable_key = 'internal-company' and status = 'ACTIVE'
          `;
          if (!organization) throw new Error("IDENTITY_ORGANIZATION_MISSING");
          const accountId = randomUUID();
          let accountRows;
          try {
            accountRows = await tx`
              insert into company_accounts (
                id, username, normalized_username, normalization_version, display_name, status
              ) values (${accountId}, ${input.username.normalize("NFKC").trim()}, ${normalized}, 1, ${input.displayName}, 'ACTIVE')
              returning id
            `;
          } catch (error) {
            if ((error as { code?: string }).code === "23505") {
              throw new CompanyIdentityError("USERNAME_CONFLICT", "Username is already in use.");
            }
            throw error;
          }
          if (accountRows.length !== 1) throw new Error("IDENTITY_ACCOUNT_CREATE_FAILED");
          await tx`
            insert into company_password_credentials (account_id, password_hash, algorithm)
            values (${accountId}, ${input.passwordHash}, 'ARGON2ID')
          `;
          const [membership] = await tx<Array<{ id: string }>>`
            insert into company_organization_memberships (organization_id, account_id, status)
            values (${organization.id}, ${accountId}, 'ACTIVE') returning id
          `;
          if (!membership) throw new Error("IDENTITY_MEMBERSHIP_CREATE_FAILED");
          for (const roleKey of [...new Set(input.companyRoles)]) {
            await tx`
              insert into company_role_assignments (
                organization_id, membership_id, role_key, assigned_by_account_id
              ) values (${organization.id}, ${membership.id}, ${roleKey}, ${input.actorAccountId})
            `;
          }
          for (const [applicationKey, roleKeys] of Object.entries(input.appRoles)) {
            const [application] = await tx<Array<{ id: string }>>`
              select id from company_applications where stable_key = ${applicationKey} and status = 'ACTIVE'
            `;
            if (!application) throw new CompanyIdentityError("CLIENT_INVALID", "Application role scope is invalid.");
            for (const roleKey of [...new Set(roleKeys)]) {
              await tx`
                insert into company_application_role_assignments (
                  organization_id, membership_id, application_id, role_key, assigned_by_account_id
                ) values (${organization.id}, ${membership.id}, ${application.id}, ${roleKey}, ${input.actorAccountId})
              `;
            }
          }
          await appendAudit(tx, {
            correlationId: input.correlationId, actorAccountId: input.actorAccountId,
            organizationId: organization.id, targetAccountId: accountId,
            operation: "identity:employee-create", outcome: "SUCCEEDED",
            metadata: { source: "accounts-ui", normalizationVersion: 1 },
          });
          const employee = await loadEmployee(tx, accountId);
          if (!employee) throw new Error("IDENTITY_EMPLOYEE_PROJECTION_FAILED");
          return employee as Employee & Record<string, unknown>;
        },
      });
      return result as Employee;
    },

    async setEmployeeStatus(input) {
      await assertCompanyAdmin(sql, input.actorAccountId);
      const result = await runIdempotent({
        sql, operation: "identity:employee-status", scopeKey: `account:${input.targetAccountId}`,
        idempotencyKey: input.idempotencyKey, request: { status: input.status },
        work: async (tx) => {
          const employee = await loadEmployee(tx, input.targetAccountId);
          if (!employee) throw new CompanyIdentityError("EMPLOYEE_NOT_FOUND", "Employee was not found.");
          if (input.status === "SUSPENDED" && employee.companyRoles.includes("COMPANY_ADMIN")) {
            await tx`
              select account.id
              from company_role_assignments role
              join company_organization_memberships membership on membership.id = role.membership_id
              join company_accounts account on account.id = membership.account_id
              where role.role_key = 'COMPANY_ADMIN' and membership.status = 'ACTIVE'
              order by account.id
              for update of account
            `;
            const [count] = await tx<Array<{ active_admins: number }>>`
              select count(*)::int as active_admins
              from company_role_assignments role
              join company_organization_memberships membership on membership.id = role.membership_id
              join company_accounts account on account.id = membership.account_id
              where role.role_key = 'COMPANY_ADMIN' and membership.status = 'ACTIVE'
                and account.status = 'ACTIVE'
            `;
            if ((count?.active_admins ?? 0) <= 1) {
              throw new CompanyIdentityError("LAST_COMPANY_ADMIN_REQUIRED", "At least one active company administrator is required.");
            }
          }
          await tx`
            update company_accounts set status = ${input.status}, auth_version = auth_version + 1,
              status_changed_at = now(), updated_at = now() where id = ${input.targetAccountId}
          `;
          const sessionsRevoked = input.status === "SUSPENDED"
            ? await revokeForAccount(tx, input.targetAccountId, new Date(), "ACCOUNT_SUSPENDED")
            : 0;
          await appendAudit(tx, {
            correlationId: input.correlationId, actorAccountId: input.actorAccountId,
            targetAccountId: input.targetAccountId, operation: "identity:employee-status",
            outcome: "SUCCEEDED", metadata: {
              previousStatus: employee.status, newStatus: input.status, sessionCount: sessionsRevoked,
            },
          });
          const updated = await loadEmployee(tx, input.targetAccountId);
          if (!updated) throw new Error("IDENTITY_EMPLOYEE_PROJECTION_FAILED");
          return { employee: updated, sessionsRevoked } as Record<string, unknown>;
        },
      });
      return result as { employee: Employee; sessionsRevoked: number };
    },

    async setApplicationRoles(input) {
      await assertCompanyAdmin(sql, input.actorAccountId);
      const result = await runIdempotent({
        sql, operation: "identity:application-roles", scopeKey: `account:${input.targetAccountId}`,
        idempotencyKey: input.idempotencyKey,
        request: { applicationKey: input.applicationKey, roleKeys: input.roleKeys },
        work: async (tx) => {
          const [scope] = await tx<Array<{ application_id: string; organization_id: string; membership_id: string }>>`
            select application.id as application_id, membership.organization_id, membership.id as membership_id
            from company_accounts account
            join company_organization_memberships membership on membership.account_id = account.id
            cross join company_applications application
            where account.id = ${input.targetAccountId} and application.stable_key = ${input.applicationKey}
          `;
          if (!scope) throw new CompanyIdentityError("EMPLOYEE_NOT_FOUND", "Employee or application was not found.");
          await tx`
            delete from company_application_role_assignments
             where membership_id = ${scope.membership_id} and application_id = ${scope.application_id}
          `;
          for (const roleKey of [...new Set(input.roleKeys)]) {
            await tx`
              insert into company_application_role_assignments (
                organization_id, membership_id, application_id, role_key, assigned_by_account_id
              ) values (${scope.organization_id}, ${scope.membership_id}, ${scope.application_id}, ${roleKey}, ${input.actorAccountId})
            `;
          }
          await appendAudit(tx, {
            correlationId: input.correlationId, actorAccountId: input.actorAccountId,
            applicationId: scope.application_id, targetAccountId: input.targetAccountId,
            operation: "identity:application-roles", outcome: "SUCCEEDED",
            metadata: {
              source: "accounts-ui",
              roleKey: input.roleKeys[0] ?? "NONE",
            },
          });
          const employee = await loadEmployee(tx, input.targetAccountId);
          if (!employee) throw new Error("IDENTITY_EMPLOYEE_PROJECTION_FAILED");
          return employee as Employee & Record<string, unknown>;
        },
      });
      return result as Employee;
    },

    async setCompanyRoles(input) {
      await assertCompanyAdmin(sql, input.actorAccountId);
      const result = await runIdempotent({
        sql,
        operation: "identity:company-roles",
        scopeKey: `account:${input.targetAccountId}`,
        idempotencyKey: input.idempotencyKey,
        request: { roleKeys: input.roleKeys },
        work: async (tx) => {
          const employee = await loadEmployee(tx, input.targetAccountId);
          if (!employee) {
            throw new CompanyIdentityError("EMPLOYEE_NOT_FOUND", "Employee was not found.");
          }
          const removesAdmin =
            employee.companyRoles.includes("COMPANY_ADMIN") &&
            !input.roleKeys.includes("COMPANY_ADMIN");
          if (removesAdmin) {
            await tx`
              select account.id
              from company_role_assignments role
              join company_organization_memberships membership on membership.id = role.membership_id
              join company_accounts account on account.id = membership.account_id
              where role.role_key = 'COMPANY_ADMIN' and membership.status = 'ACTIVE'
              order by account.id
              for update of account
            `;
            const [count] = await tx<Array<{ active_admins: number }>>`
              select count(*)::int as active_admins
              from company_role_assignments role
              join company_organization_memberships membership on membership.id = role.membership_id
              join company_accounts account on account.id = membership.account_id
              where role.role_key = 'COMPANY_ADMIN' and membership.status = 'ACTIVE'
                and account.status = 'ACTIVE'
            `;
            if ((count?.active_admins ?? 0) <= 1) {
              throw new CompanyIdentityError(
                "LAST_COMPANY_ADMIN_REQUIRED",
                "At least one active company administrator is required.",
              );
            }
          }
          const [membership] = await tx<Array<{ id: string; organization_id: string }>>`
            select id, organization_id from company_organization_memberships
             where account_id = ${input.targetAccountId} and status = 'ACTIVE'
             limit 1
          `;
          if (!membership) {
            throw new CompanyIdentityError("EMPLOYEE_NOT_FOUND", "Employee was not found.");
          }
          await tx`delete from company_role_assignments where membership_id = ${membership.id}`;
          for (const roleKey of [...new Set(input.roleKeys)]) {
            await tx`
              insert into company_role_assignments (
                organization_id, membership_id, role_key, assigned_by_account_id
              ) values (${membership.organization_id}, ${membership.id}, ${roleKey}, ${input.actorAccountId})
            `;
          }
          await appendAudit(tx, {
            correlationId: input.correlationId,
            actorAccountId: input.actorAccountId,
            organizationId: membership.organization_id,
            targetAccountId: input.targetAccountId,
            operation: "identity:company-roles",
            outcome: "SUCCEEDED",
            metadata: { source: "accounts-ui", roleKey: input.roleKeys[0] ?? "EMPLOYEE" },
          });
          const updated = await loadEmployee(tx, input.targetAccountId);
          if (!updated) throw new Error("IDENTITY_EMPLOYEE_PROJECTION_FAILED");
          return updated as Employee & Record<string, unknown>;
        },
      });
      return result as Employee;
    },

    async resetCredential(input) {
      await assertCompanyAdmin(sql, input.actorAccountId);
      const result = await runIdempotent({
        sql, operation: "identity:credential-reset", scopeKey: `account:${input.targetAccountId}`,
        idempotencyKey: input.idempotencyKey, request: {
          targetAccountId: input.targetAccountId,
          credentialFingerprint: input.credentialFingerprint,
        },
        work: async (tx) => {
          const updatedRows = await tx`
            update company_password_credentials set password_hash = ${input.passwordHash},
              algorithm = 'ARGON2ID', credential_version = credential_version + 1, updated_at = now()
             where account_id = ${input.targetAccountId} returning account_id
          `;
          if (updatedRows.length !== 1) throw new CompanyIdentityError("EMPLOYEE_NOT_FOUND", "Employee was not found.");
          await tx`update company_accounts set auth_version = auth_version + 1, updated_at = now() where id = ${input.targetAccountId}`;
          const sessionsRevoked = await revokeForAccount(tx, input.targetAccountId, new Date(), "CREDENTIAL_RESET");
          await appendAudit(tx, {
            correlationId: input.correlationId, actorAccountId: input.actorAccountId,
            targetAccountId: input.targetAccountId, operation: "identity:credential-reset",
            outcome: "SUCCEEDED", metadata: { credentialAlgorithm: "ARGON2ID", sessionCount: sessionsRevoked },
          });
          const employee = await loadEmployee(tx, input.targetAccountId);
          if (!employee) throw new Error("IDENTITY_EMPLOYEE_PROJECTION_FAILED");
          return { employee, sessionsRevoked } as Record<string, unknown>;
        },
      });
      return result as { employee: Employee; sessionsRevoked: number };
    },

    async revokeEmployeeSessions(input) {
      await assertCompanyAdmin(sql, input.actorAccountId);
      const result = await runIdempotent({
        sql, operation: "identity:session-revoke", scopeKey: `account:${input.targetAccountId}`,
        idempotencyKey: input.idempotencyKey, request: { targetAccountId: input.targetAccountId },
        work: async (tx) => {
          const employee = await loadEmployee(tx, input.targetAccountId);
          if (!employee) throw new CompanyIdentityError("EMPLOYEE_NOT_FOUND", "Employee was not found.");
          const sessionsRevoked = await revokeForAccount(tx, input.targetAccountId, new Date(), "ADMIN_REVOKE");
          await appendAudit(tx, {
            correlationId: input.correlationId, actorAccountId: input.actorAccountId,
            targetAccountId: input.targetAccountId, operation: "identity:session-revoke",
            outcome: "SUCCEEDED", metadata: { sessionCount: sessionsRevoked },
          });
          return { employee, sessionsRevoked } as Record<string, unknown>;
        },
      });
      return result as { employee: Employee; sessionsRevoked: number };
    },
  };
  return Object.freeze(repository);
}
