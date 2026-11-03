// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  resolveLegacy: vi.fn(),
  validateSession: vi.fn(),
  legacyMode: vi.fn(),
  createConfig: vi.fn(),
  createClient: vi.fn(),
  introspect: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: { kind: "database" } }));
vi.mock("@reading-advantage/domain", () => ({
  resolveSalesCompanyPrincipal: mocks.resolve,
  resolveLegacySalesCompanyPrincipal: mocks.resolveLegacy,
}));
vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  validateSession: mocks.validateSession,
  createCompanyIdentityServiceAuthConfig: mocks.createConfig,
  createCompanyOidcClient: mocks.createClient,
}));
vi.mock("../auth-mode", () => ({
  isLegacySalesAuthEnabled: mocks.legacyMode,
}));

const identity = {
  sub: "00000000-0000-4000-8000-000000000001",
  aud: "sales",
  status: "ACTIVE" as const,
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
  username: "rep.user",
  displayName: "Rep User",
  roles: [] as string[],
  sid: "company-session",
  authVersion: 1,
};

const principal = {
  user: { id: `sales:${identity.sub}`, role: "SALES_REP" },
  scope: { kind: "company", applicationKey: "sales" },
};

/**
 * Loads a fresh company-oidc module so memoized config and client reset.
 * @returns The freshly imported module.
 */
async function loadModule() {
  vi.resetModules();
  return import("../company-oidc");
}

/**
 * Builds a request carrying the given headers.
 * @param headers Request headers.
 * @returns A Sales request.
 */
function request(headers: Record<string, string> = {}) {
  return new Request("https://sales.reading-advantage.com/api/trpc", {
    headers,
  });
}

describe("company-mode Sales authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.createConfig.mockReturnValue({
      redirectUri: "https://sales.example.test/api/auth/callback?x=1",
    });
    mocks.createClient.mockReturnValue({ introspect: mocks.introspect });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads only the Sales session cookie and ignores legacy evidence", async () => {
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(
        request({
          cookie: "session_token=legacy",
          authorization: "Bearer legacy-bearer",
        }),
      ),
    ).resolves.toEqual({ kind: "no-session" });
    expect(mocks.introspect).not.toHaveBeenCalled();
    expect(mocks.validateSession).not.toHaveBeenCalled();
  });

  it("reports no session when Accounts introspection rejects the token", async () => {
    mocks.introspect.mockResolvedValue(null);
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "ra_sales_session=tok" })),
    ).resolves.toEqual({ kind: "no-session" });
    expect(mocks.introspect).toHaveBeenCalledWith("tok");
  });

  it("authenticates an introspected identity with a Sales role", async () => {
    mocks.introspect.mockResolvedValue({
      identity: { ...identity, roles: ["SALES_ADMIN"] },
    });
    mocks.resolve.mockResolvedValue(principal);
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "ra_sales_session=tok" })),
    ).resolves.toEqual({ kind: "authenticated", principal });
    expect(mocks.resolve).toHaveBeenCalledWith(
      { kind: "database" },
      { ...identity, roles: ["SALES_ADMIN"] },
    );
  });

  it("denies an identity whose Sales role resolves to no principal", async () => {
    mocks.introspect.mockResolvedValue({
      identity: { ...identity, roles: ["SALES_REP"] },
    });
    mocks.resolve.mockResolvedValue(null);
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "ra_sales_session=tok" })),
    ).resolves.toEqual({ kind: "no-sales-role" });
  });

  it("denies identities that hold only non-Sales roles", async () => {
    mocks.introspect.mockResolvedValue({
      identity: { ...identity, roles: ["ACCOUNTING_ADMIN", "sales_rep"] },
    });
    mocks.resolve.mockResolvedValue(null);
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "ra_sales_session=tok" })),
    ).resolves.toEqual({ kind: "no-sales-role" });
  });

  it("propagates an introspection failure", async () => {
    mocks.introspect.mockRejectedValue(new Error("accounts down"));
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "ra_sales_session=tok" })),
    ).rejects.toThrow("accounts down");
  });

  it("builds the OIDC config and client once per process", async () => {
    vi.stubEnv("COMPANY_AUTH_ISSUER_URL", "https://accounts.example.test");
    vi.stubEnv("COMPANY_AUTH_OIDC_CLIENT_ID", "sales-client");
    vi.stubEnv("COMPANY_AUTH_OIDC_CLIENT_SECRET", "test-only");
    vi.stubEnv("COMPANY_AUTH_OIDC_REDIRECT_URI", "https://sales.example.test/cb");
    vi.stubEnv("COMPANY_AUTH_EXPECTED_AUDIENCE", "sales");
    vi.stubEnv("COMPANY_AUTH_CLOCK_SKEW_SECONDS", "30");
    const { getSalesOidcClient, getSalesPublicOrigin } = await loadModule();

    const first = getSalesOidcClient();
    expect(getSalesOidcClient()).toBe(first);
    expect(getSalesPublicOrigin()).toBe("https://sales.example.test");
    expect(mocks.createConfig).toHaveBeenCalledTimes(1);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
    expect(mocks.createConfig).toHaveBeenCalledWith({
      NODE_ENV: process.env.NODE_ENV,
      COMPANY_AUTH_ISSUER_URL: "https://accounts.example.test",
      COMPANY_AUTH_OIDC_CLIENT_ID: "sales-client",
      COMPANY_AUTH_OIDC_CLIENT_SECRET: "test-only",
      COMPANY_AUTH_OIDC_REDIRECT_URI: "https://sales.example.test/cb",
      COMPANY_AUTH_EXPECTED_AUDIENCE: "sales",
      COMPANY_AUTH_CLOCK_SKEW_SECONDS: "30",
    });
    expect(mocks.createClient).toHaveBeenCalledWith({
      config: mocks.createConfig.mock.results[0]?.value,
    });
  });

  it("propagates an invalid OIDC config error", async () => {
    mocks.createConfig.mockImplementation(() => {
      throw new Error("COMPANY_AUTH_ISSUER_URL is required");
    });
    const { getSalesPublicOrigin } = await loadModule();
    expect(() => getSalesPublicOrigin()).toThrow(
      "COMPANY_AUTH_ISSUER_URL is required",
    );
  });

  it("logs a structured warning when deferred deauthorization fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.resolve.mockRejectedValue("plain failure");
    const { salesSessionUser } = await loadModule();

    await expect(salesSessionUser(identity)).resolves.toBeNull();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({
      level: "warn",
      event: "sales_deauthorization_deferred",
      companyAccountId: identity.sub,
      detail: "plain failure",
    });
    warn.mockRestore();
  });
});

