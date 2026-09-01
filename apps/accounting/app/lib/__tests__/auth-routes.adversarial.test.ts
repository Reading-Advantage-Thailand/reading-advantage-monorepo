// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GET as callbackGET } from "@/app/api/auth/callback/route";
import { GET as startGET } from "@/app/api/auth/company/start/route";
import { GET as sessionGET } from "@/app/api/auth/session/route";
import {
  cookieValue,
  decodeTransaction,
  findCookie,
  installIdpFetchDouble,
  PUBLIC_ORIGIN,
  SESSION_COOKIE,
  setCompanyAuthEnv,
  testIdentity,
  TRANSACTION_COOKIE,
  uninstallIdpFetchDouble,
  type IdpDouble,
  type SealedTransactionClaims,
} from "@/app/lib/__tests__/company-oidc-idp-double";

const AUTHORIZATION_CODE = "adversarial-authorization-code";
const ACTIVE_EXPIRY = "2030-01-01T00:00:00.000Z";

/** Begins an authorization handoff and returns its sealed transaction claims. */
async function beginTransaction(
  returnTo = "/expenses",
): Promise<{ readonly sealed: string; readonly transaction: SealedTransactionClaims }> {
  const startUrl = new URL("/api/auth/company/start", PUBLIC_ORIGIN);
  startUrl.searchParams.set("returnTo", returnTo);
  const response = await startGET(new Request(startUrl));
  const transactionCookie = findCookie(response, TRANSACTION_COOKIE);
  if (!transactionCookie) {
    throw new Error("start route did not set an authorization transaction");
  }
  return {
    sealed: cookieValue(transactionCookie),
    transaction: decodeTransaction(cookieValue(transactionCookie)),
  };
}

/** Builds an Accounting callback request with optional callback parameters. */
function callbackRequest(input: {
  readonly code?: string;
  readonly sealedTransaction?: string;
  readonly state?: string;
}): Request {
  const url = new URL("/api/auth/callback", PUBLIC_ORIGIN);
  if (input.code !== undefined) url.searchParams.set("code", input.code);
  if (input.state !== undefined) url.searchParams.set("state", input.state);
  return new Request(url, {
    headers: input.sealedTransaction
      ? { cookie: `${TRANSACTION_COOKIE}=${input.sealedTransaction}` }
      : undefined,
  });
}

/** Verifies that a failed callback leaves no live session or transaction cookie. */
function expectExpiredTransactionWithoutSession(response: Response): void {
  const transactionCookie = findCookie(response, TRANSACTION_COOKIE);
  expect(transactionCookie).toBeDefined();
  expect(cookieValue(transactionCookie as string)).toBe("");
  expect(transactionCookie).toMatch(/Max-Age=0/u);
  expect(transactionCookie).toMatch(
    /Expires=Thu, 01 Jan 1970 00:00:00 GMT/u,
  );
  expect(findCookie(response, SESSION_COOKIE)).toBeUndefined();
}

/** Creates a session route request with an optional session cookie. */
function sessionRequest(withCookie = true): Request {
  return new Request(`${PUBLIC_ORIGIN}/api/auth/session`, {
    headers: withCookie
      ? { cookie: `${SESSION_COOKIE}=adversarial-session-token` }
      : undefined,
  });
}

