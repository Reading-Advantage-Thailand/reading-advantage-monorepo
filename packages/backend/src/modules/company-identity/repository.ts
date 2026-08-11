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

/** Secret-free context returned when one application session is revoked. */
export type ApplicationSessionRevocation =
  | {
      /** Discriminator proving an active session was revoked. */
      readonly revoked: true;
      /** Account that owned the revoked session. */
      readonly accountId: string;
      /** Application that owned the revoked session. */
      readonly applicationId: string;
    }
  | {
      /** Discriminator proving no active session was found. */
      readonly revoked: false;
    };

/** Hash-free protocol audit operation supplied to an atomic repository seam. */
export interface IdentityAuditMutation {
  /** Correlation identifier retained by the immutable audit row. */
  readonly correlationId: string;
  /** Optional acting account resolved by the service or transaction. */
  readonly actorAccountId?: string;
  /** Optional application scope resolved by the service or transaction. */
  readonly applicationId?: string;
  /** Optional organization scope resolved by the service or transaction. */
  readonly organizationId?: string;
  /** Optional target account resolved by the service or transaction. */
  readonly targetAccountId?: string;
  /** Stable operation name. */
  readonly operation: string;
  /** Stable outcome recorded when the transaction commits. */
  readonly outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  /** Optional stable reason code. */
  readonly reasonCode?: string;
  /** Reviewed secret-safe metadata. */
  readonly metadata: Readonly<Record<string, boolean | number | string | null>>;
}

