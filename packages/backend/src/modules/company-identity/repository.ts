import type postgres from "postgres";

import type { Employee } from "./contracts.js";

/** Credential-bearing internal record used only during password verification. */
export interface EmployeeCredentialRecord {
  /** Public employee projection. */
  readonly employee: Employee;
  /** Active organization membership ID. */
  readonly membershipId: string;
  /** Stable organization ID. */
  readonly organizationId: string;
  /** Stable organization key. */
  readonly organizationKey: string;
  /** Current account authentication version. */
  readonly authVersion: number;
  /** Password hash retained only inside the authentication operation. */
  readonly passwordHash: string;
  /** Password hash algorithm. */
  readonly passwordAlgorithm: "ARGON2ID" | "BCRYPT";
}

/** Active SSO-session projection used for authorization. */
export interface SsoSessionRecord {
  /** Stable SSO session ID. */
  readonly id: string;
  /** Account ID. */
  readonly accountId: string;
  /** Organization membership ID. */
  readonly membershipId: string;
  /** Organization ID. */
  readonly organizationId: string;
  /** Organization key. */
  readonly organizationKey: string;
  /** Account authentication version captured by the session. */
  readonly authVersion: number;
  /** Absolute expiry. */
  readonly expiresAt: Date;
}

/** Exact registered OIDC client and redirect. */
export interface OidcClientRecord {
  /** Internal client row ID. */
  readonly id: string;
  /** Public client ID. */
  readonly clientId: string;
  /** Application ID. */
  readonly applicationId: string;
  /** Stable application audience key. */
  readonly applicationKey: string;
  /** Confidentiality mode. */
  readonly clientType: "PUBLIC" | "CONFIDENTIAL";
  /** Optional Argon2id secret hash for confidential clients. */
  readonly clientSecretHash: string | null;
  /** Exact registered redirect row ID. */
  readonly redirectUriId: string;
  /** Exact registered redirect URI. */
  readonly redirectUri: string;
}

/** One-time authorization-code record locked during exchange. */
export interface AuthorizationCodeRecord {
  /** Authorization-code row ID. */
  readonly id: string;
  /** Registered OIDC client. */
  readonly client: OidcClientRecord;
  /** Accounts SSO session ID. */
  readonly ssoSessionId: string;
  /** PKCE S256 challenge. */
  readonly codeChallenge: string;
  /** Original OpenID nonce. */
  readonly nonce: string;
  /** Expiry instant. */
  readonly expiresAt: Date;
}

/** Input used when inserting an immutable identity audit event. */
export interface IdentityAuditInput {
  /** Correlation identifier. */
  readonly correlationId: string;
  /** Optional acting account. */
  readonly actorAccountId?: string;
  /** Optional application scope. */
  readonly applicationId?: string;
  /** Optional organization scope. */
  readonly organizationId?: string;
  /** Optional target account. */
  readonly targetAccountId?: string;
  /** Stable operation name. */
  readonly operation: string;
  /** Stable outcome. */
  readonly outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  /** Optional stable reason code. */
  readonly reasonCode?: string;
  /** Reviewed metadata only. */
  readonly metadata: Readonly<Record<string, boolean | number | string | null>>;
}

