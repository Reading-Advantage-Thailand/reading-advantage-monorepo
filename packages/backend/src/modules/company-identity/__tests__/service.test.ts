import { createHash } from "node:crypto";

import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { CompanyIdentityRepository } from "../repository.js";
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

function repository(): CompanyIdentityRepository {
  return {
    findCredentialByUsername: vi.fn(async () => ({
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      membershipId: "20000000-0000-4000-8000-000000000002",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      authVersion: 1,
      passwordHash: "$2b$legacy",
      passwordAlgorithm: "BCRYPT" as const,
    })),
    upgradePasswordHash: vi.fn(async () => undefined),
    createSsoSession: vi.fn(async () => undefined),
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
    createAuthorizationCode: vi.fn(async () => undefined),
    consumeAuthorizationCode: vi.fn(async (_hash, _now, handler) => handler(
      {} as postgres.TransactionSql,
      {
        id: "20000000-0000-4000-8000-000000000008",
        client: {
          id: "20000000-0000-4000-8000-000000000005",
          clientId: "sales-web",
          applicationId: "20000000-0000-4000-8000-000000000006",
          applicationKey: "sales",
          clientType: "CONFIDENTIAL",
          clientSecretHash: "$argon2id$client",
          redirectUriId: "20000000-0000-4000-8000-000000000007",
          redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
        },
        ssoSessionId: "20000000-0000-4000-8000-000000000004",
        codeChallenge: createHash("sha256").update("v".repeat(43)).digest("base64url"),
        nonce: "nonce-value-with-entropy",
        expiresAt: new Date("2026-07-18T00:05:00.000Z"),
      },
    )),
    createApplicationSession: vi.fn(async () => undefined),
    introspectApplicationSession: vi.fn(async () => null),
    revokeApplicationSession: vi.fn(async () => true),
    revokeSsoSession: vi.fn(async () => 2),
    appendAudit: vi.fn(async () => undefined),
    listEmployees: vi.fn(async () => [{ ...employee, companyRoles: [...employee.companyRoles] }]),
    getEmployee: vi.fn(async () => ({ ...employee, companyRoles: [...employee.companyRoles] })),
    createEmployee: vi.fn(async () => ({ ...employee, companyRoles: [...employee.companyRoles] })),
    setEmployeeStatus: vi.fn(async () => ({ employee: { ...employee, companyRoles: [...employee.companyRoles] }, sessionsRevoked: 0 })),
    setApplicationRoles: vi.fn(async () => ({ ...employee, companyRoles: [...employee.companyRoles] })),
    setCompanyRoles: vi.fn(async () => ({ ...employee, companyRoles: [...employee.companyRoles] })),
    resetCredential: vi.fn(async () => ({ employee: { ...employee, companyRoles: [...employee.companyRoles] }, sessionsRevoked: 1 })),
    revokeEmployeeSessions: vi.fn(async () => ({ employee: { ...employee, companyRoles: [...employee.companyRoles] }, sessionsRevoked: 1 })),
  };
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
      verify: vi.fn(async (_password, hash) => hash === "$2b$legacy" || hash === "$argon2id$client"),
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
      verify: vi.fn(async () => { throw new Error("unused"); }),
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
    createId: () => `30000000-0000-4000-8000-${String(++idIndex).padStart(12, "0")}`,
    createToken: () => tokens[tokenIndex++]!,
  });
}

describe("company identity service", () => {
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
    expect(repo.upgradePasswordHash).toHaveBeenCalledWith(employee.id, "$argon2id$upgraded");
    expect(repo.createSsoSession).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: createHash("sha256").update("s".repeat(43)).digest("hex"),
    }));
    expect(JSON.stringify((repo.createSsoSession as ReturnType<typeof vi.fn>).mock.calls)).not.toContain("s".repeat(43));
  });

  it("issues and exchanges an exact PKCE-bound code with audience-only roles", async () => {
    const repo = repository();
    const sign = vi.fn(async () => "signed.identity.token.with.required.length");
    const identity = service(repo, sign);
    const authorization = await identity.authorize({
      clientId: "sales-web",
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      responseType: "code",
      scope: "openid profile",
      state: "state-value-with-entropy",
      nonce: "nonce-value-with-entropy",
      codeChallenge: createHash("sha256").update("v".repeat(43)).digest("base64url"),
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
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({
      sub: employee.id,
      username: employee.username,
      displayName: employee.displayName,
      status: "ACTIVE",
    }));
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
  ])("rejects a %s employee during code exchange without creating an application session", async (_case, resolvedEmployee) => {
    const repo = repository();
    const sign = vi.fn(async () => "signed.identity.token.with.required.length");
    vi.mocked(repo.getEmployee).mockResolvedValue(resolvedEmployee);
    const identity = service(repo, sign);
    const authorization = await identity.authorize({
      clientId: "sales-web",
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      responseType: "code",
      scope: "openid profile",
      state: "state-value-with-entropy",
      nonce: "nonce-value-with-entropy",
      codeChallenge: createHash("sha256").update("v".repeat(43)).digest("base64url"),
      codeChallengeMethod: "S256",
      ssoSessionToken: "s".repeat(43),
    });

    await expect(identity.exchangeCode({
      grantType: "authorization_code",
      code: authorization.code,
      clientId: "sales-web",
      clientSecret: "x".repeat(32),
      redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      codeVerifier: "v".repeat(43),
    })).rejects.toMatchObject({ code: "SESSION_INVALID" });
    expect(repo.createApplicationSession).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  it("returns the same non-enumerating denial for a missing employee", async () => {
    const repo = repository();
    vi.mocked(repo.findCredentialByUsername).mockResolvedValue(null);
    await expect(service(repo).authenticate({
      username: "missing",
      password: "wrong-password",
      clientId: "accounts",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    })).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED", message: "Username or password is invalid." });
  });

  it("authenticates introspection callers and hides tokens from another audience", async () => {
    const repo = repository();
    vi.mocked(repo.introspectApplicationSession).mockResolvedValue({
      sessionId: "20000000-0000-4000-8000-000000000009",
      employee: { ...employee, companyRoles: [...employee.companyRoles] },
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      applicationKey: "marketing",
      roles: ["MARKETING_ADMIN"],
      authVersion: 1,
      expiresAt: new Date("2026-07-18T00:30:00.000Z"),
    });

    await expect(service(repo).introspect({
      accessToken: "a".repeat(43),
      clientId: "sales-web",
      clientSecret: "x".repeat(32),
    })).resolves.toEqual({ active: false });
  });

  it("rejects an invalid introspection client before reading an application token", async () => {
    const repo = repository();
    vi.mocked(repo.findOidcClientByClientId).mockResolvedValue(null);

    await expect(service(repo).introspect({
      accessToken: "a".repeat(43),
      clientId: "unknown-web",
      clientSecret: "x".repeat(32),
    })).rejects.toMatchObject({ code: "CLIENT_INVALID" });
    expect(repo.introspectApplicationSession).not.toHaveBeenCalled();
  });
});
