// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/auth/session/route";
import {
  installIdpFetchDouble,
  PUBLIC_ORIGIN,
  SESSION_COOKIE,
  setCompanyAuthEnv,
  testIdentity,
  uninstallIdpFetchDouble,
  type IdpDouble,
} from "@/app/lib/__tests__/company-oidc-idp-double";

const SESSION_TOKEN = "accounting-opaque-session-token";
const ACTIVE_EXPIRY = "2030-01-01T00:00:00.000Z";

function sessionRequest(withCookie = true): Request {
  return new Request(`${PUBLIC_ORIGIN}/api/auth/session`, {
    headers: withCookie
      ? { cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}` }
      : undefined,
  });
}

describe("GET /api/auth/session (Accounting parity)", () => {
  let idp: IdpDouble;

  beforeAll(() => {
    setCompanyAuthEnv();
    idp = installIdpFetchDouble();
  });

  beforeEach(() => {
    idp.setIntrospection({ active: false });
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
  });

  it("returns 401 with a null session when the session cookie is missing", async () => {
    const response = await GET(sessionRequest(false));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ session: null });
  });

  it("returns 200 with the user session for an active accounting role", async () => {
    idp.setIntrospection({
      active: true,
      identity: testIdentity(["STAFF"]),
      expiresAt: ACTIVE_EXPIRY,
    });
    const response = await GET(sessionRequest());
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      session: { user: Record<string, unknown> };
    };
    expect(body.session.user).toMatchObject({ role: "STAFF" });
  });

  it("returns 403 with denied:true for an active identity without an accounting role", async () => {
    idp.setIntrospection({
      active: true,
      identity: testIdentity(["MEMBER"]),
      expiresAt: ACTIVE_EXPIRY,
    });

    const response = await GET(sessionRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      session: null,
      denied: true,
    });
  });
});
