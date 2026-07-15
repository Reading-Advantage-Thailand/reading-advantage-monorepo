import { createHash } from "node:crypto";
import type postgres from "postgres";

/**
 * Computes the lowercase SHA-256 digest persisted for an opaque bearer value.
 * @param value The raw bearer token or authorization code.
 * @returns The lowercase hexadecimal digest.
 */
function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Persists an SSO session using only the SHA-256 digest of its bearer token.
 * @param input Session fields and the raw token that must never reach storage.
 * @returns A promise that resolves after the session row is inserted.
 * @throws When PostgreSQL rejects the session fields or the insert fails.
 */
export async function persistCompanySsoSession(input: {
  readonly sql: postgres.Sql;
  readonly id: string;
  readonly rawToken: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly accountAuthVersion: number;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly userAgent: string;
}): Promise<void> {
  await input.sql`
    insert into company_sso_sessions (
      id, token_hash, organization_id, membership_id, account_auth_version,
      created_at, last_seen_at, idle_expires_at, absolute_expires_at, user_agent
    ) values (
      ${input.id}, ${sha256(input.rawToken)}, ${input.organizationId},
      ${input.membershipId}, ${input.accountAuthVersion}, ${input.createdAt},
      ${input.lastSeenAt}, ${input.idleExpiresAt}, ${input.absoluteExpiresAt},
      ${input.userAgent}
    )
  `;
}

/**
 * Persists an OIDC authorization code using only the SHA-256 digest of the raw code.
 * @param input Authorization-code fields and the raw code that must never reach storage.
 * @returns A promise that resolves after the authorization-code row is inserted.
 * @throws When PostgreSQL rejects the authorization-code fields or the insert fails.
 */
export async function persistCompanyOidcAuthorizationCode(input: {
  readonly sql: postgres.Sql;
  readonly id: string;
  readonly rawCode: string;
  readonly oidcClientId: string;
  readonly redirectUriId: string;
  readonly ssoSessionId: string;
  readonly codeChallenge: string;
  readonly nonce: string;
  readonly scope: readonly string[];
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}): Promise<void> {
  await input.sql`
    insert into company_oidc_authorization_codes (
      id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
      code_challenge, code_challenge_method, nonce, scope, issued_at, expires_at
    ) values (
      ${input.id}, ${sha256(input.rawCode)}, ${input.oidcClientId},
      ${input.redirectUriId}, ${input.ssoSessionId}, ${input.codeChallenge},
      'S256', ${input.nonce}, ${input.scope}, ${input.issuedAt}, ${input.expiresAt}
    )
  `;
}
