// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  handleLogout: vi.fn(),
  oidcLogout: vi.fn(),
  readSalesCookie: vi.fn(),
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

import { POST } from "./route";

function request(cookie: string): NextRequest {
  return new NextRequest(
    "https://sales.reading-advantage.com/api/auth/logout",
    {
      method: "POST",
      headers: {
        origin: "https://sales.reading-advantage.com",
        cookie,
      },
    },
  );
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.handleLogout.mockImplementation(async () => {
      const response = NextResponse.json({ success: true });
      response.cookies.set("session_token", "", { maxAge: 0, path: "/" });
      return response;
    });
  });

  it("uses the legacy adapter and clears session_token in rollback mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const legacyRequest = request("session_token=legacy-token");

    const response = await POST(legacyRequest);

    expect(mocks.handleLogout).toHaveBeenCalledWith(legacyRequest);
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("session_token=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("fails closed with structured logging when the selected adapter throws", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.handleLogout.mockRejectedValue(new Error("database unavailable"));
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request("session_token=legacy-token"));

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("sales_logout_error"),
    );
    error.mockRestore();
  });

  it("revokes and clears only the company application session in company mode", async () => {
    mocks.readSalesCookie.mockReturnValue("company-token");

    const response = await POST(
      request("__Host-ra_sales_session=company-token"),
    );

    expect(mocks.oidcLogout).toHaveBeenCalledWith("company-token");
    expect(mocks.handleLogout).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain(
      "__Host-ra_sales_session=",
    );
  });
});
