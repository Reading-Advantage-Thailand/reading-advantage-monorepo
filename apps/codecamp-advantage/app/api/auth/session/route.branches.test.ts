// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleSession: vi.fn(),
  legacyMode: vi.fn(),
  introspect: vi.fn(),
  readCookie: vi.fn(),
  resolveUser: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({ handleSession: mocks.handleSession }));
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: mocks.introspect }),
  readCodecampCookie: mocks.readCookie,
  resolveCodecampSessionUser: mocks.resolveUser,
}));

import { GET } from "./route";

const request = () => new NextRequest("https://codecamp.reading-advantage.com/api/auth/session");

describe("GET /api/auth/session company-mode branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
  });

  it("returns a null session without introspection when no session cookie is present", async () => {
    mocks.readCookie.mockReturnValue(undefined);

    const response = await GET(request());

    expect(mocks.readCookie).toHaveBeenCalledWith(expect.anything(), "__Host-ra_codecamp_session");
    expect(mocks.introspect).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ session: null });
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it("returns a null session when Accounts reports the token as revoked", async () => {
    mocks.readCookie.mockReturnValue("revoked");
    mocks.introspect.mockResolvedValue(null);

    const response = await GET(request());

    expect(mocks.introspect).toHaveBeenCalledWith("revoked");
    expect(mocks.resolveUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ session: null });
  });

  it("returns a null session when the identity has no local Codecamp user", async () => {
    const identity = { sub: "acct-1" };
    mocks.readCookie.mockReturnValue("live");
    mocks.introspect.mockResolvedValue({ identity });
    mocks.resolveUser.mockResolvedValue(null);

    const response = await GET(request());

    expect(mocks.resolveUser).toHaveBeenCalledWith(identity);
    await expect(response.json()).resolves.toEqual({ session: null });
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });
});
