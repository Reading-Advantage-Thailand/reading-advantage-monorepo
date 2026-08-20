// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as callbackGET } from "@/app/api/auth/callback/route";
import { GET as startGET } from "@/app/api/auth/company/start/route";
import {
  CLIENT_ID,
  CLIENT_SECRET,
  cookieValue,
  decodeTransaction,
  findCookie,
  installIdpFetchDouble,
  OPAQUE_ACCESS_TOKEN,
  PUBLIC_ORIGIN,
  SESSION_COOKIE,
  setCompanyAuthEnv,
  TRANSACTION_COOKIE,
  uninstallIdpFetchDouble,
  type IdpDouble,
  type SealedTransactionClaims,
} from "@/app/lib/__tests__/company-oidc-idp-double";

const AUTHORIZATION_CODE = "accounts-authorization-code-1";

/** Runs the real start handoff to obtain a genuine sealed transaction. */
async function beginTransaction(returnTo = "/expenses"): Promise<{
  readonly sealed: string;
  readonly state: string;
  readonly transaction: SealedTransactionClaims;
}> {
  const response = await startGET(
    new Request(
      `${PUBLIC_ORIGIN}/api/auth/company/start?returnTo=${encodeURIComponent(returnTo)}`,
    ),
  );
  const transactionCookie = findCookie(response, TRANSACTION_COOKIE);
  if (!transactionCookie) {
    throw new Error("start route did not seal an authorization transaction");
  }
  const sealed = cookieValue(transactionCookie);
  const location = new URL(response.headers.get("location") ?? "");
  return {
    sealed,
    state: location.searchParams.get("state") ?? "",
    transaction: decodeTransaction(sealed),
  };
}

function callbackRequest(
  code: string,
  state: string,
  sealed?: string,
): Request {
  return new Request(
    `${PUBLIC_ORIGIN}/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    sealed
      ? { headers: { cookie: `${TRANSACTION_COOKIE}=${sealed}` } }
      : undefined,
  );
}

describe("GET /api/auth/callback", () => {
  let idp: IdpDouble;

  beforeAll(() => {
    setCompanyAuthEnv();
    idp = installIdpFetchDouble();
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
  });

  it("exchanges the code, sets an HttpOnly session cookie, clears the transaction, and redirects to returnTo", async () => {
    const { sealed, state, transaction } = await beginTransaction("/expenses");
    idp.prepareCodeExchange({ nonce: transaction.nonce, roles: ["STAFF"] });
    const tokenCallsBefore = idp.tokenRequests.length;

    const response = await callbackGET(
      callbackRequest(AUTHORIZATION_CODE, state, sealed),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${PUBLIC_ORIGIN}/expenses`);

    // The token call is bound to the sealed PKCE verifier and the confidential client.
    expect(idp.tokenRequests).toHaveLength(tokenCallsBefore + 1);
    const tokenRequest = idp.tokenRequests[idp.tokenRequests.length - 1];
    expect(tokenRequest?.grantType).toBe("authorization_code");
    expect(tokenRequest?.code).toBe(AUTHORIZATION_CODE);
    expect(tokenRequest?.codeVerifier).toBe(transaction.codeVerifier);
    expect(tokenRequest?.authorization).toBe(
      `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    );

    const sessionCookie = findCookie(response, SESSION_COOKIE);
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/SameSite=Lax/i);
    expect(cookieValue(sessionCookie as string)).toBe(OPAQUE_ACCESS_TOKEN);

    const clearedTransaction = findCookie(response, TRANSACTION_COOKIE);
    expect(clearedTransaction).toBeDefined();
    expect(cookieValue(clearedTransaction as string)).toBe("");
  });

  it("rejects the callback when the transaction cookie is missing", async () => {
    const tokenCallsBefore = idp.tokenRequests.length;

    const response = await callbackGET(
      callbackRequest(AUTHORIZATION_CODE, "any-state"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=sso`,
    );
    expect(findCookie(response, SESSION_COOKIE)).toBeUndefined();
    expect(idp.tokenRequests).toHaveLength(tokenCallsBefore);
  });

  it("rejects the callback when the state does not match the sealed transaction", async () => {
    const { sealed } = await beginTransaction();
    const tokenCallsBefore = idp.tokenRequests.length;

    const response = await callbackGET(
      callbackRequest(AUTHORIZATION_CODE, "forged-state-value", sealed),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=sso`,
    );
    expect(findCookie(response, SESSION_COOKIE)).toBeUndefined();
    expect(idp.tokenRequests).toHaveLength(tokenCallsBefore);
  });

  it("rejects the callback when the transaction cookie was tampered with", async () => {
    const tokenCallsBefore = idp.tokenRequests.length;

    const response = await callbackGET(
      callbackRequest(
        AUTHORIZATION_CODE,
        "any-state",
        "dGFtcGVyZWQ.forged-signature",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=sso`,
    );
    expect(findCookie(response, SESSION_COOKIE)).toBeUndefined();
    expect(idp.tokenRequests).toHaveLength(tokenCallsBefore);
  });
});
