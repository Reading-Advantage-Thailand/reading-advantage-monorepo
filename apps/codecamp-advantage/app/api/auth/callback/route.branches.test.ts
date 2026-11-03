// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  codecampSessionRole: vi.fn(),
  legacyMode: vi.fn(),
  exchange: vi.fn(),
  logout: vi.fn(),
  readCookie: vi.fn(),
}));

vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  CODECAMP_TRANSACTION_COOKIE: "__Host-ra_codecamp_oidc_tx",
  codecampSessionRole: mocks.codecampSessionRole,
  getCodecampOidcClient: () => ({ exchange: mocks.exchange, logout: mocks.logout }),
  readCodecampCookie: mocks.readCookie,
}));

import { GET } from "./route";

const base = "https://codecamp.reading-advantage.com/api/auth/callback";

/** Returns all Set-Cookie header values on a response. */
function cookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

describe("GET /api/auth/callback branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.codecampSessionRole.mockReturnValue("INTERN");
    mocks.readCookie.mockReturnValue("sealed-transaction");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it.each([
    ["no code", `${base}?state=s`],
    ["no state", `${base}?code=c`],
  ])("redirects to the sso error with %s and never exchanges", async (_label, url) => {
    const response = await GET(new Request(url));

    expect(response.headers.get("location")).toBe("https://codecamp.reading-advantage.com/?error=sso");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(cookies(response).some((c) => c.startsWith("__Host-ra_codecamp_oidc_tx=;"))).toBe(true);
  });

  it("redirects to the sso error and issues no session when the code exchange throws", async () => {
    mocks.exchange.mockRejectedValue(new Error("invalid_grant"));

    const response = await GET(new Request(`${base}?code=c&state=s`));

    expect(mocks.exchange).toHaveBeenCalledWith({ code: "c", state: "s", sealedTransaction: "sealed-transaction" });
    expect(response.headers.get("location")).toBe("https://codecamp.reading-advantage.com/?error=sso");
    expect(cookies(response).some((c) => c.startsWith("__Host-ra_codecamp_session="))).toBe(false);
  });

  it("clamps the session cookie max-age to at least one second for an already-expired session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T00:00:00Z"));
    mocks.exchange.mockResolvedValue({ accessToken: "t", expiresAt: "2026-11-02T23:00:00Z", returnTo: "/", identity: { roles: ["INTERN"] } });

    const response = await GET(new Request(`${base}?code=c&state=s`));

    const session = cookies(response).find((c) => c.startsWith("__Host-ra_codecamp_session=t"));
    expect(session).toContain("Max-Age=1");
  });

  it("sets the session max-age from the Accounts expiry in whole seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T00:00:00Z"));
    mocks.exchange.mockResolvedValue({ accessToken: "t", expiresAt: "2026-11-03T08:00:00.900Z", returnTo: "/th/modules", identity: { roles: ["INTERN"] } });

    const response = await GET(new Request(`${base}?code=c&state=s`));

    expect(response.headers.get("location")).toBe("https://codecamp.reading-advantage.com/th/modules");
    const session = cookies(response).find((c) => c.startsWith("__Host-ra_codecamp_session=t"));
    expect(session).toContain("Max-Age=28800");
    expect(session).toContain("HttpOnly");
    expect(session).toContain("Secure");
  });
});
