// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  logout: vi.fn(),
  readSalesCookie: vi.fn(),
  salesSessionRole: vi.fn(),
  publicOrigin: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  SALES_SESSION_COOKIE: "__Host-ra_sales_session",
  SALES_TRANSACTION_COOKIE: "__Host-ra_sales_oidc_tx",
  getSalesOidcClient: () => ({
    exchange: mocks.exchange,
    logout: mocks.logout,
  }),
  readSalesCookie: mocks.readSalesCookie,
  salesSessionRole: mocks.salesSessionRole,
}));
vi.mock("@/lib/public-url", () => ({
  getPublicOrigin: mocks.publicOrigin,
}));

import { GET } from "./route";

const callbackOrigin = "https://sales.reading-advantage.com";

/** Creates a representative OIDC callback request. */
function request(headers?: HeadersInit): Request {
  return new Request(
    "https://sales.reading-advantage.com/api/auth/callback?code=code&state=state",
    { headers },
  );
}

function forwardedRequest(): Request {
  return new Request(
    "http://sales-internal:8080/api/auth/callback?code=code&state=state",
    {
      headers: {
        "x-forwarded-host": "sales.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    },
  );
}

const identity = {
  sub: "00000000-0000-4000-8000-000000000001",
  aud: "sales",
  status: "ACTIVE" as const,
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
  username: "demo.sales.rep",
  displayName: "Demo Sales Rep",
  roles: ["SALES_REP"] as string[],
  sid: "company-session",
  authVersion: 1,
};

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSalesCookie.mockReturnValue("sealed-transaction");
    mocks.logout.mockResolvedValue(true);
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/module/intro",
      identity,
    });
    mocks.publicOrigin.mockReturnValue(new URL(callbackOrigin));
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("exchanges and creates the Sales application session", async () => {
    const response = await GET(request());

    expect(mocks.exchange).toHaveBeenCalledWith({
      code: "code",
      state: "state",
      sealedTransaction: "sealed-transaction",
    });
    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/en/module/intro",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "__Host-ra_sales_session=company-token",
    );
  });

  it("expires the transaction cookie for a malformed callback", async () => {
    mocks.readSalesCookie.mockReturnValue(null);
    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/callback"),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/?error=sso",
    );
    expect(setCookie).toContain("__Host-ra_sales_oidc_tx=;");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie).toContain("Secure");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("expires the transaction cookie on a failed exchange", async () => {
    mocks.exchange.mockRejectedValue(new Error("exchange failed"));
    const response = await GET(request());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/?error=sso",
    );
    expect(setCookie).toContain("__Host-ra_sales_oidc_tx=;");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("denies a valid Accounts identity without a Sales role", async () => {
    mocks.salesSessionRole.mockImplementation(() => {
      throw new Error("Accounts session has no recognized Sales role.");
    });
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/module/intro",
      identity: { ...identity, roles: ["MARKETING_MEMBER"] },
    });

    const response = await GET(request());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/?error=forbidden",
    );
    expect(setCookie).toContain("__Host-ra_sales_session=;");
    expect(setCookie).toContain("__Host-ra_sales_oidc_tx=;");
    expect(setCookie).not.toContain("__Host-ra_sales_session=company-token");
    expect(mocks.logout).toHaveBeenCalledWith("company-token");
  });

  it("secures the session cookie for forwarded https", async () => {
    const response = await GET(forwardedRequest());

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/en/module/intro",
    );
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("logs a safe structured callback failure without secret material", async () => {
    mocks.exchange.mockRejectedValue(
      new Error("private-token private-code private-state"),
    );
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failingRequest = new Request(
      "https://sales.reading-advantage.com/api/auth/callback?code=private-code&state=private-state",
      { headers: { "x-request-id": "request-123" } },
    );

    const response = await GET(failingRequest);

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/?error=sso",
    );
    const serialized = String(error.mock.calls[0]?.[0]);
    expect(serialized).not.toContain("private-token");
    expect(serialized).not.toContain("private-code");
    expect(serialized).not.toContain("private-state");
    error.mockRestore();
  });
});
