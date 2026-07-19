// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.readCookie.mockReturnValue("sealed-transaction");
    mocks.exchange.mockResolvedValue({
      accessToken: "company-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/module/intro",
    });
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
});
