// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  codecampSessionRole: vi.fn(),
  legacyMode: vi.fn(),
  exchange: vi.fn(),
  readCookie: vi.fn(),
}));

vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  CODECAMP_TRANSACTION_COOKIE: "__Host-ra_codecamp_oidc_tx",
  codecampSessionRole: mocks.codecampSessionRole,
  getCodecampOidcClient: () => ({ exchange: mocks.exchange }),
  readCodecampCookie: mocks.readCookie,
}));

import { GET } from "./route";

/** Creates a representative OIDC callback request. */
function request(): Request {
  return new Request(
    "https://codecamp.reading-advantage.com/api/auth/callback?code=code&state=state",
  );
}

function forwardedRequest(): Request {
  return new Request(
    "http://codecamp-internal:8080/api/auth/callback?code=code&state=state",
    {
      headers: {
        "x-forwarded-host": "codecamp.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    },
  );
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.codecampSessionRole.mockReturnValue("INTERN");
    mocks.readCookie.mockReturnValue("sealed-transaction");
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/module/intro",
      identity: {
        aud: "codecamp",
        roles: ["INTERN"],
      },
    });
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never exchanges Accounts credentials in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);

    const response = await GET(request());

    expect(response.headers.get("location")).toBe(
      "https://codecamp.reading-advantage.com/?error=legacy_auth_active",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "__Host-ra_codecamp_oidc_tx=",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("exchanges and creates a company application session only in company mode", async () => {
    const response = await GET(request());

    expect(mocks.exchange).toHaveBeenCalledWith({
      code: "code",
      state: "state",
      sealedTransaction: "sealed-transaction",
    });
    expect(response.headers.get("location")).toBe(
      "https://codecamp.reading-advantage.com/en/module/intro",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "__Host-ra_codecamp_session=company-token",
    );
  });

  it("uses the forwarded origin after exchange", async () => {
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/admin",
      identity: {
        aud: "codecamp",
        roles: ["ADMIN"],
      },
    });

    const response = await GET(forwardedRequest());

    expect(response.headers.get("location")).toBe(
      "https://codecamp.reading-advantage.com/en/admin",
    );
  });

  it("uses the forwarded origin for sso errors", async () => {
    mocks.readCookie.mockReturnValue(null);

    const response = await GET(forwardedRequest());

    expect(response.headers.get("location")).toBe(
      "https://codecamp.reading-advantage.com/?error=sso",
    );
  });

  it("secures a session cookie for forwarded https", async () => {
    const response = await GET(forwardedRequest());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("redirects a valid Accounts identity without a Codecamp role", async () => {
    const identity = {
      aud: "codecamp",
      roles: ["SALES_REP"],
    };
    mocks.codecampSessionRole.mockImplementation(() => {
      throw new Error("Accounts session has no recognized Codecamp role.");
    });
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/module/intro",
      identity,
    });

    const response = await GET(request());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "https://codecamp.reading-advantage.com/?error=forbidden",
    );
    expect(setCookie).toContain("__Host-ra_codecamp_oidc_tx=");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie).not.toContain("__Host-ra_codecamp_session=company-token");
    expect(mocks.codecampSessionRole).toHaveBeenCalledWith(identity);
  });
});
