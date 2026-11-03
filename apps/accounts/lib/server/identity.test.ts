import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sql = Object.assign(vi.fn(), { end: vi.fn() });
  const repository = { appendAudit: vi.fn() };
  const service = { currentEmployee: vi.fn() };
  const signer = { jwk: vi.fn(() => ({ kty: "RSA", kid: "key-1" })) };
  const telemetry = {
    logger: { warn: vi.fn() },
    span: vi.fn(),
    createCorrelationId: vi.fn(),
    instrument: vi.fn((executor: unknown) => ({ instrumented: executor })),
  };
  return {
    sql,
    repository,
    service,
    signer,
    telemetry,
    createCompanyIdentityRuntimeClient: vi.fn(),
    createCapabilityExecutor: vi.fn((config: unknown) => ({ core: config })),
    createCompanyIdentityService: vi.fn(() => service),
    createPostgresCompanyLoginRateLimit: vi.fn(() => "rate-limit"),
    createRs256IdentityTokenSigner: vi.fn(() => signer),
    createCompanyIdentityIssuerConfig: vi.fn(),
    createCompanyIdentityCookieConfig: vi.fn(),
    createPrivateKey: vi.fn(() => "private-key-object"),
    fingerprintSecret: vi.fn(() => "fingerprint"),
  };
});

vi.mock("node:crypto", () => ({ createPrivateKey: mocks.createPrivateKey }));

vi.mock("@reading-advantage/backend", () => ({
  assertCompanyIdentityAtomicRepository: vi.fn(),
  createCapabilityExecutor: mocks.createCapabilityExecutor,
  createCompanyIdentityCapabilityReferences: vi.fn(() => "references"),
  createCompanyIdentityCapabilityRegistry: vi.fn(() => "registry"),
  createCompanyIdentityDurableIdempotencyPort: vi.fn(() => "idempotency"),
  createCompanyIdentityService: mocks.createCompanyIdentityService,
  createPostgresCompanyIdentityRepository: vi.fn(() => mocks.repository),
  createPostgresCompanyLoginRateLimit: mocks.createPostgresCompanyLoginRateLimit,
  createRs256IdentityTokenSigner: mocks.createRs256IdentityTokenSigner,
  fingerprintSecret: mocks.fingerprintSecret,
  projectSecretSafeAuditMetadata: vi.fn((metadata: unknown) => ({ projected: metadata })),
}));

vi.mock("@reading-advantage/auth/company-identity", () => ({
  createCompanyIdentityCookieConfig: mocks.createCompanyIdentityCookieConfig,
  createCompanyIdentityIssuerConfig: mocks.createCompanyIdentityIssuerConfig,
  createCompanyIdentitySecurityConfig: vi.fn(() => ({
    identifierHashKey: Buffer.from("hash-key").toString("base64url"),
  })),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@reading-advantage/db/company-identity/runtime", () => ({
  createCompanyIdentityRuntimeClient: mocks.createCompanyIdentityRuntimeClient,
}));

vi.mock("./telemetry", () => ({
  createAccountsCapabilityTelemetry: vi.fn(() => mocks.telemetry),
}));

const ISSUER = {
  issuerUrl: "https://accounts.example.test",
  signingKeyId: "key-1",
  signingPrivateKey: "pem",
  clockSkewSeconds: 30,
};
const COOKIE = { name: "__Host-ra_company_sso", secure: true, sameSite: "lax", path: "/" };

type ExecutorConfig = {
  authentication: { authenticate: (input: { evidence: unknown }) => Promise<unknown> };
  authorization: { authorize: (input: { policyId: string; principal?: unknown }) => Promise<unknown> };
  audit: { append: (event: unknown) => Promise<{ eventId: string; persistedAt: string }> };
  tenancy: { resolve: () => Promise<unknown> };
  transactions: { run: () => Promise<unknown> };
  adapters: { get: () => unknown };
};

async function loadComposition() {
  const { getIdentityComposition } = await import("./identity");
  return { getIdentityComposition, composition: await getIdentityComposition() };
}

function executorConfig(): ExecutorConfig {
  return mocks.createCapabilityExecutor.mock.calls.at(-1)![0] as ExecutorConfig;
}

function auditEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "event-1",
    correlationId: "corr-1",
    capabilityId: "company-identity.employees.create",
    actor: { type: "user", id: "admin-1" },
    outcome: "success",
    metadata: {
      values: {
        targetAccountId: "employee-1",
        applicationKey: "sales-lms",
        resourceType: "employee",
      },
    },
    ...overrides,
  };
}

