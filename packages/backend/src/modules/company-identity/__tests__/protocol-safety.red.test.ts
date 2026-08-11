import type { CompanyIdentityRepository } from "../repository.js";
import type { CompanyIdentityService } from "../service.js";
import { createCompanyIdentityService } from "../service.js";
import { describe, expect, it, vi } from "vitest";

import * as backendPublicApi from "../../../index.js";

const employee = {
  id: "20000000-0000-4000-8000-000000000001",
  username: "owner",
  displayName: "Company Owner",
  status: "ACTIVE" as const,
  companyRoles: ["EMPLOYEE", "COMPANY_ADMIN"],
  appRoles: { sales: ["SALES_ADMIN"] },
  createdAt: "2026-07-18T00:00:00.000Z",
};

type LoginAuditRepository = CompanyIdentityRepository;

interface RepositoryHarness {
  readonly repository: LoginAuditRepository;
  readonly persistedSessions: Array<Record<string, unknown>>;
  readonly persistedAudits: Array<Record<string, unknown>>;
  readonly rawCreateSsoSession: ReturnType<typeof vi.fn>;
  readonly createSsoSessionWithAudit: ReturnType<typeof vi.fn>;
}

/** Creates an identity repository harness that models rollback at the required login seam. */
function createRepositoryHarness(options?: {
  readonly failSuccessfulLoginAudit?: boolean;
}): RepositoryHarness {
  const persistedSessions: Array<Record<string, unknown>> = [];
  const persistedAudits: Array<Record<string, unknown>> = [];
  const rawCreateSsoSession = vi.fn(async (session: unknown) => {
    persistedSessions.push(session as Record<string, unknown>);
  });
  const appendAudit = vi.fn(async (audit: unknown) => {
    const auditRecord = audit as Record<string, unknown>;
    if (
      options?.failSuccessfulLoginAudit === true &&
      auditRecord.operation === "identity:login" &&
      auditRecord.outcome === "SUCCEEDED"
    ) {
      throw new Error("audit store unavailable");
    }
    persistedAudits.push(auditRecord);
  });
  const createSsoSessionWithAudit = vi.fn(async ({
    session,
    audit,
  }: {
    readonly session: Record<string, unknown>;
    readonly audit: Record<string, unknown>;
  }) => {
    const sessionsCheckpoint = persistedSessions.length;
    const auditsCheckpoint = persistedAudits.length;
    try {
      persistedSessions.push(session);
      if (options?.failSuccessfulLoginAudit === true) {
        throw new Error("audit store unavailable");
      }
      persistedAudits.push(audit);
    } catch (error) {
      persistedSessions.splice(sessionsCheckpoint);
      persistedAudits.splice(auditsCheckpoint);
      throw error;
    }
  });
  const repository = {
    findCredentialByUsername: vi.fn(async () => ({
      employee: { ...employee },
      membershipId: "20000000-0000-4000-8000-000000000002",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      authVersion: 1,
      passwordHash: "$argon2id$test",
      passwordAlgorithm: "ARGON2ID" as const,
    })),
    createSsoSessionWithAudit,
    createAuthorizationCodeWithAudit: vi.fn(async () => undefined),
    revokeApplicationSessionWithAudit: vi.fn(async () => ({ revoked: false })),
    revokeSsoSessionWithAudit: vi.fn(async () => 0),
    appendAudit,
    findSsoSession: vi.fn(async () => null),
    findOidcClient: vi.fn(async () => null),
  } as unknown as LoginAuditRepository;

  return {
    repository,
    persistedSessions,
    persistedAudits,
    rawCreateSsoSession,
    createSsoSessionWithAudit,
  };
}

/** Creates the service using a repository harness with deterministic credentials and tokens. */
function createService(
  repository: CompanyIdentityRepository,
  options?: {
    readonly rateLimitCheck?: () => Promise<boolean>;
  },
): CompanyIdentityService {
  return createCompanyIdentityService({
    repository,
    passwords: {
      verify: vi.fn(async () => true),
      hash: vi.fn(async () => "$argon2id$test"),
      fingerprint: vi.fn(() => "f".repeat(64)),
    },
    rateLimit: {
      check: vi.fn(options?.rateLimitCheck ?? (async () => true)),
      recordFailure: vi.fn(async () => undefined),
      recordSuccess: vi.fn(async () => undefined),
    },
    tokenSigner: {
      sign: vi.fn(async () => "signed.identity.token.with.required.length"),
      verify: vi.fn(async () => {
        throw new Error("unused");
      }),
      jwk: vi.fn(() => ({
        alg: "RS256" as const,
        use: "sig" as const,
        kid: "test",
        kty: "RSA" as const,
        n: "n",
        e: "AQAB",
      })),
    },
    config: {
      issuerUrl: "https://accounts.reading-advantage.com",
      ssoIdleTtlSeconds: 3600,
      ssoAbsoluteTtlSeconds: 7200,
      authorizationCodeTtlSeconds: 300,
      appSessionTtlSeconds: 1800,
    },
    now: () => new Date("2026-07-18T00:00:00.000Z"),
    createId: () => "30000000-0000-4000-8000-000000000001",
    createToken: () => "s".repeat(43),
  });
}