/** Input for inserting one hash-only authorization code. */
export interface AuthorizationCodeInsert {
  /** Authorization-code row ID. */
  readonly id: string;
  /** Digest of the opaque authorization code. */
  readonly codeHash: string;
  /** Internal OIDC client row ID. */
  readonly clientId: string;
  /** Exact registered redirect row ID. */
  readonly redirectUriId: string;
  /** Accounts SSO session row ID. */
  readonly ssoSessionId: string;
  /** PKCE S256 challenge. */
  readonly codeChallenge: string;
  /** OpenID nonce. */
  readonly nonce: string;
  /** Requested OpenID scopes. */
  readonly scope: readonly string[];
  /** Issuance instant. */
  readonly issuedAt: Date;
  /** Absolute code expiry. */
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

/** Hash-only Accounts SSO session row accepted by the atomic login seam. */
export interface SsoSessionInsert {
  /** Stable SSO session identifier. */
  readonly id: string;
  /** Digest of the opaque SSO token. */
  readonly tokenHash: string;
  /** Owning organization identifier. */
  readonly organizationId: string;
  /** Owning organization membership identifier. */
  readonly membershipId: string;
  /** Account authentication version captured by the session. */
  readonly authVersion: number;
  /** Session creation instant. */
  readonly createdAt: Date;
  /** Idle expiration instant. */
  readonly idleExpiresAt: Date;
  /** Absolute expiration instant. */
  readonly absoluteExpiresAt: Date;
  /** User-agent metadata retained for session operations. */
  readonly userAgent: string;
}

/** Transport-independent persistence contract owned by the Accounts backend. */
export interface CompanyIdentityRepository {
  /** Finds one employee and credential by normalized username. */
  findCredentialByUsername(
    username: string,
  ): Promise<EmployeeCredentialRecord | null>;
  /** Atomically persists an SSO session, optional legacy upgrade, and success audit. */
  createSsoSessionWithAudit(input: {
    /** Hash-only SSO session row. */
    readonly session: SsoSessionInsert;
    /** Immutable success audit that must commit with the session. */
    readonly audit: IdentityAuditMutation;
    /** Optional Argon2id replacement for a verified legacy credential. */
    readonly credentialUpgrade?: {
      readonly accountId: string;
      readonly passwordHash: string;
    };
  }): Promise<void>;
  /** Resolves a live SSO session and account-status version. */
  findSsoSession(
    tokenHash: string,
    now: Date,
    nextIdleExpiresAt: Date,
  ): Promise<SsoSessionRecord | null>;
  /** Resolves a live SSO session by its internal ID during code exchange. */
  findSsoSessionById(
    sessionId: string,
    now: Date,
    nextIdleExpiresAt: Date,
  ): Promise<SsoSessionRecord | null>;
  /** Resolves an exact active OIDC client registration and callback. */
  findOidcClient(
    clientId: string,
    redirectUri: string,
  ): Promise<OidcClientRecord | null>;
  /** Resolves one active OIDC client for confidential endpoint authentication. */
  findOidcClientByClientId(clientId: string): Promise<{
    readonly id: string;
    readonly applicationKey: string;
    readonly clientType: "PUBLIC" | "CONFIDENTIAL";
    readonly clientSecretHash: string | null;
  } | null>;
  /** Returns application roles for a membership and application. */
  listApplicationRoles(
    membershipId: string,
    applicationId: string,
    now: Date,
  ): Promise<string[]>;
  /** Atomically inserts an authorization code and its required success audit. */
  createAuthorizationCodeWithAudit(input: {
    /** Hash-only authorization-code row to insert. */
    readonly code: AuthorizationCodeInsert;
    /** Audit row that must commit with the code. */
    readonly audit: IdentityAuditMutation;
  }): Promise<void>;
  /** Resolves an active application session and current audience claims. */
  introspectApplicationSession(
    tokenHash: string,
    now: Date,
    nextIdleExpiresAt: Date,
  ): Promise<{
    readonly sessionId: string;
    readonly employee: Employee;
    readonly organizationId: string;
    readonly organizationKey: string;
    /** Application row owning the active session. */
    readonly applicationId: string;
    readonly applicationKey: string;
    readonly roles: string[];
    readonly authVersion: number;
    readonly expiresAt: Date;
  } | null>;
  /** Atomically revokes one application session and appends its success audit. */
  revokeApplicationSessionWithAudit(input: {
    /** Digest of the opaque application token. */
    readonly tokenHash: string;
    /** Revocation instant. */
    readonly now: Date;
    /** Audit row that must commit with the revocation. */
    readonly audit: IdentityAuditMutation;
  }): Promise<ApplicationSessionRevocation>;
  /** Atomically revokes the central session, children, and success audit. */
  revokeSsoSessionWithAudit(input: {
    /** Digest of the opaque Accounts SSO token. */
    readonly tokenHash: string;
    /** Revocation instant. */
    readonly now: Date;
    /** Audit row that must commit with the revocation. */
    readonly audit: IdentityAuditMutation;
  }): Promise<number>;
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
  }): Promise<{
    readonly employee: Employee;
    readonly sessionsRevoked: number;
  }>;
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
  }): Promise<{
    readonly employee: Employee;
    readonly sessionsRevoked: number;
  }>;
  /** Revokes every central and application session for one employee. */
  revokeEmployeeSessions(input: {
    readonly actorAccountId: string;
    readonly targetAccountId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<{
    readonly employee: Employee;
    readonly sessionsRevoked: number;
  }>;
}

/** Internal application-session insert accepted only inside a code transaction. */
export interface ApplicationSessionInsert {
  /** Transaction receiving the insert. */
  readonly transaction: postgres.TransactionSql;
  /** Stable application-session identifier. */
  readonly id: string;
  /** Digest of the opaque application token. */
  readonly tokenHash: string;
  /** Parent SSO-session identifier. */
  readonly ssoSessionId: string;
  /** Owning organization identifier. */
  readonly organizationId: string;
  /** Owning membership identifier. */
  readonly membershipId: string;
  /** Target application identifier. */
  readonly applicationId: string;
  /** Account authentication version captured by the session. */
  readonly authVersion: number;
  /** Session creation instant. */
  readonly createdAt: Date;
  /** Session expiry instant. */
  readonly expiresAt: Date;
}

/** Internal operations made available only inside one atomic code transaction. */
export interface AuthorizationCodeTransactionContext {
  /** Transaction receiving all code-exchange effects. */
  readonly transaction: postgres.TransactionSql;
  /** Locked, unconsumed authorization-code projection. */
  readonly code: AuthorizationCodeRecord;
  /** Inserts one hash-only application session in this transaction. */
  readonly insertApplicationSession: (
    input: ApplicationSessionInsert,
  ) => Promise<void>;
  /** Appends one immutable audit row in this transaction. */
  readonly appendAudit: (input: IdentityAuditInput) => Promise<void>;
}

/** Internal handler invoked while an authorization code transaction is open. */
export type AuthorizationCodeTransactionHandler<T> = (
  context: AuthorizationCodeTransactionContext,
) => Promise<T>;

type AuthorizationCodeTransactionExecutor = <T>(
  codeHash: string,
  now: Date,
  handler: AuthorizationCodeTransactionHandler<T>,
) => Promise<T | null>;

const authorizationCodeExecutors = new WeakMap<
  object,
  AuthorizationCodeTransactionExecutor
>();

/**
 * Registers the private code-exchange transaction owned by a PostgreSQL adapter.
 * @param repository Repository object receiving the private executor.
 * @param executor Atomic code-consumption executor retained outside the public repository surface.
 * @returns Nothing.
 */
export function registerCompanyIdentityAuthorizationCodeExecutor(
  repository: object,
  executor: AuthorizationCodeTransactionExecutor,
): void {
  authorizationCodeExecutors.set(repository, executor);
}

/**
 * Executes one authorization-code exchange through the adapter-owned transaction.
 * @param repository Repository selected by the service.
 * @param codeHash Digest of the opaque authorization code.
 * @param now Current operation time.
 * @param handler Code-exchange work executed inside the transaction.
 * @returns The handler result, or null when no usable code exists.
 * @throws When the repository has no atomic exchange implementation.
 */
export function executeCompanyIdentityAuthorizationCode<T>(
  repository: CompanyIdentityRepository,
  codeHash: string,
  now: Date,
  handler: AuthorizationCodeTransactionHandler<T>,
): Promise<T | null> {
  const executor = authorizationCodeExecutors.get(repository);
  if (executor !== undefined) return executor(codeHash, now, handler);
  throw new Error("COMPANY_IDENTITY_ATOMIC_AUDIT_SEAMS_REQUIRED:exchange");
}
