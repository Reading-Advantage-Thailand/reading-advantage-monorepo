import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createConfig: vi.fn((env: Record<string, unknown>) => ({ config: env })),
  createClient: vi.fn((options: unknown) => ({ options })),
  readRequestCookie: vi.fn(),
}));

vi.mock("@reading-advantage/auth", () => ({
  createCompanyIdentityServiceAuthConfig: mocks.createConfig,
  createCompanyOidcClient: mocks.createClient,
  readRequestCookie: mocks.readRequestCookie,
}));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ resolveCodecampCompanyPrincipal: vi.fn() }));

const identity = {
  sub: "s",
  aud: "codecamp",
  organizationId: "o",
  organizationKey: "k",
  username: "u",
  displayName: "d",
} as const;

const envKeys = [
  "COMPANY_AUTH_ISSUER_URL",
  "COMPANY_AUTH_OIDC_CLIENT_ID",
  "COMPANY_AUTH_OIDC_CLIENT_SECRET",
  "COMPANY_AUTH_OIDC_REDIRECT_URI",
  "COMPANY_AUTH_EXPECTED_AUDIENCE",
  "COMPANY_AUTH_CLOCK_SKEW_SECONDS",
] as const;

describe("Codecamp company OIDC helpers", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const key of envKeys) saved[key] = process.env[key];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("uses host-only cookie names in production only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const prod = await import("../company-oidc");
    expect(prod.CODECAMP_SESSION_COOKIE).toBe("__Host-ra_codecamp_session");
    expect(prod.CODECAMP_TRANSACTION_COOKIE).toBe("__Host-ra_codecamp_oidc_tx");

    vi.stubEnv("NODE_ENV", "development");
    expect(prod.resolveCodecampCookieName("ra_codecamp_session")).toBe("ra_codecamp_session");
    vi.resetModules();
    const dev = await import("../company-oidc");
    expect(dev.CODECAMP_TRANSACTION_COOKIE).toBe("ra_codecamp_oidc_tx");
  });

  it("builds the OIDC client once from the Accounts environment and reuses it", async () => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.COMPANY_AUTH_ISSUER_URL = "https://accounts.example";
    process.env.COMPANY_AUTH_OIDC_CLIENT_ID = "codecamp";
    process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET = "secret-value";
    process.env.COMPANY_AUTH_OIDC_REDIRECT_URI = "https://codecamp.example/api/auth/callback";
    process.env.COMPANY_AUTH_EXPECTED_AUDIENCE = "codecamp";
    process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS = "30";
    const { getCodecampOidcClient } = await import("../company-oidc");

    const first = getCodecampOidcClient();
    const second = getCodecampOidcClient();

    expect(second).toBe(first);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
    expect(mocks.createConfig).toHaveBeenCalledWith({
      NODE_ENV: "test",
      COMPANY_AUTH_ISSUER_URL: "https://accounts.example",
      COMPANY_AUTH_OIDC_CLIENT_ID: "codecamp",
      COMPANY_AUTH_OIDC_CLIENT_SECRET: "secret-value",
      COMPANY_AUTH_OIDC_REDIRECT_URI: "https://codecamp.example/api/auth/callback",
      COMPANY_AUTH_EXPECTED_AUDIENCE: "codecamp",
      COMPANY_AUTH_CLOCK_SKEW_SECONDS: "30",
    });
  });

  it("delegates cookie reads to the shared auth reader", async () => {
    mocks.readRequestCookie.mockReturnValue("value");
    const { readCodecampCookie } = await import("../company-oidc");
    const request = new Request("https://codecamp.example");

    expect(readCodecampCookie(request, "ra_codecamp_session")).toBe("value");
    expect(mocks.readRequestCookie).toHaveBeenCalledWith(request, "ra_codecamp_session");
  });

  it("picks the highest-authority Codecamp role regardless of claim order", async () => {
    const { codecampSessionRole } = await import("../company-oidc");

    expect(codecampSessionRole({ ...identity, roles: ["STUDENT", "ADMIN"] })).toBe("ADMIN");
    expect(codecampSessionRole({ ...identity, roles: ["INTERN", "TEACHER"] })).toBe("TEACHER");
    expect(codecampSessionRole({ ...identity, roles: ["OTHER", "STUDENT"] })).toBe("STUDENT");
  });

  it("rejects identities without a recognized Codecamp role", async () => {
    const { codecampSessionRole } = await import("../company-oidc");

    expect(() => codecampSessionRole({ ...identity, roles: [] })).toThrow("no recognized Codecamp role");
    expect(() => codecampSessionRole({ ...identity, roles: ["admin"] })).toThrow("no recognized Codecamp role");
  });
});
