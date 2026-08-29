// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  handleLogout: vi.fn(),
  oidcLogout: vi.fn(),
  readSalesCookie: vi.fn(),
  publicOrigin: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleLogout: mocks.handleLogout,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacySalesAuthEnabled: mocks.legacyMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  SALES_SESSION_COOKIE: "__Host-ra_sales_session",
  getSalesOidcClient: () => ({ logout: mocks.oidcLogout }),
  readSalesCookie: mocks.readSalesCookie,
}));
vi.mock("@/lib/public-url", () => ({
  getPublicOrigin: mocks.publicOrigin,
}));

import { POST } from "./route";

/** Creates a same-origin Sales logout request. */
function request(): NextRequest {
  return new NextRequest(
    "https://sales.reading-advantage.com/api/auth/logout",
    {
      method: "POST",
      headers: { origin: "https://sales.reading-advantage.com" },
    },
  );
}

function forwardedRequest(): NextRequest {
  return new NextRequest("http://sales-internal:8080/api/auth/logout", {
    method: "POST",
    headers: {
      origin: "https://sales.reading-advantage.com",
      "x-forwarded-host": "sales.reading-advantage.com",
      "x-forwarded-proto": "https",
    },
  });
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.readSalesCookie.mockReturnValue("company-token");
    mocks.oidcLogout.mockResolvedValue(true);
    mocks.publicOrigin.mockReturnValue(
      new URL("https://sales.reading-advantage.com"),
    );
    mocks.handleLogout.mockResolvedValue(NextResponse.json({ success: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("revokes only the Accounts application session in company mode", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.oidcLogout).toHaveBeenCalledWith("company-token");
    expect(mocks.handleLogout).not.toHaveBeenCalled();
  });

  it("accepts the public origin behind a forwarding hop", async () => {
    const response = await POST(forwardedRequest());

    expect(response.status).toBe(200);
    expect(mocks.oidcLogout).toHaveBeenCalledWith("company-token");
  });

  it("secures the expired session cookie", async () => {
    const response = await POST(request());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("uses only the local session adapter in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.handleLogout).toHaveBeenCalledWith(request());
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
  });
});
