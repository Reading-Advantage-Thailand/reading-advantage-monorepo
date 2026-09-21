// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ACCOUNTING_SESSION_COOKIE } from "./app/lib/company-oidc";
import { proxy } from "./proxy";

const ORIGIN = "http://localhost:3000";

function accountingRequest(pathname: string, withSession = false): NextRequest {
  return new NextRequest(`${ORIGIN}${pathname}`, {
    headers: withSession
      ? { cookie: `${ACCOUNTING_SESSION_COOKIE}=opaque-session-token` }
      : undefined,
  });
}

describe("accounting proxy", () => {
  it("redirects unauthenticated requests for protected pages to /login", async () => {
    const response = await proxy(accountingRequest("/expenses"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/login?returnTo=%2Fexpenses`,
    );
  });

  it("preserves the path and query in the returnTo parameter", async () => {
    const response = await proxy(accountingRequest("/expenses?month=2025-01"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnTo")).toBe(
      "/expenses?month=2025-01",
    );
  });

  it("passes through requests for protected pages when the session cookie is present", async () => {
    const response = await proxy(accountingRequest("/expenses", true));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    "/login",
    "/api/auth/session",
    "/_next/static/chunks/main.js",
    "/favicon.ico",
  ])(
    "passes through requests to %s without a session cookie",
    async (pathname) => {
      const response = await proxy(accountingRequest(pathname));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );
});
