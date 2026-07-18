/**
 * Reusable auth-mock helper for marketing route tests.
 *
 * Several pre-existing marketing route tests (phase-3/4/5/6/8) call route
 * handlers without setting a session cookie. Now that the routes require
 * authentication (Phase 2A/2B/2C of wave3_product_alignment_20260628), the
 * tests need a working session seam that resolves a synthetic ADMIN user
 * for the known token only.
 *
 * This module installs a `vi.mock("@/lib/company-oidc", ...)` factory at
 * module-load time (the mock call is hoisted by Vitest) and stubs Accounts
 * token introspection so that:
 *   - the known token (`KNOWN_TOKEN`) resolves to a synthetic ADMIN session
 *   - an empty/missing/unknown token returns null
 *
 * Test files `import { authedRequest, KNOWN_TOKEN } from "./helpers/auth-mock"`
 * to build requests with the host-only Marketing session cookie. The mock is
 * registered as a side-effect of importing this module — no separate
 * `applyAuthMock()` call needed.
 *
 * Phase 2 Red tests assert the auth boundary with the same known-token
 * pattern, so the mock is intentionally strict rather than permissive.
 */
import { vi } from "vitest";

/** Known session token shared across all marketing route tests. */
export const KNOWN_TOKEN = "w3-known-session-token";

const { introspectMarketingSession } = vi.hoisted(() => ({
  introspectMarketingSession: vi.fn(async (token: string) =>
    token === "w3-known-session-token"
      ? {
          identity: {
            sub: "00000000-0000-4000-8000-000000000002",
            aud: "marketing",
            sid: "00000000-0000-4000-8000-000000000001",
            organizationId: "00000000-0000-4000-8000-000000000003",
            organizationKey: "reading-advantage",
            status: "ACTIVE" as const,
            roles: ["ADMIN"],
            authVersion: 1,
          },
          expiresAt: "2030-01-01T00:00:00.000Z",
        }
      : null),
}));

/** Spy for Accounts-backed Marketing application-session introspection. */
export { introspectMarketingSession };

// Module-level vi.mock — Vitest hoists it to the top of every importing
// test file, so the auth module is mocked before any other import resolves.
// Only the known token resolves to a session; missing/unknown tokens resolve
// to null, preserving the negative/positive control pairing for auth tests.
vi.mock("@/lib/company-oidc", async () => {
  const actual = await vi.importActual<typeof import("@/lib/company-oidc")>(
    "@/lib/company-oidc",
  );
  return {
    ...actual,
    getMarketingOidcClient: () => ({
      introspect: introspectMarketingSession,
    }),
  };
});

/**
 * Attaches a synthetic administrator session cookie to request options.
 * @param init The request options to extend.
 * @returns Request options containing the known test session cookie.
 */
export function authedInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Cookie: `__Host-ra_marketing_session=${KNOWN_TOKEN}`,
    },
  };
}

/**
 * Builds a request carrying the synthetic administrator session cookie.
 * @param url The request URL.
 * @param init Optional request configuration.
 * @returns A request accepted by the Marketing compatibility guard.
 */
export function authedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, authedInit(init));
}
