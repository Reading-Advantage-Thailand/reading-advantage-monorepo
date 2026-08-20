// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/logout/route";
import {
  cookieValue,
  findCookie,
  installIdpFetchDouble,
  PUBLIC_ORIGIN,
  SESSION_COOKIE,
  setCompanyAuthEnv,
  uninstallIdpFetchDouble,
  type IdpDouble,
} from "@/app/lib/__tests__/company-oidc-idp-double";

const SESSION_TOKEN = "accounting-opaque-session-token";

function logoutRequest(origin: string, withCookie = true): Request {
  return new Request(`${PUBLIC_ORIGIN}/api/auth/logout`, {
    method: "POST",
    headers: {
      origin,
      ...(withCookie ? { cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}` } : {}),
    },
  });
}

describe("POST /api/auth/logout", () => {
  let idp: IdpDouble;

  beforeAll(() => {
    setCompanyAuthEnv();
    idp = installIdpFetchDouble();
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
  });

  it("revokes the SSO session at the IdP and clears the session cookie", async () => {
    const response = await POST(logoutRequest(PUBLIC_ORIGIN));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(idp.endSessionTokens).toContain(SESSION_TOKEN);

    const clearedSession = findCookie(response, SESSION_COOKIE);
    expect(clearedSession).toBeDefined();
    expect(cookieValue(clearedSession as string)).toBe("");
  });

  it("succeeds without touching the IdP when no session cookie is present", async () => {
    const endSessionCallsBefore = idp.endSessionTokens.length;

    const response = await POST(logoutRequest(PUBLIC_ORIGIN, false));

    expect(response.status).toBe(200);
    expect(idp.endSessionTokens).toHaveLength(endSessionCallsBefore);
  });

  it("rejects cross-origin POSTs before touching the IdP", async () => {
    const endSessionCallsBefore = idp.endSessionTokens.length;

    const response = await POST(logoutRequest("https://phishing.example"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request origin",
    });
    expect(idp.endSessionTokens).toHaveLength(endSessionCallsBefore);
    expect(findCookie(response, SESSION_COOKIE)).toBeUndefined();
  });
});
