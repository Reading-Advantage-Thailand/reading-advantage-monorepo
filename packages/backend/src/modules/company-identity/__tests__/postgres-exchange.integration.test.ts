import { createHash, randomBytes, randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { hashBearerToken } from "../protocol.js";
import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";
import { createCompanyIdentityService } from "../service.js";
import type { CompanyIdentityRepository } from "../repository.js";

interface CompanyIdentityMigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

const databaseUrl =
  process.env.COMPANY_IDENTITY_PG_TEST_URL ??
  process.env.COMPANY_IDENTITY_INTEGRATION_DATABASE_URL;

/** Applies the reviewed company-identity migration journal to the explicit test URL. */
async function migrateDatabase(url: string): Promise<void> {
  const migrationUrl = new URL(
    "../../../../../db/src/company-identity/migration.js",
    import.meta.url,
  ).href;
  const migration = (await import(
    /* @vite-ignore */ migrationUrl
  )) as CompanyIdentityMigrationModule;
  await migration.migrateCompanyIdentity({ directDatabaseUrl: url });
}

/** Creates the fixed crypto and service ports used by the live exchange proof. */
function createIntegrationService(
  repository: CompanyIdentityRepository,
  options?: { readonly createId?: () => string },
) {
  return createCompanyIdentityService({
    repository,
    passwords: {
      hash: async () => "$argon2id$integration",
      verify: async () => false,
      fingerprint: () => "a".repeat(64),
    },
    rateLimit: {
      check: async () => true,
      recordFailure: async () => undefined,
      recordSuccess: async () => undefined,
    },
    tokenSigner: {
      sign: async () => "i".repeat(32),
      verify: async () => {
        throw new Error("unused");
      },
      jwk: () => ({
        alg: "RS256",
        use: "sig",
        kid: "integration",
        kty: "RSA",
        n: "n",
        e: "AQAB",
      }),
    },
    config: {
      issuerUrl: "https://accounts.integration.example.test",
      ssoIdleTtlSeconds: 3600,
      ssoAbsoluteTtlSeconds: 7200,
      authorizationCodeTtlSeconds: 300,
      appSessionTtlSeconds: 1800,
    },
    now: () => new Date("2026-08-11T00:01:00.000Z"),
    createId: options?.createId,
  });
}

describe.skipIf(!databaseUrl)(
  "company identity PostgreSQL authorization-code exchange",
  () => {
    it(
      "commits exchange effects and rolls all of them back when the audit insert fails",
      { timeout: 60_000 },
      async () => {
        if (!databaseUrl) return;
        await migrateDatabase(databaseUrl);

        const sql = postgres(databaseUrl, { max: 2, prepare: false });
        const accountId = randomUUID();
        const organizationId = randomUUID();
        const membershipId = randomUUID();
        const applicationId = randomUUID();
        const oidcClientRowId = randomUUID();
        const redirectUriId = randomUUID();
        const ssoSessionId = randomUUID();
        const authorizationCodeRowId = randomUUID();
        const rollbackAuthorizationCodeRowId = randomUUID();
        const clientId = `integration-client-${randomBytes(6).toString("hex")}`;
        const organizationKey = `integration-${randomBytes(6).toString("hex")}`;
        const applicationKey = `integration-${randomBytes(6).toString("hex")}`;
        const username = `integration-${randomBytes(6).toString("hex")}`;
        const redirectUri = "https://integration.example.test/callback";
        const ssoToken = randomBytes(32).toString("base64url");
        const authorizationCode = randomBytes(32).toString("base64url");
        const rollbackAuthorizationCode = randomBytes(32).toString("base64url");
        const codeVerifier = "v".repeat(43);
        const codeChallenge = createHash("sha256")
          .update(codeVerifier)
          .digest("base64url");
        const issuedAt = new Date("2026-08-11T00:00:00.000Z");

        try {
          await sql.begin(async (transaction) => {
            await transaction`
              insert into company_accounts
                (id, username, normalized_username, display_name)
              values
                (${accountId}, ${username}, ${username}, 'Integration Employee')
            `;
            await transaction`
              insert into company_organizations (id, stable_key, display_name)
              values (${organizationId}, ${organizationKey}, 'Integration Organization')
            `;
            await transaction`
              insert into company_organization_memberships
                (id, organization_id, account_id)
              values (${membershipId}, ${organizationId}, ${accountId})
            `;
            await transaction`
              insert into company_applications (id, stable_key, display_name)
              values (${applicationId}, ${applicationKey}, 'Integration Application')
            `;
            await transaction`
              insert into company_oidc_clients
                (id, application_id, client_id, client_type, token_auth_method)
              values
                (${oidcClientRowId}, ${applicationId}, ${clientId}, 'PUBLIC', 'NONE')
            `;
            await transaction`
              insert into company_oidc_redirect_uris
                (id, oidc_client_id, redirect_uri)
              values (${redirectUriId}, ${oidcClientRowId}, ${redirectUri})
            `;
            await transaction`
              insert into company_sso_sessions
                (id, token_hash, organization_id, membership_id,
                 account_auth_version, created_at, last_seen_at,
                 idle_expires_at, absolute_expires_at, user_agent)
              values
                (${ssoSessionId}, ${hashBearerToken(ssoToken)}, ${organizationId},
                 ${membershipId}, 1, ${issuedAt}, ${issuedAt},
                 ${new Date("2026-08-11T01:00:00.000Z")},
                 ${new Date("2026-08-11T02:00:00.000Z")}, 'integration-test')
            `;
            await transaction`
              insert into company_oidc_authorization_codes
                (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
                 code_challenge, code_challenge_method, nonce, scope,
                 issued_at, expires_at)
              values
                (${authorizationCodeRowId}, ${hashBearerToken(authorizationCode)},
                 ${oidcClientRowId}, ${redirectUriId}, ${ssoSessionId},
                 ${codeChallenge}, 'S256', 'integration-nonce',
                 ${["openid", "profile"]}, ${issuedAt},
                 ${new Date("2026-08-11T00:05:00.000Z")})
            `;
          });

          const repository = createPostgresCompanyIdentityRepository(sql);
          const identity = createIntegrationService(repository);
          const result = await identity.exchangeCode({
            grantType: "authorization_code",
            code: authorizationCode,
            clientId,
            redirectUri,
            codeVerifier,
          });

          expect(result).toMatchObject({
            tokenType: "Bearer",
            idToken: "i".repeat(32),
          });
          const [codeRow] = await sql<Array<{ consumed_at: Date | null }>>`
            select consumed_at
              from company_oidc_authorization_codes
             where id = ${authorizationCodeRowId}
          `;
          const [sessionCount] = await sql<Array<{ count: number }>>`
            select count(*)::int as count
              from company_application_sessions
             where sso_session_id = ${ssoSessionId}
          `;
          const auditRows = await sql<
            Array<{
              actor_account_id: string;
              application_id: string;
              target_account_id: string;
              metadata: Record<string, unknown>;
            }>
          >`
            select actor_account_id, application_id, target_account_id, metadata
              from company_identity_audit_events
             where correlation_id is not null
               and actor_account_id = ${accountId}
               and operation = 'identity:oidc-token-exchange'
          `;

          expect(codeRow?.consumed_at).toBeInstanceOf(Date);
          expect(sessionCount?.count).toBe(1);
          expect(auditRows).toHaveLength(1);
          expect(auditRows[0]).toMatchObject({
            actor_account_id: accountId,
            application_id: applicationId,
            target_account_id: accountId,
            metadata: {
              requestedClientId: clientId,
              registeredClientId: clientId,
            },
          });
          expect(auditRows[0]?.metadata).not.toHaveProperty("routeBindingId");

          await sql`
            insert into company_oidc_authorization_codes
              (id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
               code_challenge, code_challenge_method, nonce, scope,
               issued_at, expires_at)
            values
              (${rollbackAuthorizationCodeRowId}, ${hashBearerToken(rollbackAuthorizationCode)},
               ${oidcClientRowId}, ${redirectUriId}, ${ssoSessionId},
               ${codeChallenge}, 'S256', 'rollback-nonce',
               ${["openid", "profile"]}, ${issuedAt},
               ${new Date("2026-08-11T00:05:00.000Z")})
          `;

          // Force the real audit INSERT to fail while the exchange transaction is open.
          // The production repository remains unchanged and exposes no raw transaction mutator.
          const failingIdentity = createIntegrationService(repository, {
            createId: () => "not-a-valid-audit-correlation-id",
          });
          await expect(
            failingIdentity.exchangeCode({
              grantType: "authorization_code",
              code: rollbackAuthorizationCode,
              clientId,
              redirectUri,
              codeVerifier,
            }),
          ).rejects.toMatchObject({ code: "22P02" });

          const [rollbackCodeRow] = await sql<
            Array<{ consumed_at: Date | null }>
          >`
            select consumed_at
              from company_oidc_authorization_codes
             where id = ${rollbackAuthorizationCodeRowId}
          `;
          const [rollbackSessionCount] = await sql<Array<{ count: number }>>`
            select count(*)::int as count
              from company_application_sessions
             where sso_session_id = ${ssoSessionId}
          `;
          const [auditCount] = await sql<Array<{ count: number }>>`
            select count(*)::int as count
              from company_identity_audit_events
             where actor_account_id = ${accountId}
               and operation = 'identity:oidc-token-exchange'
          `;

          expect(rollbackCodeRow?.consumed_at).toBeNull();
          expect(rollbackSessionCount?.count).toBe(1);
          expect(auditCount?.count).toBe(1);
        } finally {
          // Audit rows are immutable by design; the explicit PG URL must be disposable.
          await sql.end({ timeout: 5 });
        }
      },
    );
  },
);
