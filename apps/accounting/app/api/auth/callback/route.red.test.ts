// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as callbackGET } from "@/app/api/auth/callback/route";
import { GET as startGET } from "@/app/api/auth/company/start/route";
import {
  cookieValue,
  decodeTransaction,
  findCookie,
  installIdpFetchDouble,
  PUBLIC_ORIGIN,
  SESSION_COOKIE,
  setCompanyAuthEnv,
  TRANSACTION_COOKIE,
  uninstallIdpFetchDouble,
  type IdpDouble,
  type SealedTransactionClaims,
} from "@/app/lib/__tests__/company-oidc-idp-double";

const AUTHORIZATION_CODE = "accounts-authorization-code-1";

async function beginTransaction(
  returnTo = "/expenses",
): Promise<{ sealed: string; state: string; transaction: SealedTransactionClaims }> {
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

describe("GET /api/auth/callback (Accounting parity)", () => {
  let idp: IdpDouble;

  beforeAll(() => {
    setCompanyAuthEnv();
    idp = installIdpFetchDouble();
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
  });

  it("redirects a no-role identity to /login?error=forbidden after exchange", async () => {
    const { sealed, state, transaction } = await beginTransaction("/expenses");
    idp.prepareCodeExchange({ nonce: transaction.nonce, roles: ["MEMBER"] });

    const response = await callbackGET(
      callbackRequest(AUTHORIZATION_CODE, state, sealed),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=forbidden`,
    );
    expect(findCookie(response, SESSION_COOKIE)).toBeUndefined();
    expect(findCookie(response, TRANSACTION_COOKIE)).toBeDefined();
  });

  it("expires the transaction cookie on the missing-transaction failure path", async () => {
    const response = await callbackGET(
      callbackRequest(AUTHORIZATION_CODE, "any-state"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=sso`,
    );
    const cleared = findCookie(response, TRANSACTION_COOKIE);
    expect(cleared).toBeDefined();
    expect(cookieValue(cleared as string)).toBe("");
  });

  it("expires the transaction cookie when the exchange fails", async () => {
    const { sealed } = await beginTransaction("/expenses");

    const response = await callbackGET(
      callbackRequest(AUTHORIZATION_CODE, "wrong-state", sealed),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=sso`,
    );
    const cleared = findCookie(response, TRANSACTION_COOKIE);
    expect(cleared).toBeDefined();
    expect(cookieValue(cleared as string)).toBe("");
  });
});
