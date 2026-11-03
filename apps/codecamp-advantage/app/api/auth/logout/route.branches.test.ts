// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleLogout: vi.fn(),
  legacyMode: vi.fn(),
  oidcLogout: vi.fn(),
  readCookie: vi.fn(),
  logStructuredError: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({ handleLogout: mocks.handleLogout }));
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ logout: mocks.oidcLogout }),
  readCodecampCookie: mocks.readCookie,
}));
vi.mock("@reading-advantage/utils/structured-error", () => ({ logStructuredError: mocks.logStructuredError }));

import { POST } from "./route";

const origin = "https://codecamp.reading-advantage.com";

/** Creates a logout request with the given headers. */
function request(headers: Record<string, string>): NextRequest {
  return new NextRequest(`${origin}/api/auth/logout`, { method: "POST", headers });
}

describe("POST /api/auth/logout branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.readCookie.mockReturnValue("company-token");
    mocks.oidcLogout.mockResolvedValue(true);
  });

  it.each([
    ["a cross-site origin", { origin: "https://evil.example" }],
    ["no origin header", {}],
  ])("rejects %s with 403 before any revocation", async (_label, headers) => {
    const response = await POST(request(headers));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "Invalid request origin" });
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("checks the origin before delegating to legacy logout", async () => {
    mocks.legacyMode.mockReturnValue(true);

    const response = await POST(request({ origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    expect(mocks.handleLogout).not.toHaveBeenCalled();
  });

  it("returns 502, logs the revocation error, and still clears the cookie when Accounts throws", async () => {
    const failure = new Error("accounts unreachable");
    mocks.oidcLogout.mockRejectedValue(failure);

    const response = await POST(request({ origin }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ success: false });
    expect(mocks.logStructuredError).toHaveBeenCalledWith({ event: "codecamp_logout_revocation_error", error: failure });
    expect(response.headers.get("set-cookie")).toContain("__Host-ra_codecamp_session=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("succeeds and clears the cookie without revocation when no session cookie exists", async () => {
    mocks.readCookie.mockReturnValue(undefined);

    const response = await POST(request({ origin }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
    expect(mocks.logStructuredError).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("__Host-ra_codecamp_session=;");
  });
});
