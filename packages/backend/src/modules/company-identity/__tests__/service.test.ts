import { createHash } from "node:crypto";

import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import {
  registerCompanyIdentityAuthorizationCodeExecutor,
  type CompanyIdentityRepository,
} from "../repository.js";
import { createCompanyIdentityService } from "../service.js";

const employee = {
  id: "20000000-0000-4000-8000-000000000001",
  username: "owner",
  displayName: "Company Owner",
  status: "ACTIVE" as const,
  companyRoles: ["EMPLOYEE", "COMPANY_ADMIN"] as const,
  appRoles: { sales: ["SALES_ADMIN"] },
  createdAt: "2026-07-18T00:00:00.000Z",
};

const salesApplicationId = "20000000-0000-4000-8000-000000000006";
const sensitiveProtocolValues = [
  "s".repeat(43),
  "c".repeat(43),
  "a".repeat(43),
  "v".repeat(43),
  "x".repeat(32),
];

const applicationSessionWrites = new WeakMap<
  CompanyIdentityRepository,
  unknown[]
>();

function expectSecretSafeProtocolAudit(
  repo: CompanyIdentityRepository,
  expected: {
    readonly operation: string;
    readonly outcome: "SUCCEEDED" | "DENIED" | "FAILED";
    readonly applicationId?: string;
    readonly sessionCount?: number;
  },
): void {
  expect(repo.appendAudit).toHaveBeenCalledWith(
    expect.objectContaining({
      actorAccountId: employee.id,
      targetAccountId: employee.id,
      operation: expected.operation,
      outcome: expected.outcome,
      ...(expected.applicationId === undefined
        ? {}
        : { applicationId: expected.applicationId }),
      metadata: expect.objectContaining({
        ...(expected.sessionCount === undefined
          ? { clientId: "sales-web" }
          : { sessionCount: expected.sessionCount }),
      }),
    }),
  );

  const serialized = JSON.stringify(vi.mocked(repo.appendAudit).mock.calls);
  for (const secret of sensitiveProtocolValues) {
    expect(serialized).not.toContain(secret);
  }
}

