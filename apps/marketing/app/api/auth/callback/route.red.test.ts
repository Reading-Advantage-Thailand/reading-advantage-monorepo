// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  logout: vi.fn(),
  readMarketingCookie: vi.fn(),
  publicOrigin: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  MARKETING_SESSION_COOKIE: "__Host-ra_marketing_session",
  MARKETING_TRANSACTION_COOKIE: "__Host-ra_marketing_oidc_tx",
   getMarketingOidcClient: () => ({
     exchange: mocks.exchange,
     logout: mocks.logout,
   }),
  readMarketingCookie: mocks.readMarketingCookie,
}));
vi.mock("@/lib/public-url", () => ({
  getPublicOrigin: mocks.publicOrigin,
}));

import { GET } from "./route";

const callbackOrigin = "https://marketing.reading-advantage.com";

/** Creates a representative OIDC callback request. */
function request(): Request {
  return new Request(
    "https://marketing.reading-advantage.com/api/auth/callback?code=code&state=state",
  );
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readMarketingCookie.mockReturnValue("sealed-transaction");
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      identity: { roles: ["MEMBER"] },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/campaigns/123",
    });
    mocks.logout.mockResolvedValue(true);
    mocks.publicOrigin.mockReturnValue(new URL(callbackOrigin));
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("expires the transaction cookie on the early missing-transaction return", async () => {
    mocks.readMarketingCookie.mockReturnValue(null);
    const response = await GET(
      new Request("https://marketing.reading-advantage.com/api/auth/callback"),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "https://marketing.reading-advantage.com/login?error=sso",
    );
    expect(setCookie).toContain("__Host-ra_marketing_oidc_tx=;");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie).toContain("Secure");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("expires the transaction cookie on a failed exchange", async () => {
    mocks.exchange.mockRejectedValue(new Error("exchange failed"));
    const response = await GET(request());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "https://marketing.reading-advantage.com/login?error=sso",
    );
    expect(setCookie).toContain("__Host-ra_marketing_oidc_tx=;");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("builds the exchange target from the validated public origin", async () => {
    const response = await GET(request());

    expect(mocks.publicOrigin).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://marketing.reading-advantage.com/campaigns/123",
    );
  });

  it("lands on an approved preview origin", async () => {
    const previewOrigin =
      "https://sso-candidate---marketing-123456789012.asia-southeast1.run.app";
    mocks.publicOrigin.mockReturnValue(new URL(previewOrigin));

    const response = await GET(request());

    expect(response.headers.get("location")).toBe(
      `${previewOrigin}/campaigns/123`,
    );
  });

  it("rejects a callback identity without a Marketing role", async () => {
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      identity: { roles: ["SALES_ADMIN"] },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/campaigns/123",
    });

    const response = await GET(request());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      `${callbackOrigin}/login?error=forbidden`,
    );
    expect(setCookie).toContain("__Host-ra_marketing_session=;");
    expect(setCookie).not.toContain("__Host-ra_marketing_session=company-token");
    expect(mocks.logout).toHaveBeenCalledWith("company-token");
  });
});
