// @vitest-environment node
import { NextRequest } from "next/server";
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

/**
 * Builds a logout request with the given URL and headers.
 * @param url Request URL.
 * @param headers Request headers.
 * @returns A logout request.
 */
function request(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(url, { method: "POST", headers });
}

const SALES = "https://sales.reading-advantage.com";

describe("POST /api/auth/logout edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.oidcLogout.mockResolvedValue(true);
  });

  it("rejects a cross-origin logout without revoking anything", async () => {
    mocks.readSalesCookie.mockReturnValue("company-token");
    const response = await POST(
      request(`${SALES}/api/auth/logout`, { origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request origin",
    });
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
    expect(mocks.handleLogout).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a logout with no Origin header", async () => {
    const response = await POST(request(`${SALES}/api/auth/logout`, {}));
    expect(response.status).toBe(403);
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
  });

  it("rejects before the origin check when the host is not approved", async () => {
    await expect(
      POST(
        request("https://attacker.example/api/auth/logout", {
          origin: "https://attacker.example",
        }),
      ),
    ).rejects.toThrow("PUBLIC_ORIGIN_INVALID");
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
  });

  it("expires the cookie without calling Accounts when no session exists", async () => {
    mocks.readSalesCookie.mockReturnValue(undefined);
    const response = await POST(
      request(`${SALES}/api/auth/logout`, { origin: SALES }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("__Host-ra_sales_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  it("omits Secure on a local http origin", async () => {
    mocks.readSalesCookie.mockReturnValue(undefined);
    const response = await POST(
      request("http://localhost:3005/api/auth/logout", {
        origin: "http://localhost:3005",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).not.toContain("Secure");
  });

  it("keeps the cookie and returns 500 when Accounts revocation fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.readSalesCookie.mockReturnValue("company-token");
    mocks.oidcLogout.mockRejectedValue(new Error("accounts down"));
    const response = await POST(
      request(`${SALES}/api/auth/logout`, { origin: SALES }),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "Logout failed" });
    expect(mocks.oidcLogout).toHaveBeenCalledWith("company-token");
    expect(response.headers.get("set-cookie")).toBeNull();
    error.mockRestore();
  });
});
