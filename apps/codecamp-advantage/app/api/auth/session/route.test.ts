// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleSession: vi.fn(),
  legacyMode: vi.fn(),
  introspect: vi.fn(),
  readCookie: vi.fn(),
  resolveUser: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleSession: mocks.handleSession,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: mocks.introspect }),
  readCodecampCookie: mocks.readCookie,
  resolveCodecampSessionUser: mocks.resolveUser,
}));

import { GET } from "./route";

/** Creates a Codecamp session request carrying both possible cookie types. */
function request(): NextRequest {
  return new NextRequest("https://codecamp.reading-advantage.com/api/auth/session", {
    headers: {
      cookie: "session_token=legacy; __Host-ra_codecamp_session=company",
    },
  });
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.readCookie.mockReturnValue("company");
    mocks.introspect.mockResolvedValue({ identity: { sub: "company-account" } });
    mocks.resolveUser.mockResolvedValue({ id: "local-user", role: "INTERN" });
    mocks.handleSession.mockResolvedValue(
      NextResponse.json({ session: { user: { id: "legacy-user" } } }),
    );
  });

  it("uses only the Accounts application session in company mode", async () => {
    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({
      session: { user: { id: "local-user", role: "INTERN" } },
    });
    expect(mocks.handleSession).not.toHaveBeenCalled();
  });

  it("uses only the last-known-working local session in legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const legacyRequest = request();

    const response = await GET(legacyRequest);

    await expect(response.json()).resolves.toEqual({
      session: { user: { id: "legacy-user" } },
    });
    expect(mocks.handleSession).toHaveBeenCalledWith(legacyRequest);
    expect(mocks.introspect).not.toHaveBeenCalled();
  });
});
