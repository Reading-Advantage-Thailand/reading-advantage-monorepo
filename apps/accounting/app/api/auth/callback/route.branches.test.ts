// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  logout: vi.fn(),
  readAccountingCookie: vi.fn(),
  resolveAccountingRole: vi.fn(),
  getPublicOrigin: vi.fn(),
  getAccountingCallbackOrigin: vi.fn(),
  logStructuredError: vi.fn(),
}));

vi.mock("@/app/lib/company-oidc", () => ({
  ACCOUNTING_SESSION_COOKIE: "accounting_session",
  ACCOUNTING_TRANSACTION_COOKIE: "accounting_tx",
  getAccountingOidcClient: () => ({
    exchange: mocks.exchange,
    logout: mocks.logout,
  }),
  readAccountingCookie: mocks.readAccountingCookie,
  resolveAccountingRole: mocks.resolveAccountingRole,
}));
vi.mock("@/app/lib/public-url", () => ({
  getPublicOrigin: mocks.getPublicOrigin,
  getAccountingCallbackOrigin: mocks.getAccountingCallbackOrigin,
}));
vi.mock("@reading-advantage/utils/structured-error", () => ({
  logStructuredError: mocks.logStructuredError,
}));

import { GET } from "@/app/api/auth/callback/route";

const NOW = new Date("2026-11-03T00:00:00.000Z");

/**
 * Builds a callback request with the given query string.
 * @param query Raw query string without the question mark.
 * @returns The callback request.
 */
function callback(query = "code=c1&state=s1"): Request {
  return new Request(`https://accounting.test/api/auth/callback?${query}`);
}

/**
 * Prepares a successful code exchange.
 * @param overrides Session fields to replace.
 */
function exchangeReturns(overrides: Record<string, unknown> = {}): void {
  mocks.exchange.mockResolvedValue({
    accessToken: "opaque-access",
    returnTo: "/history",
    expiresAt: "2026-11-03T01:00:00.000Z",
    identity: { roles: ["OWNER"] },
    ...overrides,
  });
}

describe("GET /api/auth/callback branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.getPublicOrigin.mockReturnValue(new URL("https://accounting.test"));
    mocks.readAccountingCookie.mockReturnValue("sealed-transaction");
    mocks.resolveAccountingRole.mockReturnValue("OWNER");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("revokes the session and redirects a no-role identity to forbidden", async () => {
    exchangeReturns({ identity: { roles: ["MEMBER"] } });
    mocks.resolveAccountingRole.mockReturnValue(null);
    mocks.logout.mockResolvedValue(undefined);

    const response = await GET(callback());

    expect(response.headers.get("location")).toBe(
      "https://accounting.test/login?error=forbidden",
    );
    expect(mocks.resolveAccountingRole).toHaveBeenCalledWith(["MEMBER"]);
    expect(mocks.logout).toHaveBeenCalledWith("opaque-access");
    expect(response.cookies.get("accounting_session")).toBeUndefined();
    expect(response.cookies.get("accounting_tx")?.value).toBe("");
    expect(mocks.logStructuredError).not.toHaveBeenCalled();
  });

  it("still denies and sets no session when revocation fails", async () => {
    exchangeReturns({ identity: { roles: [] } });
    mocks.resolveAccountingRole.mockReturnValue(null);
    const failure = new Error("accounts revocation unavailable");
    mocks.logout.mockRejectedValue(failure);

    const response = await GET(callback());

    expect(response.headers.get("location")).toBe(
      "https://accounting.test/login?error=forbidden",
    );
    expect(response.cookies.get("accounting_session")).toBeUndefined();
    expect(mocks.logStructuredError).toHaveBeenCalledWith({
      event: "accounting_callback_revocation_error",
      error: failure,
    });
  });

  it("falls back to the callback origin when the public origin is invalid", async () => {
    mocks.getPublicOrigin.mockImplementation(() => {
      throw new Error("untrusted host");
    });
    mocks.getAccountingCallbackOrigin.mockReturnValue(
      new URL("https://fallback.accounting.test"),
    );

    const response = await GET(callback("state=s1"));

    expect(response.headers.get("location")).toBe(
      "https://fallback.accounting.test/login?error=sso",
    );
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing code", "state=s1", "sealed"],
    ["a missing state", "code=c1", "sealed"],
    ["a missing transaction cookie", "code=c1&state=s1", undefined],
  ])("redirects to sso for %s", async (_label, query, transaction) => {
    mocks.readAccountingCookie.mockReturnValue(transaction);

    const response = await GET(callback(query));

    expect(response.headers.get("location")).toBe(
      "https://accounting.test/login?error=sso",
    );
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("sets the session cookie lifetime from the session expiry", async () => {
    exchangeReturns({ expiresAt: "2026-11-03T01:00:00.900Z" });

    const response = await GET(callback());

    expect(response.headers.get("location")).toBe(
      "https://accounting.test/history",
    );
    const cookie = response.cookies.get("accounting_session");
    expect(cookie).toMatchObject({
      value: "opaque-access",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    expect(mocks.exchange).toHaveBeenCalledWith({
      code: "c1",
      state: "s1",
      sealedTransaction: "sealed-transaction",
    });
  });

  it("keeps a one-second minimum lifetime for an already expired session", async () => {
    exchangeReturns({ expiresAt: "2026-11-02T00:00:00.000Z" });

    const response = await GET(callback());

    expect(response.cookies.get("accounting_session")?.maxAge).toBe(1);
  });

  it("marks cookies not secure for an http origin outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mocks.getPublicOrigin.mockReturnValue(new URL("http://localhost:3010"));
    exchangeReturns();

    const response = await GET(callback());

    expect(response.cookies.get("accounting_session")?.secure).toBe(false);
    vi.unstubAllEnvs();
  });

  it("marks cookies secure in production even on an http origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getPublicOrigin.mockReturnValue(new URL("http://localhost:3010"));
    exchangeReturns();

    const response = await GET(callback());

    expect(response.cookies.get("accounting_session")?.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  it("logs the request id and redirects to sso when the exchange fails", async () => {
    const failure = new Error("state mismatch");
    mocks.exchange.mockRejectedValue(failure);

    const response = await GET(
      new Request("https://accounting.test/api/auth/callback?code=c1&state=s1", {
        headers: { "x-request-id": "req-7" },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://accounting.test/login?error=sso",
    );
    expect(response.cookies.get("accounting_session")).toBeUndefined();
    expect(mocks.logStructuredError).toHaveBeenCalledWith({
      event: "accounting_oidc_callback_failed",
      requestId: "req-7",
      error: failure,
      fields: { method: "GET", route: "/api/auth/callback" },
    });
  });
});
