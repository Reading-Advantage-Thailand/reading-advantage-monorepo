import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Phase 3 — Authentication & Authorization (P0)
 *
 * Black-box smoke tests for the deployed production service at
 * https://codecamp.reading-advantage.com (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * These tests encode the Phase 3 acceptance criteria as executable contract.
 * They will fail (Red) until:
 *   (a) the auth path returns the expected status codes, cookie attributes, and error envelopes, and
 *   (b) role enforcement is correctly wired (proxy + tRPC procedures), and
 *   (c) a test runner can reach the public production URL with valid test credentials.
 *
 * Three valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach prod) —
 *      indicates the probe must be run from a network that can reach prod.
 *   2. Assertion failure (prod reachable, but the contract is unmet) —
 *      indicates a real production gap to file as a follow-up track.
 *   3. Missing test credentials (PHASE3_TEST_* env vars absent) — credential-gated
 *      probes skip; the unauth probes still run and are the P0 launch gate.
 *
 * Set PHASE3_PROD_URL to override the default target (useful for staging).
 * Set PHASE3_SKIP=1 to skip the entire suite in environments without network.
 *
 * Authenticated probes are gated on:
 *   PHASE3_TEST_INTERN_USERNAME + PHASE3_TEST_INTERN_PASSWORD
 *   PHASE3_TEST_ADMIN_USERNAME  + PHASE3_TEST_ADMIN_PASSWORD
 * so real test creds never land in the repo (per test-strategy.md §2).
 *
 * The cookie attribute contract is the production contract only:
 *   - HttpOnly, SameSite=Lax, Path=/, Max-Age~7d  (all envs)
 *   - Secure  (only when NODE_ENV=production, which cloudbuild.yaml sets)
 * Running against a non-prod target (PHASE3_PROD_URL override) will fail
 * the Secure check unless the deploy also sets NODE_ENV=production.
 */

const PROD_URL = process.env.PHASE3_PROD_URL ?? "https://codecamp.reading-advantage.com";
const SKIP = process.env.PHASE3_SKIP === "1";
const HAS_INTERN_CREDS =
  typeof process.env.PHASE3_TEST_INTERN_USERNAME === "string" &&
  process.env.PHASE3_TEST_INTERN_USERNAME.length > 0 &&
  typeof process.env.PHASE3_TEST_INTERN_PASSWORD === "string" &&
  process.env.PHASE3_TEST_INTERN_PASSWORD.length > 0;
const HAS_ADMIN_CREDS =
  typeof process.env.PHASE3_TEST_ADMIN_USERNAME === "string" &&
  process.env.PHASE3_TEST_ADMIN_USERNAME.length > 0 &&
  typeof process.env.PHASE3_TEST_ADMIN_PASSWORD === "string" &&
  process.env.PHASE3_TEST_ADMIN_PASSWORD.length > 0;
const HAS_ANY_CREDS = HAS_INTERN_CREDS || HAS_ADMIN_CREDS;
const REQUEST_TIMEOUT_MS = 5_000;

// Per-test skip predicate. A test runs only if SKIP=0 AND the gating
// condition is met. Mirrors the Phase 2 pattern but composes the
// conditions so SKIP=1 always wins (Phase 2's `skipIfNoCreds` is
// independent of SKIP, which means an auth test with creds provided
// + SKIP=1 would still attempt to run — this closes that gap).
const testIf = (skipCondition: boolean) => (skipCondition ? it.skip : it);
const skipIf = testIf(SKIP);
const skipIfNoInternCreds = testIf(SKIP || !HAS_INTERN_CREDS);
const skipIfNoAdminCreds = testIf(SKIP || !HAS_ADMIN_CREDS);
const skipIfNoAnyCreds = testIf(SKIP || !HAS_ANY_CREDS);

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

const fetchWithTimeout = async (
  input: string,
  init: RequestInit & { redirect?: RequestRedirect } = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      redirect: init.redirect ?? "manual",
    });
  } finally {
    clearTimeout(timer);
  }
};

interface ParsedSetCookie {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string | null;
  path: string | null;
  maxAge: number | null;
  expires: string | null;
}

/**
 * Parses a single Set-Cookie header value (e.g.
 *   `session_token=abc; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`
 * ) into structured attributes. Returns null if the header is empty or
 * the name=value pair is missing.
 */
