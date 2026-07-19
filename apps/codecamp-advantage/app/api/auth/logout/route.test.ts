// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.readCookie.mockReturnValue("company-token");
    mocks.handleLogout.mockResolvedValue(NextResponse.json({ success: true }));
  });

  it("revokes only the Accounts application session in company mode", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.oidcLogout).toHaveBeenCalledWith("company-token");
    expect(mocks.handleLogout).not.toHaveBeenCalled();
  });

  it("uses only the local session adapter in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const legacyRequest = request();

    const response = await POST(legacyRequest);

    expect(response.status).toBe(200);
    expect(mocks.handleLogout).toHaveBeenCalledWith(legacyRequest);
    expect(mocks.oidcLogout).not.toHaveBeenCalled();
  });
});