describe("salesSessionRole", () => {
  it("prefers SALES_ADMIN over SALES_REP", async () => {
    const { salesSessionRole } = await loadModule();
    expect(
      salesSessionRole({ ...identity, roles: ["SALES_REP", "SALES_ADMIN"] }),
    ).toBe("SALES_ADMIN");
  });

  it("returns SALES_REP when it is the only Sales role", async () => {
    const { salesSessionRole } = await loadModule();
    expect(salesSessionRole({ ...identity, roles: ["OTHER", "SALES_REP"] })).toBe(
      "SALES_REP",
    );
  });

  it("throws when no Sales role is present", async () => {
    const { salesSessionRole } = await loadModule();
    expect(() => salesSessionRole({ ...identity, roles: ["ADMIN"] })).toThrow(
      "Accounts session has no recognized Sales role.",
    );
  });
});

describe("legacy-mode Sales authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(true);
  });

  it("falls back to the bearer token when no legacy cookie exists", async () => {
    mocks.validateSession.mockResolvedValue({ user: { id: "legacy-user" } });
    mocks.resolveLegacy.mockResolvedValue(principal);
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ authorization: "Bearer bearer-tok" })),
    ).resolves.toEqual({ kind: "authenticated", principal });
    expect(mocks.validateSession).toHaveBeenCalledWith(
      { kind: "database" },
      "bearer-tok",
    );
    expect(mocks.resolveLegacy).toHaveBeenCalledWith(
      { kind: "database" },
      "legacy-user",
    );
  });

  it("ignores a non-Bearer authorization scheme", async () => {
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ authorization: "Basic abc" })),
    ).resolves.toEqual({ kind: "no-session" });
    expect(mocks.validateSession).not.toHaveBeenCalled();
  });

  it("ignores the company Sales cookie in legacy mode", async () => {
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "ra_sales_session=tok" })),
    ).resolves.toEqual({ kind: "no-session" });
    expect(mocks.introspect).not.toHaveBeenCalled();
  });

  it("reports no session when the legacy session is invalid", async () => {
    mocks.validateSession.mockResolvedValue(null);
    const { authenticateSalesRequest } = await loadModule();
    await expect(
      authenticateSalesRequest(request({ cookie: "session_token=expired" })),
    ).resolves.toEqual({ kind: "no-session" });
    expect(mocks.resolveLegacy).not.toHaveBeenCalled();
  });
});