function repository(): CompanyIdentityRepository {
  const appendAudit: CompanyIdentityRepository["appendAudit"] = vi.fn(
    async () => undefined,
  );
  const repository = {
    findCredentialByUsername: vi.fn(async () => ({
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      membershipId: "20000000-0000-4000-8000-000000000002",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      authVersion: 1,
      passwordHash: "$2b$legacy",
      passwordAlgorithm: "BCRYPT" as const,
    })),
    createSsoSessionWithAudit: vi.fn(async ({ audit }) => {
      await appendAudit(audit);
    }),
    findSsoSession: vi.fn(async () => ({
      id: "20000000-0000-4000-8000-000000000004",
      accountId: employee.id,
      membershipId: "20000000-0000-4000-8000-000000000002",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      authVersion: 1,
      expiresAt: new Date("2026-07-19T00:00:00.000Z"),
    })),
    findSsoSessionById: vi.fn(async () => ({
      id: "20000000-0000-4000-8000-000000000004",
      accountId: employee.id,
      membershipId: "20000000-0000-4000-8000-000000000002",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      authVersion: 1,
      expiresAt: new Date("2026-07-19T00:00:00.000Z"),
    })),
    findOidcClient: vi.fn(async () => ({
      id: "20000000-0000-4000-8000-000000000005",
      clientId: "sales-web",
      applicationId: "20000000-0000-4000-8000-000000000006",
      applicationKey: "sales",
      clientType: "CONFIDENTIAL" as const,
      clientSecretHash: "$argon2id$client",
      redirectUriId: "20000000-0000-4000-8000-000000000007",
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
    })),
    findOidcClientByClientId: vi.fn(async () => ({
      id: "20000000-0000-4000-8000-000000000005",
      applicationKey: "sales",
      clientType: "CONFIDENTIAL" as const,
      clientSecretHash: "$argon2id$client",
    })),
    listApplicationRoles: vi.fn(async () => ["SALES_ADMIN"]),
    createAuthorizationCodeWithAudit: vi.fn(async ({ audit }) => {
      await appendAudit(audit);
    }),
    introspectApplicationSession: vi.fn(async () => null),
    revokeApplicationSessionWithAudit: vi.fn(async ({ audit }) => {
      await appendAudit({
        ...audit,
        actorAccountId: audit.actorAccountId ?? employee.id,
        targetAccountId: audit.targetAccountId ?? employee.id,
        applicationId: audit.applicationId ?? salesApplicationId,
        metadata: { ...audit.metadata, sessionCount: 1 },
      });
      return {
        revoked: true as const,
        accountId: employee.id,
        applicationId: salesApplicationId,
      };
    }),
    revokeSsoSessionWithAudit: vi.fn(async ({ audit }) => {
      await appendAudit({
        ...audit,
        actorAccountId: audit.actorAccountId ?? employee.id,
        targetAccountId: audit.targetAccountId ?? employee.id,
        metadata: { ...audit.metadata, sessionCount: 2 },
      });
      return 2;
    }),
    appendAudit,
    listEmployees: vi.fn(async () => [
      { ...employee, companyRoles: [...employee.companyRoles] },
    ]),
    getEmployee: vi.fn(async () => ({
      ...employee,
      companyRoles: [...employee.companyRoles],
    })),
    createEmployee: vi.fn(async () => ({
      ...employee,
      companyRoles: [...employee.companyRoles],
    })),
    setEmployeeStatus: vi.fn(async () => ({
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      sessionsRevoked: 0,
    })),
    setApplicationRoles: vi.fn(async () => ({
      ...employee,
      companyRoles: [...employee.companyRoles],
    })),
    setCompanyRoles: vi.fn(async () => ({
      ...employee,
      companyRoles: [...employee.companyRoles],
    })),
    resetCredential: vi.fn(async () => ({
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      sessionsRevoked: 1,
    })),
    revokeEmployeeSessions: vi.fn(async () => ({
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      sessionsRevoked: 1,
    })),
  } satisfies CompanyIdentityRepository;
  const writes: unknown[] = [];
  applicationSessionWrites.set(repository, writes);
  registerCompanyIdentityAuthorizationCodeExecutor(
    repository,
    async (_codeHash, _now, handler) => {
      const checkpoint = writes.length;
      try {
        return await handler({
          transaction: {} as postgres.TransactionSql,
          code: {
            id: "20000000-0000-4000-8000-000000000008",
            client: {
              id: "20000000-0000-4000-8000-000000000005",
              clientId: "sales-web",
              applicationId: "20000000-0000-4000-8000-000000000006",
              applicationKey: "sales",
              clientType: "CONFIDENTIAL",
              clientSecretHash: "$argon2id$client",
              redirectUriId: "20000000-0000-4000-8000-000000000007",
              redirectUri:
                "https://sales.reading-advantage.com/api/auth/callback",
            },
            ssoSessionId: "20000000-0000-4000-8000-000000000004",
            codeChallenge: createHash("sha256")
              .update("v".repeat(43))
              .digest("base64url"),
            nonce: "nonce-value-with-entropy",
            expiresAt: new Date("2026-07-18T00:05:00.000Z"),
          },
          insertApplicationSession: async (input) => {
            writes.push(input);
          },
          appendAudit: async (input) => {
            await appendAudit(input);
          },
        });
      } catch (error) {
        writes.splice(checkpoint);
        throw error;
      }
    },
  );
  return repository;
}

