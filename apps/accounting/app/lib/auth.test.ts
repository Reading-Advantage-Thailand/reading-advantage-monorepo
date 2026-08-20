// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as authModule from "@/app/lib/auth";
import { requireAccountingSession } from "@/app/lib/auth";
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

function guardRequest(withCookie = true): Request {
  return new Request(`${PUBLIC_ORIGIN}/api/expenses`, {
    headers: withCookie
      ? { cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}` }
      : undefined,
  });
}

describe("requireAccountingSession", () => {
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

  it("denies requests without a session cookie with 401", async () => {
    const guard = await requireAccountingSession(guardRequest(false));

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it.each(["STAFF", "OWNER", "ACCOUNTANT"] as const)(
    "admits an active SSO identity carrying the %s role",
    async (role) => {
      idp.setIntrospection({
        active: true,
        identity: testIdentity([role]),
        expiresAt: ACTIVE_EXPIRY,
      });
      const guard = await requireAccountingSession(guardRequest());

      expect(guard.ok).toBe(true);
      if (guard.ok) {
        expect(guard.session.user).toMatchObject({
          id: "11111111-1111-4111-8111-111111111111",
          username: "accounting-user",
          name: "Accounting User",
          role,
          applicationRoles: [role],
        });
      }
      expect(idp.introspectedTokens).toContain(SESSION_TOKEN);
    },
  );

  it("denies an active SSO identity carrying only a marketing role with 403", async () => {
    idp.setIntrospection({
      active: true,
      identity: testIdentity(["MEMBER"]),
      expiresAt: ACTIVE_EXPIRY,
    });
    const guard = await requireAccountingSession(guardRequest());

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(403);
  });

  it("denies a revoked or expired SSO token with 401", async () => {
    idp.setIntrospection({ active: false });
    const guard = await requireAccountingSession(guardRequest());

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it("exposes no app-local password or credential sign-in path", () => {
    const exportedNames: Record<string, unknown> = authModule;

    expect(Object.keys(exportedNames).length).toBeGreaterThan(0);
    for (const exportedName of Object.keys(exportedNames)) {
      expect(exportedName).not.toMatch(/password|credential|login/i);
    }
  });
});
