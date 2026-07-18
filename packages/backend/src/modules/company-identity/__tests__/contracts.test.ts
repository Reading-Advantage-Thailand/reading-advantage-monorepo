import { describe, expect, it } from "vitest";

import {
  companyIdentityClaimsSchema,
  createEmployeeInputSchema,
  oidcAuthorizationInputSchema,
  oidcTokenInputSchema,
} from "../contracts.js";

describe("company identity contracts", () => {
  it("requires Authorization Code with S256 PKCE, state, nonce, and openid", () => {
    const request = {
      clientId: "marketing-web",
      redirectUri: "https://marketing.reading-advantage.com/api/auth/callback",
      responseType: "code",
      scope: "openid profile",
      state: "state-value-with-entropy",
      nonce: "nonce-value-with-entropy",
      codeChallenge: "A".repeat(43),
      codeChallengeMethod: "S256",
      ssoSessionToken: "s".repeat(32),
    };
    expect(oidcAuthorizationInputSchema.safeParse(request).success).toBe(true);
    expect(
      oidcAuthorizationInputSchema.safeParse({ ...request, scope: "profile" })
        .success,
    ).toBe(false);
    expect(
      oidcAuthorizationInputSchema.safeParse({
        ...request,
        codeChallengeMethod: "plain",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed token exchanges and cross-app claim roles", () => {
    expect(
      oidcTokenInputSchema.safeParse({
        grantType: "authorization_code",
        code: "c".repeat(32),
        clientId: "sales-web",
        redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
        codeVerifier: "v".repeat(43),
      }).success,
    ).toBe(true);
    expect(
      companyIdentityClaimsSchema.safeParse({
        iss: "https://accounts.reading-advantage.com",
        sub: "2c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
        aud: "sales",
        exp: 2,
        iat: 1,
        nonce: "n",
        sid: "3c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
        organizationId: "4c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
        organizationKey: "internal-company",
        status: "ACTIVE",
        roles: ["company-admin"],
        authVersion: 1,
      }).success,
    ).toBe(false);
  });

  it("requires an explicit idempotency key and never accepts weak passwords", () => {
    const input = {
      actorAccountId: "2c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      username: "new.employee",
      displayName: "New Employee",
      initialPassword: "long-enough-password",
      companyRoles: ["EMPLOYEE"],
      appRoles: { sales: ["SALES_REP"] },
      idempotencyKey: "employee-create-0001",
    };
    expect(createEmployeeInputSchema.safeParse(input).success).toBe(true);
    expect(
      createEmployeeInputSchema.safeParse({ ...input, initialPassword: "short" })
        .success,
    ).toBe(false);
  });
});