function service(
  repo: CompanyIdentityRepository,
  sign = vi.fn(async () => "signed.identity.token.with.required.length"),
) {
  let tokenIndex = 0;
  let idIndex = 0;
  const tokens = ["s".repeat(43), "c".repeat(43), "a".repeat(43)];
  return createCompanyIdentityService({
    repository: repo,
    passwords: {
      verify: vi.fn(
        async (_password, hash) =>
          hash === "$2b$legacy" || hash === "$argon2id$client",
      ),
      hash: vi.fn(async () => "$argon2id$upgraded"),
      fingerprint: vi.fn(() => "f".repeat(64)),
    },
    rateLimit: {
      check: vi.fn(async () => true),
      recordFailure: vi.fn(async () => undefined),
      recordSuccess: vi.fn(async () => undefined),
    },
    tokenSigner: {
      sign,
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
    createId: () =>
      `30000000-0000-4000-8000-${String(++idIndex).padStart(12, "0")}`,
    createToken: () => tokens[tokenIndex++]!,
  });
}

describe("company identity service", () => {
  it("requires every atomic protocol repository seam at construction", () => {
    const incompleteRepository = {
      ...repository(),
      createSsoSessionWithAudit: undefined,
    } as unknown as CompanyIdentityRepository;

    expect(() => service(incompleteRepository)).toThrow(
      "COMPANY_IDENTITY_ATOMIC_AUDIT_SEAMS_REQUIRED:createSsoSessionWithAudit",
    );
  });

  it("migrates a legacy credential and persists only the SSO token digest", async () => {
    const repo = repository();
    const result = await service(repo).authenticate({
      username: "owner",
      password: "correct-password",
      clientId: "accounts",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });

    expect(result.sessionToken).toBe("s".repeat(43));
    expect(repo.createSsoSessionWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          tokenHash: createHash("sha256")
            .update("s".repeat(43))
            .digest("hex"),
        }),
        credentialUpgrade: {
          accountId: employee.id,
          passwordHash: "$argon2id$upgraded",
        },
      }),
    );
    expect(
      JSON.stringify(vi.mocked(repo.createSsoSessionWithAudit).mock.calls),
    ).not.toContain("s".repeat(43));
  });

  it("issues and exchanges an exact PKCE-bound code with audience-only roles and immutable secret-safe audit evidence", async () => {
    const repo = repository();
    const sign = vi.fn(
      async () => "signed.identity.token.with.required.length",
    );
    const identity = service(repo, sign);
    const authorization = await identity.authorize({
      clientId: "sales-web",
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      responseType: "code",
      scope: "openid profile",
      state: "state-value-with-entropy",
      nonce: "nonce-value-with-entropy",
      codeChallenge: createHash("sha256")
        .update("v".repeat(43))
        .digest("base64url"),
      codeChallengeMethod: "S256",
      ssoSessionToken: "s".repeat(43),
    });
    const result = await identity.exchangeCode({
      grantType: "authorization_code",
      code: authorization.code,
      clientId: "sales-web",
      clientSecret: "x".repeat(32),
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      codeVerifier: "v".repeat(43),
    });

    expect(result).toMatchObject({
      tokenType: "Bearer",
      idToken: "signed.identity.token.with.required.length",
    });
    expect(repo.listApplicationRoles).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000006",
      expect.any(Date),
    );
    expect(repo.getEmployee).toHaveBeenCalledWith(employee.id);
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: employee.id,
        username: employee.username,
        displayName: employee.displayName,
        status: "ACTIVE",
      }),
    );
    expectSecretSafeProtocolAudit(repo, {
      operation: "identity:oidc-authorize",
      outcome: "SUCCEEDED",
      applicationId: salesApplicationId,
    });
    expectSecretSafeProtocolAudit(repo, {
      operation: "identity:oidc-token-exchange",
      outcome: "SUCCEEDED",
      applicationId: salesApplicationId,
    });
  });

  it.each([
    ["missing", null],
    [
      "suspended",
      {
        ...employee,
        status: "SUSPENDED" as const,
        companyRoles: [...employee.companyRoles],
      },
    ],
  ])(
    "rejects a %s employee during code exchange without creating an application session",
    async (_case, resolvedEmployee) => {
      const repo = repository();
      const sign = vi.fn(
        async () => "signed.identity.token.with.required.length",
      );
      vi.mocked(repo.getEmployee).mockResolvedValue(resolvedEmployee);
      const identity = service(repo, sign);
      const authorization = await identity.authorize({
        clientId: "sales-web",
        redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
        responseType: "code",
        scope: "openid profile",
        state: "state-value-with-entropy",
        nonce: "nonce-value-with-entropy",
        codeChallenge: createHash("sha256")
          .update("v".repeat(43))
          .digest("base64url"),
        codeChallengeMethod: "S256",
        ssoSessionToken: "s".repeat(43),
      });

      await expect(
        identity.exchangeCode({
          grantType: "authorization_code",
          code: authorization.code,
          clientId: "sales-web",
          clientSecret: "x".repeat(32),
          redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
          codeVerifier: "v".repeat(43),
        }),
      ).rejects.toMatchObject({ code: "SESSION_INVALID" });
      expect(applicationSessionWrites.get(repo)).toEqual([]);
      expect(sign).not.toHaveBeenCalled();
      expectSecretSafeProtocolAudit(repo, {
        operation: "identity:oidc-token-exchange",
        outcome: "DENIED",
        applicationId: salesApplicationId,
      });
    },
  );

  it("audits one local application-session revocation with actor, target, client scope, and one-session effect", async () => {
    const repo = repository();
    const applicationTokenHash = createHash("sha256")
      .update("a".repeat(43))
      .digest("hex");

    await expect(service(repo).localLogout("a".repeat(43))).resolves.toBe(true);

    expect([
      vi
        .mocked(repo.findSsoSession)
        .mock.calls.some(([tokenHash]) => tokenHash === applicationTokenHash),
      vi
        .mocked(repo.findOidcClient)
        .mock.calls.some(([clientId]) => clientId === applicationTokenHash),
    ]).toEqual([false, false]);
    expectSecretSafeProtocolAudit(repo, {
      operation: "identity:oidc-local-logout",
      outcome: "SUCCEEDED",
      applicationId: salesApplicationId,
      sessionCount: 1,
    });
  });

  it("audits global SSO logout with actor, self target, and every derived-session revocation", async () => {
    const repo = repository();

    await expect(service(repo).globalLogout("s".repeat(43))).resolves.toBe(2);

    expectSecretSafeProtocolAudit(repo, {
      operation: "identity:global-logout",
      outcome: "SUCCEEDED",
      sessionCount: 2,
    });
  });

  it("returns the same non-enumerating denial for a missing employee", async () => {
    const repo = repository();
    vi.mocked(repo.findCredentialByUsername).mockResolvedValue(null);
    await expect(
      service(repo).authenticate({
        username: "missing",
        password: "wrong-password",
        clientId: "accounts",
        ipAddress: "127.0.0.1",
        userAgent: "test",
      }),
    ).rejects.toMatchObject({
      code: "AUTHENTICATION_FAILED",
      message: "Username or password is invalid.",
    });
  });

  it("authenticates introspection callers and hides tokens from another audience", async () => {
    const repo = repository();
    vi.mocked(repo.introspectApplicationSession).mockResolvedValue({
      sessionId: "20000000-0000-4000-8000-000000000009",
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      applicationId: salesApplicationId,
      applicationKey: "marketing",
      roles: ["MARKETING_ADMIN"],
      authVersion: 1,
      expiresAt: new Date("2026-07-18T00:30:00.000Z"),
    });

    await expect(
      service(repo).introspect({
        accessToken: "a".repeat(43),
        clientId: "sales-web",
        clientSecret: "x".repeat(32),
      }),
    ).resolves.toEqual({ active: false });
  });

  it("rejects an invalid introspection client before reading an application token", async () => {
    const repo = repository();
    vi.mocked(repo.findOidcClientByClientId).mockResolvedValue(null);

    await expect(
      service(repo).introspect({
        accessToken: "a".repeat(43),
        clientId: "unknown-web",
        clientSecret: "x".repeat(32),
      }),
    ).rejects.toMatchObject({ code: "CLIENT_INVALID" });
    expect(repo.introspectApplicationSession).not.toHaveBeenCalled();
  });

  it("does not issue an authorization code when its required success audit cannot be durably recorded", async () => {
    const repo = repository();
    vi.mocked(repo.appendAudit).mockImplementation(async () => {
      throw new Error("audit store unavailable");
    });

    await expect(
      service(repo).authorize({
        clientId: "sales-web",
        redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
        responseType: "code",
        scope: "openid profile",
        state: "state-value-with-entropy",
        nonce: "nonce-value-with-entropy",
        codeChallenge: createHash("sha256")
          .update("v".repeat(43))
          .digest("base64url"),
        codeChallengeMethod: "S256",
        ssoSessionToken: "s".repeat(43),
      }),
    ).rejects.toThrow("audit store unavailable");

    expect(vi.mocked(repo.appendAudit).mock.calls).not.toContainEqual([
      expect.objectContaining({
        operation: "identity:oidc-authorize",
        outcome: "FAILED",
      }),
    ]);
  });

  it("rolls back an application session through the repository transaction seam when its required exchange audit fails", async () => {
    const repo = repository();
    const persistedSessions = applicationSessionWrites.get(repo)!;
    vi.mocked(repo.appendAudit).mockImplementation(async (input) => {
      if (
        input.operation === "identity:oidc-token-exchange" &&
        input.outcome === "SUCCEEDED"
      ) {
        throw new Error("audit store unavailable");
      }
    });
    const identity = service(repo);
    const authorization = await identity.authorize({
      clientId: "sales-web",
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      responseType: "code",
      scope: "openid profile",
      state: "state-value-with-entropy",
      nonce: "nonce-value-with-entropy",
      codeChallenge: createHash("sha256")
        .update("v".repeat(43))
        .digest("base64url"),
      codeChallengeMethod: "S256",
      ssoSessionToken: "s".repeat(43),
    });

    await expect(
      identity.exchangeCode({
        grantType: "authorization_code",
        code: authorization.code,
        clientId: "sales-web",
        clientSecret: "x".repeat(32),
        redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
        codeVerifier: "v".repeat(43),
      }),
    ).rejects.toThrow("audit store unavailable");

    expect(persistedSessions).toEqual([]);
    expect(vi.mocked(repo.appendAudit).mock.calls).not.toContainEqual([
      expect.objectContaining({
        operation: "identity:oidc-token-exchange",
        outcome: "FAILED",
      }),
    ]);
  });

  it("does not revoke a local application session when required success audit persistence fails", async () => {
    const repo = repository();
    let revoked = false;
    vi.mocked(repo.revokeApplicationSessionWithAudit).mockImplementation(
      async ({ audit }) => {
        await repo.appendAudit(audit);
        revoked = true;
        return {
          revoked: true,
          accountId: employee.id,
          applicationId: salesApplicationId,
        };
      },
    );
    vi.mocked(repo.appendAudit).mockImplementation(async () => {
      throw new Error("audit store unavailable");
    });

    await expect(service(repo).localLogout("a".repeat(43))).rejects.toThrow(
      "audit store unavailable",
    );

    expect(revoked).toBe(false);
    expect(vi.mocked(repo.appendAudit).mock.calls).not.toContainEqual([
      expect.objectContaining({
        operation: "identity:oidc-local-logout",
        outcome: "FAILED",
      }),
    ]);
  });

  it("does not revoke a central session when required success audit persistence fails", async () => {
    const repo = repository();
    let sessionsRevoked = 0;
    vi.mocked(repo.revokeSsoSessionWithAudit).mockImplementation(
      async ({ audit }) => {
        await repo.appendAudit(audit);
        sessionsRevoked = 2;
        return sessionsRevoked;
      },
    );
    vi.mocked(repo.appendAudit).mockImplementation(async () => {
      throw new Error("audit store unavailable");
    });

    await expect(service(repo).globalLogout("s".repeat(43))).rejects.toThrow(
      "audit store unavailable",
    );

    expect(sessionsRevoked).toBe(0);
    expect(vi.mocked(repo.appendAudit).mock.calls).not.toContainEqual([
      expect.objectContaining({
        operation: "identity:global-logout",
        outcome: "FAILED",
      }),
    ]);
  });

  it("fails closed when a claimed application-session revocation omits account or application audit dimensions", async () => {
    const repo = repository();
    vi.mocked(repo.revokeApplicationSessionWithAudit).mockResolvedValue({
      revoked: true,
    } as never);

    await expect(
      service(repo).localLogout("a".repeat(43)),
    ).rejects.toMatchObject({
      code: "APPLICATION_SESSION_CONTEXT_INVALID",
    });
    expect(repo.appendAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "identity:oidc-local-logout",
        outcome: "SUCCEEDED",
      }),
    );
  });

  it("fails closed rather than returning an active introspection response without an application identity", async () => {
    const repo = repository();
    vi.mocked(repo.introspectApplicationSession).mockResolvedValue({
      sessionId: "20000000-0000-4000-8000-000000000009",
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      // Deliberately malformed repository output exercises the fail-closed boundary.
      applicationId: undefined as never,
      applicationKey: "sales",
      roles: ["SALES_ADMIN"],
      authVersion: 1,
      expiresAt: new Date("2026-07-18T00:30:00.000Z"),
    });

    await expect(
      service(repo).introspect({
        accessToken: "a".repeat(43),
        clientId: "sales-web",
        clientSecret: "x".repeat(32),
      }),
    ).resolves.toEqual({ active: false });
  });

  it.each([
    [
      "local logout",
      "identity:oidc-local-logout",
      "localLogout",
      "a".repeat(43),
      "introspectApplicationSession",
    ],
    [
      "global logout",
      "identity:global-logout",
      "globalLogout",
      "s".repeat(43),
      "findSsoSession",
    ],
  ] as const)(
    "records FAILED audit evidence when the %s preflight read fails",
    async (_label, operation, method, token, preflight) => {
      const repo = repository();
      const failure = new Error("repository read unavailable");
      vi.mocked(repo[preflight]).mockRejectedValue(failure);

      await expect(service(repo)[method](token)).rejects.toThrow(
        "repository read unavailable",
      );

      expect(repo.appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          operation,
          outcome: "FAILED",
          reasonCode: "INTERNAL_ERROR",
        }),
      );
    },
  );

  it("preserves requested and registered client attribution for exchange denials without recording secrets", async () => {
    const repo = repository();
    const requestedClientId = "marketing-web";
    const secret = "x".repeat(32);

    await expect(
      service(repo).exchangeCode({
        grantType: "authorization_code",
        code: "c".repeat(43),
        clientId: requestedClientId,
        clientSecret: secret,
        redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
        codeVerifier: "v".repeat(43),
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_CODE_INVALID" });

    expect(repo.appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "identity:oidc-token-exchange",
        outcome: "DENIED",
        metadata: expect.objectContaining({
          requestedClientId,
          registeredClientId: "sales-web",
        }),
      }),
    );
    expect(
      JSON.stringify(vi.mocked(repo.appendAudit).mock.calls),
    ).not.toContain(secret);
  });
});