/** Transport-independent persistence contract owned by the Accounts backend. */
export interface CompanyIdentityRepository {
  /** Finds one employee and credential by normalized username. */
  findCredentialByUsername(username: string): Promise<EmployeeCredentialRecord | null>;
  /** Replaces a legacy password hash after successful verification. */
  upgradePasswordHash(accountId: string, passwordHash: string): Promise<void>;
  /** Persists a new hash-only Accounts SSO session. */
  createSsoSession(input: {
    readonly id: string;
    readonly tokenHash: string;
    readonly organizationId: string;
    readonly membershipId: string;
    readonly authVersion: number;
    readonly createdAt: Date;
    readonly idleExpiresAt: Date;
    readonly absoluteExpiresAt: Date;
    readonly userAgent: string;
  }): Promise<void>;
  /** Resolves a live SSO session and account-status version. */
  findSsoSession(tokenHash: string, now: Date, nextIdleExpiresAt: Date): Promise<SsoSessionRecord | null>;
  /** Resolves a live SSO session by its internal ID during code exchange. */
  findSsoSessionById(sessionId: string, now: Date, nextIdleExpiresAt: Date): Promise<SsoSessionRecord | null>;
  /** Resolves an exact active OIDC client registration and callback. */
  findOidcClient(clientId: string, redirectUri: string): Promise<OidcClientRecord | null>;
  /** Resolves one active OIDC client for confidential endpoint authentication. */
  findOidcClientByClientId(clientId: string): Promise<{
    readonly id: string;
    readonly applicationKey: string;
    readonly clientType: "PUBLIC" | "CONFIDENTIAL";
    readonly clientSecretHash: string | null;
  } | null>;
  /** Returns application roles for a membership and application. */
  listApplicationRoles(membershipId: string, applicationId: string, now: Date): Promise<string[]>;
  /** Inserts a one-time hash-only authorization code. */
  createAuthorizationCode(input: {
    readonly id: string;
    readonly codeHash: string;
    readonly clientId: string;
    readonly redirectUriId: string;
    readonly ssoSessionId: string;
    readonly codeChallenge: string;
    readonly nonce: string;
    readonly scope: readonly string[];
    readonly issuedAt: Date;
    readonly expiresAt: Date;
  }): Promise<void>;
  /** Consumes an authorization code atomically inside a transaction. */
  consumeAuthorizationCode<T>(
    codeHash: string,
    now: Date,
    handler: (transaction: postgres.TransactionSql, code: AuthorizationCodeRecord) => Promise<T>,
  ): Promise<T | null>;
  /** Creates a hash-only application session inside a code-exchange transaction. */
  createApplicationSession(input: {
    readonly transaction: postgres.TransactionSql;
    readonly id: string;
    readonly tokenHash: string;
    readonly ssoSessionId: string;
    readonly organizationId: string;
    readonly membershipId: string;
    readonly applicationId: string;
    readonly authVersion: number;
    readonly createdAt: Date;
    readonly expiresAt: Date;
  }): Promise<void>;
  /** Resolves an active application session and current audience claims. */
  introspectApplicationSession(tokenHash: string, now: Date, nextIdleExpiresAt: Date): Promise<{
    readonly sessionId: string;
    readonly employee: Employee;
    readonly organizationId: string;
    readonly organizationKey: string;
    readonly applicationKey: string;
    readonly roles: string[];
    readonly authVersion: number;
    readonly expiresAt: Date;
  } | null>;
  /** Revokes one application-local session. */
  revokeApplicationSession(tokenHash: string, now: Date): Promise<boolean>;
  /** Revokes the central SSO session and all derived application sessions. */
  revokeSsoSession(tokenHash: string, now: Date): Promise<number>;
  /** Inserts immutable secret-safe audit evidence. */
  appendAudit(input: IdentityAuditInput): Promise<void>;
  /** Lists employees visible to a company administrator. */
  listEmployees(actorAccountId: string): Promise<Employee[]>;
  /** Returns one public employee projection without credential data. */
  getEmployee(accountId: string): Promise<Employee | null>;
  /** Creates one employee transactionally and idempotently. */
  createEmployee(input: {
    readonly actorAccountId: string;
    readonly username: string;
    readonly displayName: string;
    readonly passwordHash: string;
    readonly credentialFingerprint: string;
    readonly companyRoles: readonly ("EMPLOYEE" | "COMPANY_ADMIN")[];
    readonly appRoles: Readonly<Record<string, readonly string[]>>;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<Employee>;
  /** Changes employee status while preserving the last-company-admin invariant. */
  setEmployeeStatus(input: {
    readonly actorAccountId: string;
    readonly targetAccountId: string;
    readonly status: "ACTIVE" | "SUSPENDED";
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<{ readonly employee: Employee; readonly sessionsRevoked: number }>;
  /** Replaces roles for one application without affecting other applications. */
  setApplicationRoles(input: {
    readonly actorAccountId: string;
    readonly targetAccountId: string;
    readonly applicationKey: string;
    readonly roleKeys: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<Employee>;
  /** Replaces additive company roles while protecting the last administrator. */
  setCompanyRoles(input: {
    readonly actorAccountId: string;
    readonly targetAccountId: string;
    readonly roleKeys: readonly ("EMPLOYEE" | "COMPANY_ADMIN")[];
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<Employee>;
  /** Resets a credential and revokes sessions atomically. */
  resetCredential(input: {
    readonly actorAccountId: string;
    readonly targetAccountId: string;
    readonly passwordHash: string;
    readonly credentialFingerprint: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<{ readonly employee: Employee; readonly sessionsRevoked: number }>;
  /** Revokes every central and application session for one employee. */
  revokeEmployeeSessions(input: {
    readonly actorAccountId: string;
    readonly targetAccountId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<{ readonly employee: Employee; readonly sessionsRevoked: number }>;
}
