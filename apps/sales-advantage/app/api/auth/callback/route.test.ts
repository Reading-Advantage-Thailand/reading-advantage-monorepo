// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  readSalesCookie: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  SALES_SESSION_COOKIE: "__Host-ra_sales_session",
  SALES_TRANSACTION_COOKIE: "__Host-ra_sales_oidc_tx",
  getSalesOidcClient: () => ({ exchange: mocks.exchange }),
  getSalesPublicOrigin: () => "https://sales.reading-advantage.com",
  readSalesCookie: mocks.readSalesCookie,
}));

import { GET } from "./route";

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSalesCookie.mockReturnValue("private-transaction");
  });

  it("logs a safe structured callback failure with request correlation only", async () => {
    mocks.exchange.mockRejectedValue(
      new Error("private-token private-code private-state"),
    );
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const request = new Request(
      "https://sales.reading-advantage.com/api/auth/callback?code=private-code&state=private-state",
      { headers: { "x-request-id": "request-123" } },
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/?error=sso",
    );
    expect(error).toHaveBeenCalledTimes(1);
    const serialized = String(error.mock.calls[0]?.[0]);
    expect(JSON.parse(serialized)).toEqual({
      level: "error",
      event: "sales_oidc_callback_failed",
      requestId: "request-123",
      method: "GET",
      route: "/api/auth/callback",
      errorName: "Error",
    });
    expect(serialized).not.toContain("private-token");
    expect(serialized).not.toContain("private-code");
    expect(serialized).not.toContain("private-state");
    expect(serialized).not.toContain("private-transaction");
    error.mockRestore();
  });

  it("sets the company session and clears the transaction after exchange", async () => {
    mocks.exchange.mockResolvedValue({
      accessToken: "opaque-access-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnTo: "/en/module/onboarding",
    });

    const response = await GET(
      new Request(
        "https://sales.reading-advantage.com/api/auth/callback?code=code&state=state",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://sales.reading-advantage.com/en/module/onboarding",
    );
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("__Host-ra_sales_session=");
    expect(cookies).toContain("__Host-ra_sales_oidc_tx=");
  });
});
