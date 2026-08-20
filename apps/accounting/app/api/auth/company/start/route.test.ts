// @vitest-environment node
import { createHash } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET } from "@/app/api/auth/company/start/route";
import {
  cookieValue,
  decodeTransaction,
  findCookie,
  installIdpFetchDouble,
  ISSUER,
  PUBLIC_ORIGIN,
  REDIRECT_URI,
  setCompanyAuthEnv,
  TRANSACTION_COOKIE,
  uninstallIdpFetchDouble,
} from "@/app/lib/__tests__/company-oidc-idp-double";

describe("GET /api/auth/company/start", () => {
  beforeAll(() => {
    setCompanyAuthEnv();
    installIdpFetchDouble();
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
  });

  it("redirects (307) to the Accounts authorize endpoint with a PKCE S256 authorization-code request", async () => {
    const response = await GET(
      new Request(
        `${PUBLIC_ORIGIN}/api/auth/company/start?returnTo=%2Fexpenses`,
      ),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(`${location.origin}${location.pathname}`).toBe(
      `${ISSUER}/api/oidc/authorize`,
    );
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("client_id")).toBe("accounting-web");
    expect(location.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(location.searchParams.get("scope")).toBe("openid profile");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("code_challenge")).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    );
    expect(location.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(location.searchParams.get("nonce")).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("sets an HttpOnly sealed-transaction cookie bound to the redirect state and PKCE challenge", async () => {
    const response = await GET(
      new Request(
        `${PUBLIC_ORIGIN}/api/auth/company/start?returnTo=%2Fexpenses`,
      ),
    );

    const transactionCookie = findCookie(response, TRANSACTION_COOKIE);
    expect(transactionCookie).toBeDefined();
    expect(transactionCookie).toMatch(/HttpOnly/i);
    expect(transactionCookie).toMatch(/SameSite=Lax/i);
    expect(transactionCookie).toMatch(/Path=\//);

    const transaction = decodeTransaction(
      cookieValue(transactionCookie as string),
    );
    expect(transaction.returnTo).toBe("/expenses");

    const location = new URL(response.headers.get("location") ?? "");
    expect(transaction.state).toBe(location.searchParams.get("state"));
    expect(transaction.nonce).toBe(location.searchParams.get("nonce"));

    // The authorize request's challenge must derive from the sealed verifier (S256).
    const expectedChallenge = createHash("sha256")
      .update(transaction.codeVerifier)
      .digest("base64url");
    expect(location.searchParams.get("code_challenge")).toBe(expectedChallenge);
  });
});
