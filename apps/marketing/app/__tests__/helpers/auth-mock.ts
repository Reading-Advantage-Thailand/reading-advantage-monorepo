/**
 * Reusable auth-mock helper for marketing route tests.
 *
 * Several pre-existing marketing route tests (phase-3/4/5/6/8) call route
 * handlers without setting a session cookie. Now that the routes require
 * authentication (Phase 2A/2B/2C of wave3_product_alignment_20260628), the
 * tests need a working session seam that resolves a synthetic ADMIN user
 * for the known token only.
 *
 * This module installs a `vi.mock("@reading-advantage/auth", ...)` factory
 * at module-load time (the mock call is hoisted by Vitest) that keeps the
 * real `AuthError`, `SESSION_COOKIE_NAME`, and friends, but stubs
 * `validateSession`, `getSession`, and `requireAuth` so that:
 *   - the known token (`KNOWN_TOKEN`) resolves to a synthetic ADMIN session
 *   - an empty/missing/unknown token returns null / throws UNAUTHORIZED
 *
 * Test files `import { authedRequest, KNOWN_TOKEN } from "./helpers/auth-mock"`
 * to build requests with a `session_token=<known>` cookie. The mock is
 * registered as a side-effect of importing this module — no separate
 * `applyAuthMock()` call needed.
 *
 * Phase 2 Red tests assert the auth boundary with the same known-token
 * pattern, so the mock is intentionally strict rather than permissive.
 */
import { SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { vi } from "vitest";

/** Known session token shared across all marketing route tests. */
export const KNOWN_TOKEN = "w3-known-session-token";

const SYNTHETIC_SESSION = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000002",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  user: {
    id: "00000000-0000-0000-0000-000000000002",
    username: "staff",
    name: "Staff User",
    role: "ADMIN",
    schoolId: "00000000-0000-0000-0000-000000000003",
    xp: 0,
    level: 1,
    cefrLevel: "B2",
  },
};

// Module-level vi.mock — Vitest hoists it to the top of every importing
// test file, so the auth module is mocked before any other import resolves.
// Only the known token resolves to a session; missing/unknown tokens resolve
// to null, preserving the negative/positive control pairing for auth tests.
vi.mock("@reading-advantage/auth", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/auth")>(
      "@reading-advantage/auth",
    );
  const validateSession = vi.fn(
    async (_db: unknown, token: string): Promise<unknown | null> => {
      if (token === KNOWN_TOKEN) {
        return SYNTHETIC_SESSION;
      }
      return null;
    },
  );
  const getSession = async (
    dbArg: unknown,
    token: string | undefined,
  ) => {
    if (!token) return null;
    return validateSession(dbArg, token);
  };
  const requireAuthImpl = async (
    dbArg: unknown,
    token: string | undefined,
  ) => {
    const session = await getSession(dbArg, token);
    if (!session) {
      throw new actual.AuthError("Authentication required", "UNAUTHORIZED");
    }
    return session;
  };
  return {
    ...actual,
    validateSession,
    getSession,
    requireAuth: requireAuthImpl,
  };
});

/**
 * Attach a synthetic session cookie to an existing `RequestInit` so the
 * request satisfies the auth guard.
 */
export function authedInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Cookie: `${SESSION_COOKIE_NAME}=${KNOWN_TOKEN}`,
    },
  };
}

/**
 * Build an `authed` `Request` directly.
 */
export function authedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, authedInit(init));
}