describe("Accounting auth-route adversarial cases", () => {
  let idp: IdpDouble;

  beforeAll(() => {
    setCompanyAuthEnv();
    idp = installIdpFetchDouble();
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
    vi.unstubAllEnvs();
  });

  it.each([
    ["protocol-relative URL", "//evil.example.com"],
    ["encoded protocol-relative URL", "%2F%2Fevil.example.com"],
    ["backslash path", "/\\evil.example.com"],
    ["JavaScript URL", "javascript:alert(1)"],
    ["ASCII control character", "/safe\u0000path"],
    ["Unicode bidi control", "/safe\u202Eevil"],
    ["overlong path", `/${"x".repeat(2_049)}`],
  ])("restarts an unsafe %s with the root return path", async (_name, returnTo) => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const startUrl = new URL("/api/auth/company/start", PUBLIC_ORIGIN);
      startUrl.searchParams.set("returnTo", returnTo);

      const response = await startGET(new Request(startUrl));

      expect(response.status).toBe(307);
      expect(response.status).not.toBe(500);
      expect(response.headers.get("location")).toContain(
        "https://accounts.reading-advantage.test/api/oidc/authorize",
      );
      const transactionCookie = findCookie(response, TRANSACTION_COOKIE);
      expect(transactionCookie).toBeDefined();
      expect(
        decodeTransaction(cookieValue(transactionCookie as string)).returnTo,
      ).toBe("/");
      expect(consoleWarn).toHaveBeenCalledTimes(1);
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it.each([
    [
      "missing transaction",
      { code: AUTHORIZATION_CODE, state: "state" },
      false,
    ],
    ["missing code", { state: "state" }, true],
    ["missing state", { code: AUTHORIZATION_CODE }, true],
  ])("expires the transaction for a %s callback failure", async (_name, input, sendTransaction) => {
    const { sealed } = await beginTransaction();
    const response = await callbackGET(
      callbackRequest({
        ...input,
        ...(sendTransaction ? { sealedTransaction: sealed } : {}),
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=sso`,
    );
    expectExpiredTransactionWithoutSession(response);
  });

  it("expires the transaction when the token exchange rejects", async () => {
    const { sealed, transaction } = await beginTransaction();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await callbackGET(
        callbackRequest({
          code: AUTHORIZATION_CODE,
          sealedTransaction: sealed,
          state: transaction.state,
        }),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `${PUBLIC_ORIGIN}/login?error=sso`,
      );
      expectExpiredTransactionWithoutSession(response);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("expires the transaction for a malformed callback state", async () => {
    const { sealed } = await beginTransaction();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await callbackGET(
        callbackRequest({
          code: AUTHORIZATION_CODE,
          sealedTransaction: sealed,
          state: "\u0000malformed-state",
        }),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `${PUBLIC_ORIGIN}/login?error=sso`,
      );
      expectExpiredTransactionWithoutSession(response);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("expires the transaction and withholds a session after role denial", async () => {
    const { sealed, transaction } = await beginTransaction();
    idp.prepareCodeExchange({ nonce: transaction.nonce, roles: ["MEMBER"] });

    const response = await callbackGET(
      callbackRequest({
        code: AUTHORIZATION_CODE,
        sealedTransaction: sealed,
        state: transaction.state,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?error=forbidden`,
    );
    expectExpiredTransactionWithoutSession(response);
  });

  it("returns exact 401, 403, and 200 session response shapes", async () => {
    const missingResponse = await sessionGET(sessionRequest(false));
    expect(missingResponse.status).toBe(401);
    await expect(missingResponse.json()).resolves.toEqual({ session: null });

    idp.setIntrospection({
      active: true,
      identity: testIdentity(["MEMBER"]),
      expiresAt: ACTIVE_EXPIRY,
    });
    const deniedResponse = await sessionGET(sessionRequest());
    expect(deniedResponse.status).toBe(403);
    await expect(deniedResponse.json()).resolves.toEqual({
      session: null,
      denied: true,
    });

    idp.setIntrospection({
      active: true,
      identity: testIdentity(["STAFF"]),
      expiresAt: ACTIVE_EXPIRY,
    });
    const allowedResponse = await sessionGET(sessionRequest());
    expect(allowedResponse.status).toBe(200);
    await expect(allowedResponse.json()).resolves.toEqual({
      session: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          username: "accounting-user",
          name: "Accounting User",
          role: "STAFF",
          organizationId: "33333333-3333-4333-8333-333333333333",
          schoolId: null,
          xp: 0,
          level: 1,
          cefrLevel: "N/A",
          applicationRoles: ["STAFF"],
        },
      },
    });
  });
});
