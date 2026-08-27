// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleLogout: vi.fn(),
  legacyMode: vi.fn(),
  oidcLogout: vi.fn(),
  readCookie: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleLogout: mocks.handleLogout,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ logout: mocks.oidcLogout }),
  readCodecampCookie: mocks.readCookie,
}));

import { POST } from "./route";

/** Creates a same-origin Codecamp logout request. */
function request(): NextRequest {
  return new NextRequest("https://codecamp.reading-advantage.com/api/auth/logout", {
    method: "POST",
    headers: { origin: "https://codecamp.reading-advantage.com" },
  });
}

function forwardedRequest(): NextRequest {
  return new NextRequest("http://codecamp-internal:8080/api/auth/logout", {
    method: "POST",
    headers: {
      origin: "https://codecamp.reading-advantage.com",
      "x-forwarded-host": "codecamp.reading-advantage.com",
      "x-forwarded-proto": "https",
    },
  });
}

function loopbackRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
  });
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.readCookie.mockReturnValue("company-token");
    mocks.oidcLogout.mockResolvedValue(true);
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

  it("returns revocation failure while always clearing the company session cookie", async () => {
    mocks.oidcLogout.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(request());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ success: false });
    expect(setCookie).toBe(
      "__Host-ra_codecamp_session=; Path=/; " +
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; " +
        "Secure; HttpOnly; SameSite=lax",
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"event":"codecamp_logout_revocation_failed"'),
    );
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain("company-token");
  });

  it("uses only the local session adapter in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const legacyRequest = request();

    const response = await POST(legacyRequest);

    expect(response.status).toBe(200);
    expect(mocks.handleLogout).toHaveBeenCalledWith(legacyRequest);
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
  });

  it("accepts the public origin behind a forwarding hop", async () => {
    const response = await POST(forwardedRequest());

    expect(response.status).toBe(200);
    expect(mocks.oidcLogout).toHaveBeenCalledWith("company-token");
  });

  it("secures the expired session cookie for HTTP loopback development", async () => {
    const response = await POST(loopbackRequest());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
});