/** Invokes one malformed or preflight-failing operation and checks its secret-safe failure audit. */
async function expectSafeFailedAudit(input: {
  readonly harness: RepositoryHarness;
  readonly operation: string;
  readonly secret: string;
  readonly work: (service: CompanyIdentityService) => Promise<unknown>;
}): Promise<void> {
  await expect(input.work(createService(input.harness.repository))).rejects.toBeDefined();
  expect(input.harness.persistedAudits).toContainEqual(
    expect.objectContaining({
      operation: input.operation,
      outcome: "FAILED",
    }),
  );
  expect(JSON.stringify(input.harness.persistedAudits)).not.toContain(
    input.secret,
  );
}

/** Lists every own or inherited callable property that a repository consumer can invoke. */
function callableRepositoryProperties(repository: object): string[] {
  const properties = new Set<string>();
  let current: object | null = repository;
  while (current !== null && current !== Object.prototype) {
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (
        typeof descriptor?.value === "function" ||
        descriptor?.get !== undefined ||
        descriptor?.set !== undefined
      ) {
        properties.add(String(key));
      }
    }
    current = Object.getPrototypeOf(current);
  }
  return [...properties].sort();
}

describe("company-identity protocol safety blockers", () => {
  it("requires one atomic SSO-session and success-audit seam before service construction", () => {
    const harness = createRepositoryHarness();
    const incompleteRepository = {
      ...(harness.repository as unknown as Record<string, unknown>),
      createSsoSessionWithAudit: undefined,
    } as unknown as CompanyIdentityRepository;

    expect(() => createService(incompleteRepository)).toThrow(
      "COMPANY_IDENTITY_ATOMIC_AUDIT_SEAMS_REQUIRED:createSsoSessionWithAudit",
    );
  });

  it("creates a successful login through the mandatory atomic seam rather than a raw session writer", async () => {
    const harness = createRepositoryHarness();

    await createService(harness.repository).authenticate({
      username: "owner",
      password: "correct-password",
      clientId: "accounts",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });

    expect(harness.createSsoSessionWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.any(Object),
        audit: expect.objectContaining({
          actorAccountId: employee.id,
          targetAccountId: employee.id,
          organizationId: "20000000-0000-4000-8000-000000000003",
          operation: "identity:login",
          outcome: "SUCCEEDED",
        }),
      }),
    );
    expect(harness.rawCreateSsoSession).not.toHaveBeenCalled();
    expect(harness.persistedSessions).toHaveLength(1);
    expect(harness.persistedAudits).toContainEqual(
      expect.objectContaining({
        operation: "identity:login",
        outcome: "SUCCEEDED",
      }),
    );
  });

  it("rolls back the successful-login session and audit together when the mandatory audit write fails", async () => {
    const harness = createRepositoryHarness({ failSuccessfulLoginAudit: true });

    await expect(
      createService(harness.repository).authenticate({
        username: "owner",
        password: "correct-password",
        clientId: "accounts",
        ipAddress: "127.0.0.1",
        userAgent: "test",
      }),
    ).rejects.toThrow("audit store unavailable");

    expect(harness.createSsoSessionWithAudit).toHaveBeenCalledTimes(1);
    expect(harness.rawCreateSsoSession).not.toHaveBeenCalled();
    expect(harness.persistedSessions).toEqual([]);
    expect(harness.persistedAudits).toEqual([]);
  });

  it("returns only the complete reviewed repository surface without raw mutation bypasses", () => {
    const factory = (backendPublicApi as Record<string, unknown>)[
      "createPostgresCompanyIdentityRepository"
    ] as ((sql: unknown) => Record<string, unknown>) | undefined;
    const repository = factory?.({});
    const factoryOwnKeys = repository ? Reflect.ownKeys(repository) : [];
    const factoryStringKeys = factoryOwnKeys
      .filter((key): key is string => typeof key === "string")
      .sort();
    const factorySymbolKeys = factoryOwnKeys.filter(
      (key): key is symbol => typeof key === "symbol",
    );
    const callableProperties = repository
      ? callableRepositoryProperties(repository)
      : [];
    const allowedReadMethods = [
      "findCredentialByUsername",
      "findSsoSession",
      "findSsoSessionById",
      "findOidcClient",
      "findOidcClientByClientId",
      "listApplicationRoles",
      "introspectApplicationSession",
      "listEmployees",
      "getEmployee",
    ];
    const allowedAtomicOrAuditedMutationSeams = [
      "createSsoSessionWithAudit",
      "createAuthorizationCodeWithAudit",
      "revokeApplicationSessionWithAudit",
      "revokeSsoSessionWithAudit",
      "appendAudit",
      "createEmployee",
      "setEmployeeStatus",
      "setApplicationRoles",
      "setCompanyRoles",
      "resetCredential",
      "revokeEmployeeSessions",
    ];
    const allowedMethods = new Set([
      ...allowedReadMethods,
      ...allowedAtomicOrAuditedMutationSeams,
    ]);
    const forbiddenRawMutators = [
      "upgradePasswordHash",
      "createSsoSession",
      "createApplicationSession",
      "appendAuditInTransaction",
      "consumeAuthorizationCode",
    ];

    expect(factory).toEqual(expect.any(Function));
    expect({
      hasPlainObjectPrototype:
        repository !== undefined &&
        (Object.getPrototypeOf(repository) === Object.prototype ||
          Object.getPrototypeOf(repository) === null),
      forbiddenRawMutators: callableProperties.filter((key) =>
        forbiddenRawMutators.includes(key),
      ),
      missingRequiredSeams: allowedAtomicOrAuditedMutationSeams.filter(
        (key) => !callableProperties.includes(key),
      ),
      inheritedCallableProperties: repository
        ? callableProperties.filter(
            (key) => !factoryStringKeys.includes(key),
          )
        : [],
      symbolOwnKeys: factorySymbolKeys.map(String),
      unexpectedCallableProperties: callableProperties.filter(
        (key) => !allowedMethods.has(key),
      ),
      unexpectedOwnKeys: factoryStringKeys.filter(
        (key) => !allowedMethods.has(key),
      ),
    }).toEqual({
      hasPlainObjectPrototype: true,
      forbiddenRawMutators: [],
      missingRequiredSeams: [],
      inheritedCallableProperties: [],
      symbolOwnKeys: [],
      unexpectedCallableProperties: [],
      unexpectedOwnKeys: [],
    });
  });

  it("does not publicly expose an arbitrary route-context setter that can persist forged route metadata", async () => {
    const persistedMetadata: unknown[] = [];
    const sql = Object.assign(
      vi.fn(
        async (
          strings: TemplateStringsArray,
          ...values: readonly unknown[]
        ) => {
          if (
            strings
              .join("")
              .includes("insert into company_identity_audit_events")
          ) {
            persistedMetadata.push(values.at(-1));
          }
          return [];
        },
      ),
      { json: vi.fn((value: unknown) => value) },
    );
    const factory = (backendPublicApi as Record<string, unknown>)[
      "createPostgresCompanyIdentityRepository"
    ] as
      | ((sql: unknown) => {
          readonly appendAudit: (input: {
            readonly correlationId: string;
            readonly operation: string;
            readonly outcome: "FAILED";
            readonly metadata: Readonly<Record<string, string>>;
          }) => Promise<void>;
        })
      | undefined;
    const runWithArbitraryContext = (
      backendPublicApi as Record<string, unknown>
    )["runWithCapabilityRequestContext"] as
      | ((
          context: Record<string, unknown>,
          operation: () => Promise<void>,
        ) => Promise<void>)
      | undefined;
    const repository = factory?.(sql);

    if (typeof runWithArbitraryContext === "function" && repository) {
      await runWithArbitraryContext(
        {
          bindingId: "attacker-forged-route-binding",
          capabilityId: "attacker-forged-capability",
          capabilityKind: "command",
          exposure: "authenticated",
          transport: "next-http",
          method: "POST",
          path: "/api/attacker-forged",
        },
        () =>
          repository.appendAudit({
            correlationId: "30000000-0000-4000-8000-000000000001",
            operation: "identity:login",
            outcome: "FAILED",
            metadata: { source: "red-test" },
          }),
      );
    } else if (repository) {
      await repository.appendAudit({
        correlationId: "30000000-0000-4000-8000-000000000001",
        operation: "identity:login",
        outcome: "FAILED",
        metadata: { source: "red-test" },
      });
    }

    expect(persistedMetadata).toEqual([
      expect.not.objectContaining({
        routeBindingId: "attacker-forged-route-binding",
        routeMethod: "POST",
        routePath: "/api/attacker-forged",
      }),
    ]);
    expect(runWithArbitraryContext).toBeUndefined();
  });

  it.each([
    [
      "returns false",
      "RATE_LIMITED",
      async (): Promise<boolean> => false,
      "RATE_LIMITED",
    ],
    [
      "throws",
      "INTERNAL_ERROR",
      async (): Promise<boolean> => {
        throw new Error("rate-limit dependency unavailable");
      },
      undefined,
    ],
  ] as const)(
    "records a secret-safe FAILED login audit when rateLimit.check %s",
    async (_behavior, reasonCode, rateLimitCheck, expectedErrorCode) => {
      const harness = createRepositoryHarness();
      const password = "rate-limit-password-must-not-persist";

      const authentication = createService(harness.repository, {
        rateLimitCheck,
      }).authenticate({
        username: "owner",
        password,
        clientId: "accounts",
        ipAddress: "127.0.0.1",
        userAgent: "test",
      });
      if (expectedErrorCode === undefined) {
        await expect(authentication).rejects.toThrow(
          "rate-limit dependency unavailable",
        );
      } else {
        await expect(authentication).rejects.toMatchObject({
          code: expectedErrorCode,
        });
      }

      expect(harness.persistedAudits).toContainEqual(
        expect.objectContaining({
          operation: "identity:login",
          outcome: "FAILED",
          reasonCode,
        }),
      );
      expect(JSON.stringify(harness.persistedAudits)).not.toContain(password);
      expect(harness.rawCreateSsoSession).not.toHaveBeenCalled();
      expect(harness.createSsoSessionWithAudit).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "authenticate",
      "identity:login",
      "malformed-login-password",
      (identity: CompanyIdentityService, secret: string) =>
        identity.authenticate({
          username: "owner",
          password: secret,
          clientId: "accounts",
          ipAddress: "127.0.0.1",
          userAgent: "test",
          unreviewedField: true,
        }),
    ],
    [
      "authorize",
      "identity:oidc-authorize",
      "a".repeat(43),
      (identity: CompanyIdentityService, secret: string) =>
        identity.authorize({
          clientId: "sales-web",
          redirectUri: "https://sales.reading-advantage.com/callback",
          responseType: "code",
          scope: "openid profile",
          state: "state-value-with-entropy",
          nonce: "nonce-value-with-entropy",
          codeChallenge: "c".repeat(43),
          codeChallengeMethod: "S256",
          ssoSessionToken: secret,
          unreviewedField: true,
        }),
    ],
    [
      "exchange code",
      "identity:oidc-token-exchange",
      "malformed-client-secret-which-is-long-enough",
      (identity: CompanyIdentityService, secret: string) =>
        identity.exchangeCode({
          grantType: "authorization_code",
          code: "c".repeat(43),
          clientId: "sales-web",
          clientSecret: secret,
          redirectUri: "https://sales.reading-advantage.com/callback",
          codeVerifier: "v".repeat(43),
          unreviewedField: true,
        }),
    ],
  ] as const)(
    "attempts a secret-safe FAILED audit for malformed %s input",
    async (_name, operation, secret, work) => {
      await expectSafeFailedAudit({
        harness: createRepositoryHarness(),
        operation,
        secret,
        work: (identity) => work(identity, secret),
      });
    },
  );

  it.each([
    [
      "authenticate",
      "identity:login",
      "preflight-login-password",
      (harness: RepositoryHarness): void => {
        vi.mocked(harness.repository.findCredentialByUsername).mockRejectedValue(
          new Error("credential preflight unavailable"),
        );
      },
      (identity: CompanyIdentityService, secret: string) =>
        identity.authenticate({
          username: "owner",
          password: secret,
          clientId: "accounts",
          ipAddress: "127.0.0.1",
          userAgent: "test",
        }),
    ],
    [
      "authorize",
      "identity:oidc-authorize",
      "s".repeat(43),
      (harness: RepositoryHarness): void => {
        vi.mocked(harness.repository.findSsoSession).mockRejectedValue(
          new Error("session preflight unavailable"),
        );
      },
      (identity: CompanyIdentityService, secret: string) =>
        identity.authorize({
          clientId: "sales-web",
          redirectUri: "https://sales.reading-advantage.com/callback",
          responseType: "code",
          scope: "openid profile",
          state: "state-value-with-entropy",
          nonce: "nonce-value-with-entropy",
          codeChallenge: "c".repeat(43),
          codeChallengeMethod: "S256",
          ssoSessionToken: secret,
        }),
    ],
    [
      "exchange code",
      "identity:oidc-token-exchange",
      "preflight-client-secret-which-is-long-enough",
      (_harness: RepositoryHarness): void => undefined,
      (identity: CompanyIdentityService, secret: string) =>
        identity.exchangeCode({
          grantType: "authorization_code",
          code: "c".repeat(43),
          clientId: "sales-web",
          clientSecret: secret,
          redirectUri: "https://sales.reading-advantage.com/callback",
          codeVerifier: "v".repeat(43),
        }),
    ],
  ] as const)(
    "attempts a secret-safe FAILED audit when %s preflight fails",
    async (_name, operation, secret, failPreflight, work) => {
      const harness = createRepositoryHarness();
      failPreflight(harness);
      await expectSafeFailedAudit({
        harness,
        operation,
        secret,
        work: (identity) => work(identity, secret),
      });
    },
  );
});