describe("Accounts identity composition", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("COMPANY_AUTH_DATABASE_URL", "postgres://runtime@db.invalid/company_identity");
    vi.stubEnv("COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY", "line-1\\nline-2");
    mocks.createCompanyIdentityIssuerConfig.mockReturnValue(ISSUER);
    mocks.createCompanyIdentityCookieConfig.mockReturnValue(COOKIE);
    mocks.createCompanyIdentityRuntimeClient.mockResolvedValue(mocks.sql);
    mocks.repository.appendAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the validated issuer, cookie, public key and instrumented executor", async () => {
    const { composition } = await loadComposition();

    expect(composition.issuerUrl).toBe(ISSUER.issuerUrl);
    expect(composition.cookie).toBe(COOKIE);
    expect(composition.jwk).toEqual({ kty: "RSA", kid: "key-1" });
    expect(composition.service).toBe(mocks.service);
    expect(composition.logger).toBe(mocks.telemetry.logger);
    expect(composition.executor).toEqual({ instrumented: { core: executorConfig() } });
    expect(mocks.createCompanyIdentityRuntimeClient).toHaveBeenCalledWith({
      databaseUrl: "postgres://runtime@db.invalid/company_identity",
    });
  });

  it("unescapes newline sequences in the signing key before validation", async () => {
    await loadComposition();

    expect(mocks.createCompanyIdentityIssuerConfig).toHaveBeenCalledWith(
      expect.objectContaining({ COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY: "line-1\nline-2" }),
    );
    expect(mocks.createPrivateKey).toHaveBeenCalledWith("pem");
    expect(mocks.createRs256IdentityTokenSigner).toHaveBeenCalledWith({
      keyId: "key-1",
      privateKey: "private-key-object",
      issuerUrl: ISSUER.issuerUrl,
      clockSkewSeconds: 30,
    });
  });

  it("builds the composition once per process", async () => {
    const { getIdentityComposition, composition } = await loadComposition();

    await expect(getIdentityComposition()).resolves.toBe(composition);
    expect(mocks.createCompanyIdentityRuntimeClient).toHaveBeenCalledOnce();
  });

  it("refuses to start without a database URL", async () => {
    vi.stubEnv("COMPANY_AUTH_DATABASE_URL", "");
    const { getIdentityComposition } = await import("./identity");

    await expect(getIdentityComposition()).rejects.toThrow(
      "COMPANY_AUTH_DATABASE_URL_REQUIRED",
    );
    expect(mocks.createCompanyIdentityRuntimeClient).not.toHaveBeenCalled();
  });

  // Defect: lib/server/identity.ts:73 caches a rejected composition promise.
  // One transient database failure leaves every later call failing until restart,
  // while /api/health keeps reporting the process as alive.
  it.fails("retries composition after a transient database connection failure", async () => {
    mocks.createCompanyIdentityRuntimeClient
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(mocks.sql);
    const { getIdentityComposition } = await import("./identity");

    await expect(getIdentityComposition()).rejects.toThrow("ECONNREFUSED");
    await expect(getIdentityComposition()).resolves.toMatchObject({
      issuerUrl: ISSUER.issuerUrl,
    });
  });

  it("fingerprints credential idempotency with the decoded identifier key", async () => {
    await loadComposition();
    const serviceInput = (mocks.createCompanyIdentityService.mock.calls[0] as unknown[])[0] as {
      passwords: { fingerprint: (password: string) => string };
    };

    expect(serviceInput.passwords.fingerprint("new-password")).toBe("fingerprint");
    expect(mocks.fingerprintSecret).toHaveBeenCalledWith(
      Buffer.from("hash-key"),
      "company-credential-idempotency-v1",
      "new-password",
    );
    expect(mocks.createPostgresCompanyLoginRateLimit).toHaveBeenCalledWith({
      sql: mocks.sql,
      identifierHashKey: Buffer.from("hash-key").toString("base64url"),
    });
  });

  describe("kernel authentication", () => {
    it("resolves a session to the employee principal without a school", async () => {
      await loadComposition();
      mocks.service.currentEmployee.mockResolvedValueOnce({
        id: "employee-1",
        companyRoles: ["COMPANY_ADMIN"],
      });

      await expect(
        executorConfig().authentication.authenticate({
          evidence: { kind: "session", opaqueSessionRef: "opaque-token" },
        }),
      ).resolves.toEqual({ userId: "employee-1", roles: ["COMPANY_ADMIN"], schoolId: null });
      expect(mocks.service.currentEmployee).toHaveBeenCalledWith("opaque-token");
    });

    it("returns null for a revoked session", async () => {
      await loadComposition();
      mocks.service.currentEmployee.mockResolvedValueOnce(null);

      await expect(
        executorConfig().authentication.authenticate({
          evidence: { kind: "session", opaqueSessionRef: "revoked" },
        }),
      ).resolves.toBeNull();
    });

    it("returns null for non-session evidence without a lookup", async () => {
      await loadComposition();

      await expect(
        executorConfig().authentication.authenticate({ evidence: { kind: "anonymous" } }),
      ).resolves.toBeNull();
      expect(mocks.service.currentEmployee).not.toHaveBeenCalled();
    });
  });

  describe("kernel authorization", () => {
    it("allows the company-admin policy for a company administrator", async () => {
      await loadComposition();

      await expect(
        executorConfig().authorization.authorize({
          policyId: "company-identity.company-admin",
          principal: { roles: ["COMPANY_ADMIN"] },
        }),
      ).resolves.toEqual({ allowed: true });
    });

    it.each([
      ["a non-admin principal", "company-identity.company-admin", { roles: ["SALES_REP"] }],
      ["an anonymous principal", "company-identity.company-admin", undefined],
      ["an unknown policy", "company-identity.anything-else", { roles: ["COMPANY_ADMIN"] }],
    ])("denies %s with COMPANY_ADMIN_REQUIRED", async (_name, policyId, principal) => {
      await loadComposition();

      await expect(
        executorConfig().authorization.authorize({ policyId, principal }),
      ).resolves.toEqual({ allowed: false, safeReasonCode: "COMPANY_ADMIN_REQUIRED" });
    });

    it("resolves every request to global tenancy", async () => {
      await loadComposition();

      await expect(executorConfig().tenancy.resolve()).resolves.toEqual({ mode: "global" });
    });
  });

  describe("kernel audit", () => {
    it("persists a successful event with secret-safe metadata", async () => {
      await loadComposition();

      const receipt = await executorConfig().audit.append(auditEvent());

      expect(mocks.repository.appendAudit).toHaveBeenCalledWith({
        correlationId: "corr-1",
        actorAccountId: "admin-1",
        targetAccountId: "employee-1",
        operation: "company-identity.employees.create",
        outcome: "SUCCEEDED",
        reasonCode: undefined,
        metadata: {
          projected: {
            source: "accounts-capability-kernel",
            applicationKey: "sales-lms",
            resourceType: "employee",
          },
        },
      });
      expect(receipt.eventId).toBe("event-1");
      expect(Number.isNaN(Date.parse(receipt.persistedAt))).toBe(false);
    });

    it.each([
      ["denied", "DENIED", "DENIED"],
      ["failure", "FAILED", "FAILURE"],
    ])("maps the %s outcome to %s with reason %s", async (outcome, stored, reason) => {
      await loadComposition();

      await executorConfig().audit.append(auditEvent({ outcome }));

      expect(mocks.repository.appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: stored, reasonCode: reason }),
      );
    });

    it("drops a non-user actor and non-string metadata values", async () => {
      await loadComposition();

      await executorConfig().audit.append(
        auditEvent({
          actor: { type: "system", id: "worker" },
          metadata: {
            values: { targetAccountId: 7, applicationKey: null, resourceType: ["x"], password: "p" },
          },
        }),
      );

      expect(mocks.repository.appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actorAccountId: undefined,
          targetAccountId: undefined,
          metadata: { projected: { source: "accounts-capability-kernel" } },
        }),
      );
    });

    it("propagates a repository failure so the kernel fails closed", async () => {
      await loadComposition();
      mocks.repository.appendAudit.mockRejectedValueOnce(new Error("audit write failed"));

      await expect(executorConfig().audit.append(auditEvent())).rejects.toThrow(
        "audit write failed",
      );
    });
  });

  it("refuses kernel transactions and external adapters", async () => {
    await loadComposition();

    await expect(executorConfig().transactions.run()).rejects.toThrow(
      "Company identity capability transactions are repository-owned.",
    );
    expect(() => executorConfig().adapters.get()).toThrow(
      "No external adapter is registered for identity handlers.",
    );
  });

  describe("database probe and close", () => {
    it("passes when the database answers ready", async () => {
      const { composition } = await loadComposition();
      mocks.sql.mockResolvedValueOnce([{ ready: 1 }]);

      await expect(composition.probeDatabase()).resolves.toBeUndefined();
    });

    it.each([
      ["no rows", []],
      ["a wrong value", [{ ready: 0 }]],
    ])("fails when the database returns %s", async (_name, rows) => {
      const { composition } = await loadComposition();
      mocks.sql.mockResolvedValueOnce(rows);

      await expect(composition.probeDatabase()).rejects.toThrow(
        "COMPANY_IDENTITY_DATABASE_NOT_READY",
      );
    });

    it("closes the pool with a bounded timeout", async () => {
      const { composition } = await loadComposition();
      mocks.sql.end.mockResolvedValueOnce(undefined);

      await composition.close();

      expect(mocks.sql.end).toHaveBeenCalledWith({ timeout: 5 });
    });
  });
});