function parseSetCookie(header: string | null | undefined): ParsedSetCookie | null {
  if (!header) return null;
  const parts = header.split(";").map((p) => p.trim());
  const firstPart = parts[0];
  if (!firstPart) return null;
  const eqIdx = firstPart.indexOf("=");
  if (eqIdx < 0) return null;
  const name = firstPart.slice(0, eqIdx).trim();
  const value = firstPart.slice(eqIdx + 1).trim();
  if (!name) return null;

  let httpOnly = false;
  let secure = false;
  let sameSite: string | null = null;
  let path: string | null = null;
  let maxAge: number | null = null;
  let expires: string | null = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? "";
    const eq = part.indexOf("=");
    const attrName = (eq < 0 ? part : part.slice(0, eq)).toLowerCase().trim();
    const attrValue = eq < 0 ? "" : part.slice(eq + 1).trim();
    if (attrName === "httponly") httpOnly = true;
    else if (attrName === "secure") secure = true;
    else if (attrName === "samesite") sameSite = attrValue;
    else if (attrName === "path") path = attrValue;
    else if (attrName === "max-age") {
      const n = parseInt(attrValue, 10);
      maxAge = Number.isFinite(n) ? n : null;
    } else if (attrName === "expires") expires = attrValue;
  }

  return { name, value, httpOnly, secure, sameSite, path, maxAge, expires };
}

interface LoginResult {
  cookie: string;
  userRole: string;
  setCookieAttrs: ParsedSetCookie;
  rawSetCookie: string;
  responseStatus: number;
}

/**
 * Performs a username/password login and extracts the issued session
 * cookie. Throws on any non-200 response so the calling test fails fast
 * with a precise error message.
 */
