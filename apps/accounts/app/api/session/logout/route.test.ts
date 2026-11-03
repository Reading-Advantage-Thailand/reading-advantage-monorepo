import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyIdentityError } from "@reading-advantage/backend";

const { cookieGet, cookieSet, getIdentityComposition, globalLogout } = vi.hoisted(
  () => ({
    cookieGet: vi.fn(),
    cookieSet: vi.fn(),
    getIdentityComposition: vi.fn(),
    globalLogout: vi.fn(),
  }),
);

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet, set: cookieSet })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { OPTIONS, POST } from "./route";

const ISSUER = "https://accounts.example.test";
const COOKIE_NAME = "__Host-ra_company_sso";
const CLEARED_COOKIE = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 0,
};

function logoutRequest(headers: Record<string, string> = { origin: ISSUER }): Request {
  return new Request(`${ISSUER}/api/session/logout`, { method: "POST", headers });
}

describe("Accounts session logout route", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    cookieSet.mockReset();
    getIdentityComposition.mockReset();
    globalLogout.mockReset();
    getIdentityComposition.mockResolvedValue({
      cookie: { name: COOKIE_NAME, secure: true, sameSite: "lax", path: "/" },
      issuerUrl: ISSUER,
      service: { globalLogout },
    });
  });

  it("revokes every session for the cookie token and clears the cookie", async () => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });
    globalLogout.mockResolvedValueOnce(3);

    const response = await POST(logoutRequest());

    expect(cookieGet).toHaveBeenCalledWith(COOKIE_NAME);
    expect(globalLogout).toHaveBeenCalledWith("opaque-sso-token");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sessionsRevoked: 3 });
    expect(cookieSet).toHaveBeenCalledWith(COOKIE_NAME, "", CLEARED_COOKIE);
  });

  it("clears the cookie and reports zero revocations without a token", async () => {
    cookieGet.mockReturnValue(undefined);

    const response = await POST(logoutRequest());

    expect(globalLogout).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sessionsRevoked: 0 });
    expect(cookieSet).toHaveBeenCalledWith(COOKIE_NAME, "", CLEARED_COOKIE);
  });

  it.each([
    ["missing", {}],
    ["foreign", { origin: "https://evil.example.test" }],
  ])("rejects a %s origin without revoking or clearing", async (_name, headers) => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });

    const response = await POST(logoutRequest(headers));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "FORBIDDEN" });
    expect(globalLogout).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("keeps the cookie when revocation fails", async () => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });
    globalLogout.mockRejectedValueOnce(
      new CompanyIdentityError("SESSION_INVALID", "Session is invalid."),
    );

    const response = await POST(logoutRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "SESSION_INVALID",
      message: "Session is invalid.",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("answers preflight with an empty no-store 204", async () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
