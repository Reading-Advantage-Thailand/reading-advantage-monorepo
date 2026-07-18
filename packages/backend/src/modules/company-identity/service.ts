import { randomBytes, randomUUID } from "node:crypto";

import {
  authenticateEmployeeInputSchema,
  authenticateEmployeeOutputSchema,
  createEmployeeInputSchema,
  employeeSchema,
  introspectionInputSchema,
  introspectionOutputSchema,
  managementResultSchema,
  oidcAuthorizationInputSchema,
  oidcAuthorizationOutputSchema,
  oidcTokenInputSchema,
  oidcTokenOutputSchema,
  resetCredentialInputSchema,
  revokeEmployeeSessionsInputSchema,
  setApplicationRolesInputSchema,
  setCompanyRolesInputSchema,
  setEmployeeStatusInputSchema,
  type CompanyIdentityClaims,
  type Employee,
} from "./contracts.js";
import { CompanyIdentityError } from "./errors.js";
import {
  hashBearerToken,
  projectSecretSafeAuditMetadata,
  verifyPkceS256,
  type IdentityTokenSigner,
} from "./protocol.js";
import type { CompanyIdentityRepository } from "./repository.js";

/** Password operations supplied behind the identity service adapter. */
export interface CompanyPasswordPort {
  /** Verifies plaintext against Argon2id or an approved legacy hash. */
  verify(password: string, passwordHash: string): Promise<boolean>;
  /** Creates an Argon2id password hash. */
  hash(password: string): Promise<string>;
  /** Creates a deterministic keyed digest used only for idempotency binding. */
  fingerprint(password: string): string;
}

/** Shared persistent login-limit adapter. */
export interface CompanyLoginRateLimitPort {
  /** Returns false when the username/IP pair is currently throttled. */
  check(input: {
    readonly username: string;
    readonly ipAddress: string;
    readonly now: Date;
  }): Promise<boolean>;
  /** Records a failed non-enumerating authentication attempt. */
  recordFailure(input: {
    readonly username: string;
    readonly ipAddress: string;
    readonly now: Date;
  }): Promise<void>;
  /** Clears the username failure bucket after successful authentication. */
  recordSuccess(input: {
    readonly username: string;
    readonly now: Date;
  }): Promise<void>;
}

/** Configuration governing issuer and session lifetime behavior. */
export interface CompanyIdentityServiceConfig {
  /** Exact OpenID issuer URL. */
  readonly issuerUrl: string;
  /** SSO idle lifetime in seconds. */
  readonly ssoIdleTtlSeconds: number;
  /** SSO absolute lifetime in seconds. */
  readonly ssoAbsoluteTtlSeconds: number;
  /** Authorization-code lifetime in seconds. */
  readonly authorizationCodeTtlSeconds: number;
  /** Application-session lifetime in seconds. */
  readonly appSessionTtlSeconds: number;
}

/** Transport-independent employee identity, SSO, and administration service. */
export interface CompanyIdentityService {
  /** Authenticates a first-party employee and establishes the Accounts session. */
  authenticate(input: unknown): Promise<ReturnType<typeof authenticateEmployeeOutputSchema.parse>>;
  /** Issues a one-time code after exact client, callback, PKCE, and session checks. */
  authorize(input: unknown): Promise<ReturnType<typeof oidcAuthorizationOutputSchema.parse>>;
  /** Atomically exchanges a one-time code for audience-specific tokens. */
  exchangeCode(input: unknown): Promise<ReturnType<typeof oidcTokenOutputSchema.parse>>;
  /** Returns active identity state for an application bearer session. */
  introspect(input: unknown): Promise<ReturnType<typeof introspectionOutputSchema.parse>>;
  /** Returns the employee associated with a live Accounts SSO session. */
  currentEmployee(ssoSessionToken: string): Promise<Employee | null>;
  /** Ends only one application-local session. */
  localLogout(accessToken: string): Promise<boolean>;
  /** Ends one Accounts session and every derived application session. */
  globalLogout(ssoSessionToken: string): Promise<number>;
  /** Lists employees after repository-level company-admin authorization. */
  listEmployees(actorAccountId: string): Promise<Employee[]>;
  /** Creates an employee and initial scoped roles. */
  createEmployee(input: unknown): Promise<Employee>;
  /** Suspends or restores an employee. */
  setEmployeeStatus(input: unknown): Promise<ReturnType<typeof managementResultSchema.parse>>;
  /** Replaces roles within one application only. */
  setApplicationRoles(input: unknown): Promise<Employee>;
  /** Replaces additive company roles without granting application access. */
  setCompanyRoles(input: unknown): Promise<Employee>;
  /** Replaces an employee password and revokes all sessions. */
  resetCredential(input: unknown): Promise<ReturnType<typeof managementResultSchema.parse>>;
  /** Revokes every employee session without changing credentials. */
  revokeEmployeeSessions(input: unknown): Promise<ReturnType<typeof managementResultSchema.parse>>;
}