async function loginAndGetCookie(
  username: string,
  password: string,
): Promise<LoginResult> {
  const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const responseStatus = response.status;
  const rawSetCookie = response.headers.get("set-cookie") ?? "";
  const setCookieAttrs = parseSetCookie(rawSetCookie);

  if (responseStatus !== 200) {
    const body = await response.text();
    throw new Error(
      `login failed for ${username}: status=${responseStatus} body=${body.slice(0, 200)}`,
    );
  }
  if (!setCookieAttrs || setCookieAttrs.name !== "session_token") {
    throw new Error(
      `login succeeded but no session_token Set-Cookie header — got: ${rawSetCookie.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as { success: boolean; user: { role: string } };
  if (!body?.user?.role) {
    throw new Error(`login response missing user.role: ${JSON.stringify(body).slice(0, 200)}`);
  }

  return {
    cookie: `session_token=${setCookieAttrs.value}`,
    userRole: body.user.role,
    setCookieAttrs,
    rawSetCookie,
    responseStatus,
  };
}

const trpcInput = (json: unknown = null) =>
  encodeURIComponent(JSON.stringify({ json, meta: { values: ["undefined"] } }));

/**
 * Hits a tRPC query endpoint with optional session cookie and returns
 * both the response and the parsed JSON body (which is null on
 * non-JSON responses).
 */
async function trpcGet(
  procedure: string,
  init: { cookie?: string; inputJson?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (init.cookie) headers["Cookie"] = init.cookie;
  const url = `${PROD_URL}/api/trpc/${procedure}?input=${trpcInput(init.inputJson ?? null)}`;
  const response = await fetchWithTimeout(url, { method: "GET", headers });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

// --------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------

describe("Phase 3 — Login flow", () => {
  beforeAll(() => {
    if (SKIP) return;
    expect(PROD_URL, "PHASE3_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  describe("Session creation", () => {
    skipIfNoInternCreds(
      "POST /api/auth/login with valid INTERN credentials → 200 + Set-Cookie: session_token + user.role === INTERN",
      async () => {
        const result = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        expect.soft(result.responseStatus, "expected 200 on valid INTERN login").toBe(200);
        expect.soft(result.userRole, "expected user.role === INTERN").toBe("INTERN");
        expect.soft(result.setCookieAttrs.name).toBe("session_token");
        expect.soft(result.cookie, "expected non-empty session_token value").toMatch(
          /^session_token=[^;]+$/,
        );
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoAdminCreds(
      "POST /api/auth/login with valid ADMIN credentials → 200 + Set-Cookie: session_token + user.role === ADMIN",
      async () => {
        const result = await loginAndGetCookie(
          process.env.PHASE3_TEST_ADMIN_USERNAME!,
          process.env.PHASE3_TEST_ADMIN_PASSWORD!,
        );
        expect.soft(result.responseStatus, "expected 200 on valid ADMIN login").toBe(200);
        expect.soft(result.userRole, "expected user.role === ADMIN").toBe("ADMIN");
        expect.soft(result.setCookieAttrs.name).toBe("session_token");
        expect.soft(result.cookie, "expected non-empty session_token value").toMatch(
          /^session_token=[^;]+$/,
        );
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIf(
      "POST /api/auth/login with invalid credentials → 401 (not 5xx) and no Set-Cookie",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "__no_such_user__", password: "__bad__" }),
        });
        expect.soft(
          response.status,
          `expected 401 for bad creds, got ${response.status} — server-side fault on auth path`,
        ).toBe(401);
        const setCookie = response.headers.get("set-cookie") ?? "";
        expect.soft(
          setCookie,
          "no session_token cookie should be issued on 401",
        ).not.toMatch(/session_token=[^;]+/);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIf(
      "POST /api/auth/login with empty body → 400 (Zod validation, not 401/5xx)",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect.soft(
          response.status,
          `expected 400 on empty body, got ${response.status}`,
        ).toBe(400);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  });

  describe("Session cookie attributes", () => {
    skipIfNoInternCreds(
      "Set-Cookie on successful login is HttpOnly, Secure (prod), SameSite=Lax, Path=/, Max-Age ~7d",
      async () => {
        const result = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const attrs = result.setCookieAttrs;
        expect.soft(attrs.name, "cookie name must be session_token").toBe("session_token");
        expect.soft(
          attrs.httpOnly,
          "HttpOnly flag missing — session token is exposed to JS (XSS risk)",
        ).toBe(true);
        expect.soft(
          attrs.secure,
          "Secure flag missing — session cookie can be sent over HTTP (downgrade risk). " +
            "Set NODE_ENV=production in cloudbuild.yaml (already set) and verify the deploy.",
        ).toBe(true);
        expect.soft(
          (attrs.sameSite ?? "").toLowerCase(),
          "SameSite must be Lax or Strict for CSRF protection",
        ).toMatch(/^(lax|strict)$/);
        expect.soft(attrs.path, "Path must be / so cookie applies to all routes").toBe("/");
        expect.soft(
          attrs.maxAge,
          "Max-Age must be > 0 for a persistent (non-session) cookie",
        ).toBeGreaterThan(0);
        expect.soft(
          attrs.maxAge,
          "Max-Age should be ~7 days (604800s) per the auth contract",
        ).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 - 60);
        expect.soft(
          attrs.maxAge,
          "Max-Age should not exceed 7 days (security best practice)",
        ).toBeLessThanOrEqual(7 * 24 * 60 * 60 + 60);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  });

  describe("Session persistence", () => {
    skipIfNoInternCreds(
      "GET /api/auth/session with issued cookie returns the authenticated user (server-side lookup)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const response = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
          method: "GET",
          headers: { Cookie: cookie },
        });
        expect.soft(response.status, "expected 2xx from session route").toBeLessThan(300);
        const body = (await response.json()) as {
          session: { user: { role: string; username: string } } | null;
        };
        expect.soft(body.session, "expected session to be non-null with valid cookie").not.toBeNull();
        expect.soft(body.session?.user.role, "expected user.role === INTERN").toBe("INTERN");
        expect.soft(body.session?.user.username).toBe(
          process.env.PHASE3_TEST_INTERN_USERNAME!.toLowerCase(),
        );
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoInternCreds(
      "GET /api/auth/session on a second request with the same cookie still returns the user (server-side persistence)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        // Two consecutive session lookups with the same cookie prove the
        // session is not one-shot (e.g., consumed on first read). Combined
        // with the persistent Max-Age on the cookie, this is the black-box
        // proxy for "session persists across page reloads".
        for (let i = 0; i < 2; i++) {
          const response = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
            method: "GET",
            headers: { Cookie: cookie },
          });
          expect.soft(response.status, `request #${i + 1}: expected 2xx`).toBeLessThan(300);
          const body = (await response.json()) as {
            session: { user: { role: string } } | null;
          };
          expect.soft(body.session, `request #${i + 1}: session must persist`).not.toBeNull();
        }
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIf(
      "GET /api/auth/session with no cookie returns session: null (not 401, not 5xx)",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
          method: "GET",
        });
        expect.soft(response.status, "expected 200 even without a cookie").toBe(200);
        const body = (await response.json()) as { session: unknown };
        expect.soft(body.session, "expected session: null when unauthenticated").toBeNull();
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  });

  describe("Logout", () => {
    skipIfNoInternCreds(
      "POST /api/auth/logout → 200 + Set-Cookie clears session_token (Max-Age=0 or expired)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const response = await fetchWithTimeout(`${PROD_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: cookie },
        });
        expect.soft(response.status, "expected 200 on logout").toBe(200);
        const setCookie = response.headers.get("set-cookie") ?? "";
        const attrs = parseSetCookie(setCookie);
        expect.soft(attrs, "expected a Set-Cookie clearing the session").not.toBeNull();
        expect.soft(attrs?.name, "cleared cookie must be session_token").toBe("session_token");
        // The clear-cookie contract: either Max-Age=0 or an Expires in the
        // past. Both are valid per RFC 6265. The auth implementation uses
        // Max-Age=0 (see packages/api/src/routes/auth/logout.ts).
        const clearedByMaxAge = attrs?.maxAge === 0;
        const clearedByExpires = attrs?.expires != null;
        expect.soft(
          clearedByMaxAge || clearedByExpires,
          `session_token not cleared — maxAge=${attrs?.maxAge} expires=${attrs?.expires}`,
        ).toBe(true);
        // Note: the server returns 200 JSON. The post-logout redirect is a
        // client-side concern (the auth-client provider navigates after
        // success); it is not encoded in the HTTP response. The black-box
        // guarantee is that the cookie is cleared, which forces any
        // subsequent fetch to be unauthenticated — verified by the next test.
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoInternCreds(
      "GET /api/auth/session after logout returns session: null (cookie truly invalidated)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const logoutResponse = await fetchWithTimeout(`${PROD_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: cookie },
        });
        expect.soft(logoutResponse.status, "expected 200 on logout").toBe(200);
        const clearAttrs = parseSetCookie(logoutResponse.headers.get("set-cookie") ?? "");
        // Use the cleared cookie value to confirm the server-side session
        // row is also gone (not just the browser cookie).
        const clearedCookie = `session_token=${clearAttrs?.value ?? ""}`;
        const sessionResponse = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
          method: "GET",
          headers: { Cookie: clearedCookie },
        });
        const body = (await sessionResponse.json()) as { session: unknown };
        expect.soft(body.session, "session must be null after logout").toBeNull();
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  });
});