function plusSeconds(value: Date, seconds: number): Date {
  return new Date(value.getTime() + seconds * 1000);
}

function opaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Creates the company identity service from portable persistence and crypto ports.
 * @param dependencies Repository, password, rate-limit, signing, clock, and configuration ports.
 * @returns Transport-independent identity service.
 */
export function createCompanyIdentityService(dependencies: {
  readonly repository: CompanyIdentityRepository;
  readonly passwords: CompanyPasswordPort;
  readonly rateLimit: CompanyLoginRateLimitPort;
  readonly tokenSigner: IdentityTokenSigner;
  readonly config: CompanyIdentityServiceConfig;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly createToken?: () => string;
}): CompanyIdentityService {
  const now = dependencies.now ?? (() => new Date());
  const createId = dependencies.createId ?? randomUUID;
  const createToken = dependencies.createToken ?? opaqueToken;

  async function runAuditedManagement<T>(input: {
    readonly actorAccountId: string;
    readonly targetAccountId?: string;
    readonly operation: string;
    readonly correlationId: string;
    readonly work: () => Promise<T>;
  }): Promise<T> {
    try {
      return await input.work();
    } catch (error) {
      const repositoryAlreadyAuditedDenial =
        error instanceof CompanyIdentityError && error.code === "FORBIDDEN";
      if (!repositoryAlreadyAuditedDenial) {
        await dependencies.repository.appendAudit({
          correlationId: input.correlationId,
          actorAccountId: input.actorAccountId,
          targetAccountId: input.targetAccountId,
          operation: input.operation,
          outcome: "FAILED",
          reasonCode: error instanceof CompanyIdentityError
            ? error.code
            : "INTERNAL_ERROR",
          metadata: projectSecretSafeAuditMetadata({
            source: "accounts-backend",
            reasonCategory: error instanceof CompanyIdentityError
              ? "domain"
              : "internal",
          }),
        });
      }
      throw error;
    }
  }

  return Object.freeze({
    async authenticate(input: unknown) {
      const parsed = authenticateEmployeeInputSchema.parse(input);
      const operationTime = now();
      if (!(await dependencies.rateLimit.check({
        username: parsed.username,
        ipAddress: parsed.ipAddress,
        now: operationTime,
      }))) {
        throw new CompanyIdentityError("RATE_LIMITED", "Sign-in is temporarily unavailable.");
      }
      const credential = await dependencies.repository.findCredentialByUsername(parsed.username);
      const passwordHash = credential?.passwordHash ??
        "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      const valid = await dependencies.passwords.verify(parsed.password, passwordHash);
      if (!credential || !valid || credential.employee.status !== "ACTIVE") {
        await dependencies.rateLimit.recordFailure({
          username: parsed.username,
          ipAddress: parsed.ipAddress,
          now: operationTime,
        });
        await dependencies.repository.appendAudit({
          correlationId: createId(),
          operation: "identity:login",
          outcome: "DENIED",
          reasonCode: "AUTHENTICATION_FAILED",
          metadata: projectSecretSafeAuditMetadata({ clientId: parsed.clientId }),
        });
        throw new CompanyIdentityError("AUTHENTICATION_FAILED", "Username or password is invalid.");
      }
      await dependencies.rateLimit.recordSuccess({
        username: parsed.username,
        now: operationTime,
      });
      if (credential.passwordAlgorithm === "BCRYPT") {
        await dependencies.repository.upgradePasswordHash(
          credential.employee.id,
          await dependencies.passwords.hash(parsed.password),
        );
      }
      const sessionToken = createToken();
      const sessionId = createId();
      const idleExpiresAt = plusSeconds(operationTime, dependencies.config.ssoIdleTtlSeconds);
      const absoluteExpiresAt = plusSeconds(operationTime, dependencies.config.ssoAbsoluteTtlSeconds);
      await dependencies.repository.createSsoSession({
        id: sessionId,
        tokenHash: hashBearerToken(sessionToken),
        organizationId: credential.organizationId,
        membershipId: credential.membershipId,
        authVersion: credential.authVersion,
        createdAt: operationTime,
        idleExpiresAt,
        absoluteExpiresAt,
        userAgent: parsed.userAgent,
      });
      await dependencies.repository.appendAudit({
        correlationId: createId(),
        actorAccountId: credential.employee.id,
        organizationId: credential.organizationId,
        operation: "identity:login",
        outcome: "SUCCEEDED",
        metadata: projectSecretSafeAuditMetadata({ clientId: parsed.clientId }),
      });
      return authenticateEmployeeOutputSchema.parse({
        sessionToken,
        expiresAt: absoluteExpiresAt.toISOString(),
        employee: credential.employee,
      });
    },

    async authorize(input: unknown) {
      const parsed = oidcAuthorizationInputSchema.parse(input);
      const operationTime = now();
      const [session, client] = await Promise.all([
        dependencies.repository.findSsoSession(
          hashBearerToken(parsed.ssoSessionToken),
          operationTime,
          plusSeconds(operationTime, dependencies.config.ssoIdleTtlSeconds),
        ),
        dependencies.repository.findOidcClient(parsed.clientId, parsed.redirectUri),
      ]);
      if (!client) throw new CompanyIdentityError("CLIENT_INVALID", "Client registration is invalid.");
      if (!session) throw new CompanyIdentityError("SESSION_INVALID", "Sign-in is required.");
      const code = createToken();
      const expiresAt = plusSeconds(operationTime, dependencies.config.authorizationCodeTtlSeconds);
      await dependencies.repository.createAuthorizationCode({
        id: createId(),
        codeHash: hashBearerToken(code),
        clientId: client.id,
        redirectUriId: client.redirectUriId,
        ssoSessionId: session.id,
        codeChallenge: parsed.codeChallenge,
        nonce: parsed.nonce,
        scope: parsed.scope.split(/\s+/),
        issuedAt: operationTime,
        expiresAt,
      });
      return oidcAuthorizationOutputSchema.parse({
        code,
        redirectUri: client.redirectUri,
        state: parsed.state,
        expiresAt: expiresAt.toISOString(),
      });
    },

    async exchangeCode(input: unknown) {
      const parsed = oidcTokenInputSchema.parse(input);
      const operationTime = now();
      const result = await dependencies.repository.consumeAuthorizationCode(
        hashBearerToken(parsed.code),
        operationTime,
        async (transaction, authorizationCode) => {
          const client = authorizationCode.client;
          if (
            client.clientId !== parsed.clientId ||
            client.redirectUri !== parsed.redirectUri ||
            !verifyPkceS256(parsed.codeVerifier, authorizationCode.codeChallenge)
          ) {
            throw new CompanyIdentityError(
              "AUTHORIZATION_CODE_INVALID",
              "Authorization code is invalid.",
            );
          }
          if (client.clientType === "CONFIDENTIAL") {
            const validSecret =
              parsed.clientSecret !== undefined &&
              client.clientSecretHash !== null &&
              (await dependencies.passwords.verify(parsed.clientSecret, client.clientSecretHash));
            if (!validSecret) {
              throw new CompanyIdentityError("CLIENT_INVALID", "Client registration is invalid.");
            }
          }
          const sso = await dependencies.repository.findSsoSessionById(
            authorizationCode.ssoSessionId,
            operationTime,
            plusSeconds(operationTime, dependencies.config.ssoIdleTtlSeconds),
          );
          if (!sso) throw new CompanyIdentityError("SESSION_INVALID", "Sign-in is required.");
          const employee = await dependencies.repository.getEmployee(sso.accountId);
          if (!employee || employee.status !== "ACTIVE") {
            throw new CompanyIdentityError("SESSION_INVALID", "Sign-in is required.");
          }
          const roles = await dependencies.repository.listApplicationRoles(
            sso.membershipId,
            client.applicationId,
            operationTime,
          );
          const accessToken = createToken();
          const appSessionId = createId();
          const expiresAt = plusSeconds(operationTime, dependencies.config.appSessionTtlSeconds);
          await dependencies.repository.createApplicationSession({
            transaction,
            id: appSessionId,
            tokenHash: hashBearerToken(accessToken),
            ssoSessionId: sso.id,
            organizationId: sso.organizationId,
            membershipId: sso.membershipId,
            applicationId: client.applicationId,
            authVersion: sso.authVersion,
            createdAt: operationTime,
            expiresAt,
          });
          const claims: CompanyIdentityClaims = {
            iss: dependencies.config.issuerUrl,
            sub: sso.accountId,
            username: employee.username,
            displayName: employee.displayName,
            aud: client.applicationKey,
            exp: Math.floor(expiresAt.getTime() / 1000),
            iat: Math.floor(operationTime.getTime() / 1000),
            nonce: authorizationCode.nonce,
            sid: appSessionId,
            organizationId: sso.organizationId,
            organizationKey: sso.organizationKey,
            status: "ACTIVE",
            roles,
            authVersion: sso.authVersion,
          };
          return {
            accessToken,
            tokenType: "Bearer" as const,
            expiresIn: dependencies.config.appSessionTtlSeconds,
            idToken: await dependencies.tokenSigner.sign(claims),
          };
        },
      );
      if (!result) {
        throw new CompanyIdentityError("AUTHORIZATION_CODE_INVALID", "Authorization code is invalid.");
      }
      return oidcTokenOutputSchema.parse(result);
    },

    async introspect(input: unknown) {
      const parsed = introspectionInputSchema.parse(input);
      const client = await dependencies.repository.findOidcClientByClientId(parsed.clientId);
      const validClient =
        client?.clientType === "CONFIDENTIAL" &&
        client.clientSecretHash !== null &&
        await dependencies.passwords.verify(parsed.clientSecret, client.clientSecretHash);
      if (!validClient) {
        throw new CompanyIdentityError("CLIENT_INVALID", "Client registration is invalid.");
      }
      const operationTime = now();
      const active = await dependencies.repository.introspectApplicationSession(
        hashBearerToken(parsed.accessToken),
        operationTime,
        plusSeconds(operationTime, dependencies.config.ssoIdleTtlSeconds),
      );
      if (!active || active.applicationKey !== client.applicationKey) {
        return introspectionOutputSchema.parse({ active: false });
      }
      return introspectionOutputSchema.parse({
        active: true,
        identity: {
          sub: active.employee.id,
          username: active.employee.username,
          displayName: active.employee.displayName,
          aud: active.applicationKey,
          sid: active.sessionId,
          organizationId: active.organizationId,
          organizationKey: active.organizationKey,
          status: "ACTIVE",
          roles: active.roles,
          authVersion: active.authVersion,
        },
        expiresAt: active.expiresAt.toISOString(),
      });
    },

    async currentEmployee(ssoSessionToken: string) {
      const operationTime = now();
      const session = await dependencies.repository.findSsoSession(
        hashBearerToken(ssoSessionToken),
        operationTime,
        plusSeconds(operationTime, dependencies.config.ssoIdleTtlSeconds),
      );
      if (!session) return null;
      const employee = await dependencies.repository.getEmployee(session.accountId);
      return employee ? employeeSchema.parse(employee) : null;
    },

    async localLogout(accessToken: string) {
      return dependencies.repository.revokeApplicationSession(hashBearerToken(accessToken), now());
    },

    async globalLogout(ssoSessionToken: string) {
      return dependencies.repository.revokeSsoSession(hashBearerToken(ssoSessionToken), now());
    },

    async listEmployees(actorAccountId: string) {
      return employeeSchema.array().parse(
        await dependencies.repository.listEmployees(actorAccountId),
      );
    },

    async createEmployee(input: unknown) {
      const parsed = createEmployeeInputSchema.parse(input);
      const correlationId = createId();
      const employee = await runAuditedManagement({
        actorAccountId: parsed.actorAccountId,
        operation: "identity:employee-create",
        correlationId,
        work: async () => dependencies.repository.createEmployee({
          ...parsed,
          passwordHash: await dependencies.passwords.hash(parsed.initialPassword),
          credentialFingerprint: dependencies.passwords.fingerprint(parsed.initialPassword),
          correlationId,
        }),
      });
      return employeeSchema.parse(employee);
    },

    async setEmployeeStatus(input: unknown) {
      const parsed = setEmployeeStatusInputSchema.parse(input);
      const correlationId = createId();
      return managementResultSchema.parse(
        await runAuditedManagement({
          actorAccountId: parsed.actorAccountId,
          targetAccountId: parsed.targetAccountId,
          operation: "identity:employee-status",
          correlationId,
          work: async () => dependencies.repository.setEmployeeStatus({
            ...parsed,
            correlationId,
          }),
        }),
      );
    },

    async setApplicationRoles(input: unknown) {
      const parsed = setApplicationRolesInputSchema.parse(input);
      const correlationId = createId();
      return employeeSchema.parse(
        await runAuditedManagement({
          actorAccountId: parsed.actorAccountId,
          targetAccountId: parsed.targetAccountId,
          operation: "identity:application-roles",
          correlationId,
          work: async () => dependencies.repository.setApplicationRoles({
            ...parsed,
            correlationId,
          }),
        }),
      );
    },

    async setCompanyRoles(input: unknown) {
      const parsed = setCompanyRolesInputSchema.parse(input);
      const correlationId = createId();
      return employeeSchema.parse(
        await runAuditedManagement({
          actorAccountId: parsed.actorAccountId,
          targetAccountId: parsed.targetAccountId,
          operation: "identity:company-roles",
          correlationId,
          work: async () => dependencies.repository.setCompanyRoles({
            ...parsed,
            correlationId,
          }),
        }),
      );
    },

    async resetCredential(input: unknown) {
      const parsed = resetCredentialInputSchema.parse(input);
      const correlationId = createId();
      return managementResultSchema.parse(
        await runAuditedManagement({
          actorAccountId: parsed.actorAccountId,
          targetAccountId: parsed.targetAccountId,
          operation: "identity:credential-reset",
          correlationId,
          work: async () => dependencies.repository.resetCredential({
            ...parsed,
            passwordHash: await dependencies.passwords.hash(parsed.newPassword),
            credentialFingerprint: dependencies.passwords.fingerprint(parsed.newPassword),
            correlationId,
          }),
        }),
      );
    },

    async revokeEmployeeSessions(input: unknown) {
      const parsed = revokeEmployeeSessionsInputSchema.parse(input);
      const correlationId = createId();
      return managementResultSchema.parse(
        await runAuditedManagement({
          actorAccountId: parsed.actorAccountId,
          targetAccountId: parsed.targetAccountId,
          operation: "identity:session-revoke",
          correlationId,
          work: async () => dependencies.repository.revokeEmployeeSessions({
            ...parsed,
            correlationId,
          }),
        }),
      );
    },
  });
}