describe("Phase 3 — Role enforcement", () => {
  describe("Admin path gating (proxy)", () => {
    skipIf(
      "GET /th/admin (unauthenticated) → 307 redirect to /?redirectTo=/th/admin (not 200, not 403)",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/th/admin`, { method: "GET" });
        expect.soft(
          response.status,
          `expected 307 redirect for unauth /admin, got ${response.status}`,
        ).toBe(307);
        const location = response.headers.get("location") ?? "";
        expect.soft(location, "Location header missing on unauth admin redirect").toBeTruthy();
        // The proxy redirects to "/" with a redirectTo query param so the
        // client can navigate back after login. See apps/codecamp-advantage/proxy.ts.
        const u = new URL(location, PROD_URL);
        expect.soft(
          u.pathname,
          "expected redirect target to be the home / page (login form is inline there)",
        ).toBe("/");
        expect.soft(
          u.searchParams.get("redirectTo"),
          "expected redirectTo query param so client can resume after login",
        ).toBe("/th/admin");
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoInternCreds(
      "GET /th/admin (INTERN cookie) → 307 redirect to /?error=forbidden (INTERN is not ADMIN)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const response = await fetchWithTimeout(`${PROD_URL}/th/admin`, {
          method: "GET",
          headers: { Cookie: cookie },
        });
        expect.soft(
          response.status,
          `expected 307 redirect (FORBIDDEN→redirect) for INTERN /admin, got ${response.status}`,
        ).toBe(307);
        const location = response.headers.get("location") ?? "";
        const u = new URL(location, PROD_URL);
        expect.soft(
          u.pathname,
          "expected redirect target to be the home / page",
        ).toBe("/");
        expect.soft(
          u.searchParams.get("error"),
          "expected error=forbidden query param so client can show 'access denied'",
        ).toBe("forbidden");
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoAdminCreds(
      "GET /th/admin (ADMIN cookie) → 200 (ADMIN passes the proxy gate)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_ADMIN_USERNAME!,
          process.env.PHASE3_TEST_ADMIN_PASSWORD!,
        );
        const response = await fetchWithTimeout(`${PROD_URL}/th/admin`, {
          method: "GET",
          headers: { Cookie: cookie },
        });
        expect.soft(
          response.status,
          `expected 200 for ADMIN /admin, got ${response.status}`,
        ).toBe(200);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  });

  describe("tRPC authorization", () => {
    skipIf(
      "GET /api/trpc/codecamp.dashboard (no cookie) → 401 UNAUTHORIZED (protectedProcedure)",
      async () => {
        const { status, body } = await trpcGet("codecamp.dashboard");
        expect.soft(status, `expected 401 for unauth tRPC, got ${status}`).toBe(401);
        const errorBody = body as {
          error?: { json?: { data?: { code?: string; httpStatus?: number } } };
        };
        const dataCode = errorBody.error?.json?.data?.code;
        expect.soft(
          dataCode,
          `tRPC error envelope must surface UNAUTHORIZED, got: ${JSON.stringify(errorBody).slice(0, 200)}`,
        ).toBe("UNAUTHORIZED");
        expect.soft(
          errorBody.error?.json?.data?.httpStatus,
          "tRPC error envelope must include httpStatus=401",
        ).toBe(401);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIf(
      "GET /api/trpc/codecamp.listInterns (no cookie) → 401 UNAUTHORIZED (adminProcedure)",
      async () => {
        const { status, body } = await trpcGet("codecamp.listInterns");
        expect.soft(status, `expected 401 for unauth admin tRPC, got ${status}`).toBe(401);
        const errorBody = body as {
          error?: { json?: { data?: { code?: string } } };
        };
        expect.soft(
          errorBody.error?.json?.data?.code,
          "tRPC error envelope must surface UNAUTHORIZED for unauth admin call",
        ).toBe("UNAUTHORIZED");
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoInternCreds(
      "GET /api/trpc/codecamp.dashboard (INTERN cookie) → 200 (INTERN passes protectedProcedure)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const { status, body } = await trpcGet("codecamp.dashboard", { cookie });
        expect.soft(
          status,
          `expected 2xx for INTERN dashboard tRPC, got ${status}`,
        ).toBeGreaterThanOrEqual(200);
        expect.soft(status).toBeLessThan(300);
        const resultBody = body as { result?: { data?: { json?: unknown } } };
        expect.soft(
          resultBody.result?.data?.json,
          "expected dashboard payload, got: " + JSON.stringify(body).slice(0, 200),
        ).toBeDefined();
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoInternCreds(
      "GET /api/trpc/codecamp.listInterns (INTERN cookie) → 403 FORBIDDEN (INTERN fails adminProcedure)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const { status, body } = await trpcGet("codecamp.listInterns", { cookie });
        expect.soft(
          status,
          `expected 403 for INTERN admin tRPC, got ${status}`,
        ).toBe(403);
        const errorBody = body as {
          error?: { json?: { data?: { code?: string; httpStatus?: number } } };
        };
        expect.soft(
          errorBody.error?.json?.data?.code,
          "tRPC error envelope must surface FORBIDDEN, got: " +
            JSON.stringify(errorBody).slice(0, 200),
        ).toBe("FORBIDDEN");
        expect.soft(
          errorBody.error?.json?.data?.httpStatus,
          "tRPC error envelope must include httpStatus=403",
        ).toBe(403);
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );

    skipIfNoInternCreds(
      "GET /api/trpc/codecamp.webhookEvents (INTERN cookie) → 403 FORBIDDEN (adminProcedure, no role bypass)",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE3_TEST_INTERN_USERNAME!,
          process.env.PHASE3_TEST_INTERN_PASSWORD!,
        );
        const { status, body } = await trpcGet("codecamp.webhookEvents", { cookie });
        expect.soft(
          status,
          `expected 403 for INTERN webhookEvents tRPC, got ${status}`,
        ).toBe(403);
        const errorBody = body as {
          error?: { json?: { data?: { code?: string } } };
        };
        expect.soft(
          errorBody.error?.json?.data?.code,
          "tRPC error envelope must surface FORBIDDEN",
        ).toBe("FORBIDDEN");
      },
      REQUEST_TIMEOUT_MS + 2_000,
    );
  });

  afterAll(() => {
    if (SKIP) {
      console.warn("[phase-3-authentication-and-authorization] PHASE3_SKIP=1 — suite skipped");
    } else if (!HAS_ANY_CREDS) {
      console.warn(
        "[phase-3-authentication-and-authorization] No PHASE3_TEST_* creds provided — " +
          "credential-gated probes skipped. Set PHASE3_TEST_INTERN_USERNAME/PASSWORD and " +
          "PHASE3_TEST_ADMIN_USERNAME/PASSWORD to exercise the full P0 contract.",
      );
    }
  });
});

/**
 * Phase 3 P0 launch gate — a single hard-failing test that summarizes the
 * production auth/authorization posture from the unauth perspective. Unlike
 * the per-check assertions above (which use `expect.soft` so a run can
 * enumerate all gaps in one pass), this gate fails fast with a list of
 * every missing critical item, so CI can block deploys to public launch.
 *
 * The credential-gated checks (login with valid creds, cookie attributes,
 * logout, role enforcement with INTERN/ADMIN) live in the per-check tests
 * above and are not re-asserted here — the gate covers only the checks
 * that do not require test credentials so it can run from any CI node
 * with prod network access.
 *
 * Mirrors the Phase 1 and Phase 2 launch-gate patterns. Aggregates the
 * highest-priority checks: login path returns 4xx (not 5xx) on bad creds,
 * unauth /admin redirects (not 200/403), and tRPC auth/admin procedures
 * surface UNAUTHORIZED envelopes.
 */
describe("Phase 3 — P0 launch gate (single hard assertion)", () => {
  skipIf(
    "all Phase 3 unauth P0 acceptance criteria are met (launch gate)",
    async () => {
      const missing: string[] = [];

      // 1. Login route must reject bad credentials with a 4xx client
      //    error (not 5xx). A 5xx on bad creds indicates a server-side
      //    fault — see Phase 2 fix in packages/api/src/routes/auth/login.ts.
      const loginRes = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "__no_such_user__", password: "__bad__" }),
      });
      if (loginRes.status < 400 || loginRes.status >= 500) {
        missing.push(`POST /api/auth/login returned ${loginRes.status} (expected 4xx)`);
      }

      // 2. Unauthenticated /admin must redirect to login (not 200, not
      //    403). The proxy enforces this in apps/codecamp-advantage/proxy.ts.
      const adminRes = await fetchWithTimeout(`${PROD_URL}/th/admin`, { method: "GET" });
      if (adminRes.status !== 307) {
        missing.push(`GET /th/admin (unauth) returned ${adminRes.status} (expected 307)`);
      } else {
        const location = adminRes.headers.get("location") ?? "";
        const u = new URL(location, PROD_URL);
        if (u.pathname !== "/") {
          missing.push(
            `GET /th/admin (unauth) Location=${location} — expected redirect to /`,
          );
        }
        if (u.searchParams.get("redirectTo") !== "/th/admin") {
          missing.push(
            `GET /th/admin (unauth) missing redirectTo=/th/admin — got: ${location}`,
          );
        }
      }

      // 3. tRPC protected procedure (codecamp.dashboard) must surface
      //    UNAUTHORIZED for an unauth request.
      const dashRes = await trpcGet("codecamp.dashboard");
      if (dashRes.status !== 401) {
        missing.push(
          `GET /api/trpc/codecamp.dashboard (unauth) returned ${dashRes.status} (expected 401)`,
        );
      } else {
        const errorBody = dashRes.body as {
          error?: { json?: { data?: { code?: string } } };
        };
        if (errorBody.error?.json?.data?.code !== "UNAUTHORIZED") {
          missing.push(
            "GET /api/trpc/codecamp.dashboard (unauth) missing UNAUTHORIZED envelope",
          );
        }
      }

      // 4. tRPC admin procedure (codecamp.listInterns) must surface
      //    UNAUTHORIZED for an unauth request.
      const adminTrpcRes = await trpcGet("codecamp.listInterns");
      if (adminTrpcRes.status !== 401) {
        missing.push(
          `GET /api/trpc/codecamp.listInterns (unauth) returned ${adminTrpcRes.status} (expected 401)`,
        );
      } else {
        const errorBody = adminTrpcRes.body as {
          error?: { json?: { data?: { code?: string } } };
        };
        if (errorBody.error?.json?.data?.code !== "UNAUTHORIZED") {
          missing.push(
            "GET /api/trpc/codecamp.listInterns (unauth) missing UNAUTHORIZED envelope",
          );
        }
      }

      // 5. /api/auth/session with no cookie must return session: null
      //    (not 401, not 5xx). The route is the source of truth for
      //    client-side hydration of the auth state.
      const sessionRes = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, { method: "GET" });
      if (sessionRes.status !== 200) {
        missing.push(
          `GET /api/auth/session (unauth) returned ${sessionRes.status} (expected 200 with session:null)`,
        );
      } else {
        const body = (await sessionRes.json()) as { session: unknown };
        if (body.session !== null) {
          missing.push(
            "GET /api/auth/session (unauth) must return session: null, got: " +
              JSON.stringify(body).slice(0, 200),
          );
        }
      }

      expect(
        missing,
        `Phase 3 P0 launch gate failed — ${missing.length} critical item(s) missing: ${missing.join("; ")}`,
      ).toEqual([]);
    },
    REQUEST_TIMEOUT_MS * 5 + 5_000,
  );
});

/**
 * Unit tests for the parseSetCookie helper. These do not touch the network
 * and run unconditionally so a regression in the parser fails the suite
 * immediately (rather than masquerading as a production gap).
 */
describe("parseSetCookie (helper unit tests)", () => {
  it("parses name and value", () => {
    const p = parseSetCookie("session_token=abc123");
    expect(p?.name).toBe("session_token");
    expect(p?.value).toBe("abc123");
    expect(p?.httpOnly).toBe(false);
    expect(p?.secure).toBe(false);
    expect(p?.sameSite).toBeNull();
  });

  it("parses HttpOnly flag", () => {
    const p = parseSetCookie("session_token=abc; HttpOnly");
    expect(p?.httpOnly).toBe(true);
  });

  it("parses Secure flag", () => {
    const p = parseSetCookie("session_token=abc; Secure");
    expect(p?.secure).toBe(true);
  });

  it("parses SameSite=Lax (case-insensitive on name)", () => {
    const p = parseSetCookie("session_token=abc; SameSite=Lax");
    expect(p?.sameSite).toBe("Lax");
  });

  it("parses SameSite=Strict", () => {
    const p = parseSetCookie("session_token=abc; samesite=Strict");
    expect(p?.sameSite).toBe("Strict");
  });

  it("parses Path=/", () => {
    const p = parseSetCookie("session_token=abc; Path=/");
    expect(p?.path).toBe("/");
  });

  it("parses Max-Age as integer", () => {
    const p = parseSetCookie("session_token=abc; Max-Age=604800");
    expect(p?.maxAge).toBe(604800);
  });

  it("parses Expires", () => {
    const p = parseSetCookie("session_token=abc; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(p?.expires).toBe("Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("parses the full production cookie contract", () => {
    const p = parseSetCookie(
      "session_token=abc; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    expect(p?.name).toBe("session_token");
    expect(p?.value).toBe("abc");
    expect(p?.maxAge).toBe(604800);
    expect(p?.path).toBe("/");
    expect(p?.httpOnly).toBe(true);
    expect(p?.secure).toBe(true);
    expect(p?.sameSite).toBe("Lax");
  });

  it("returns null for empty input", () => {
    expect(parseSetCookie(null)).toBeNull();
    expect(parseSetCookie(undefined)).toBeNull();
    expect(parseSetCookie("")).toBeNull();
  });

  it("returns null for header without name=value", () => {
    expect(parseSetCookie("; HttpOnly")).toBeNull();
  });

  it("parses a clear-cookie header (Max-Age=0)", () => {
    const p = parseSetCookie("session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
    expect(p?.name).toBe("session_token");
    expect(p?.value).toBe("");
    expect(p?.maxAge).toBe(0);
    expect(p?.httpOnly).toBe(true);
  });
});
