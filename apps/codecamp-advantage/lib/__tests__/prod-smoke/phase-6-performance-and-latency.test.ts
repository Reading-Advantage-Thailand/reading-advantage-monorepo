import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { gzipSync } from "node:zlib";
import { RUN_LIVE_SMOKE, resolveLiveSmokeUrl } from "./_helpers/live-smoke-guard";

/**
 * Phase 6 — Performance & Latency (P1)
 *
 * Black-box smoke tests for the deployed production service at
 * https://codecamp.reading-advantage.com (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * These tests encode the Phase 6 acceptance criteria as executable contract.
 * They will fail (Red) until:
 *   (a) the public page surfaces (dashboard, module, lesson, admin) render
 *       within their declared latency budgets under network conditions
 *       that approximate real user traffic,
 *   (b) the four tRPC procedures called out in test-strategy.md §6
 *       (`codecamp.dashboard` → `getUserDashboard`,
 *       `codecamp.moduleBySlug` → `getModuleBySlug`,
 *       `codecamp.lesson` → `getLessonWithContent`,
 *       `codecamp.submitQuiz` → `submitQuizAnswers`) respond within their
 *       declared server-roundtrip budgets, and the chat stream returns a
 *       first token within the 5-second TTFT budget,
 *   (c) the static asset surface (Thai font, icons, main JS bundle) loads
 *       with no 404s and the main JS bundle gzipped is under 500KB,
 *   (d) the same surfaces still respond within Slow-3G / Fast-4G budgets
 *       (per the test-strategy.md §5 P6 plan: Chrome DevTools throttling
 *       approximation via a per-request deadline).
 *
 * Four valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach prod) —
 *      indicates the probe must be run from a network that can reach prod.
 *   2. Assertion failure (prod reachable, but the budget is exceeded) —
 *      indicates a real production performance gap to file as a follow-up
 *      track (do not inline-fix here, per test-strategy.md §4).
 *   3. Missing test credentials (PHASE6_TEST_* env vars absent) — credential-
 *      gated probes skip; the unauth and structural probes still run and
 *      are the P1 launch gate.
 *   4. Test-runner network flakiness to prod — same class of flakiness
 *      Phases 2–5 saw on tRPC probes.
 *
 * Set PHASE6_PROD_URL to override the default target (useful for staging).
 * Set PHASE6_SKIP=1 to skip the entire suite in environments without
 * network. Set PHASE6_TEST_INTERN_USERNAME / PHASE6_TEST_INTERN_PASSWORD
 * to exercise credential-gated tRPC probes.
 *
 * **Measurement methodology:** each timing assertion uses
 * `performance.now()` deltas measured in the Node.js test runner around
 * the `fetch` call. This captures end-to-end wall time (DNS + TCP + TLS +
 * request + response), not server-side processing alone. The budgets in
 * the plan are framed as "page loads in N seconds" / "API < Nms", so the
 * end-to-end measurement is the correct boundary.
 *
 * **Cold-vs-warm:** the "cold" dashboard probe is the first fetch in the
 * suite, capturing the Cloud Run scale-from-zero cost; the "warm" probe
 * runs immediately after a warmup fetch, capturing the steady-state
 * cost. See test-strategy.md §3 "Cold-start interaction" — the cold
 * timestamp is shared with Phases 1, 9, and 10.
 *
 * Note on divergence from test-strategy.md: the test-strategy says "No new
 * unit tests are required for this track" and "keep curl probes out of
 * repo source." Per the 2026-06-07 mid-session supervisor instruction
 * (same as Phases 1–5), Phase 6 is elevated from manual probes to
 * executable contract. The 5 unit tests at the bottom (HTML asset-parser
 * helper + asset-oracle + bundle-budget helper) run unconditionally so
 * regressions in those helpers fail the suite immediately. All other
 * Phase 6 checks remain black-box HTTP probes against prod, consistent
 * with the strategy.
 */

const PROD_URL = resolveLiveSmokeUrl("PHASE6_PROD_URL") ?? "";
const SKIP = process.env.PHASE6_SKIP === "1";
const HAS_INTERN_CREDS =
  typeof process.env.PHASE6_TEST_INTERN_USERNAME === "string" &&
  process.env.PHASE6_TEST_INTERN_USERNAME.length > 0 &&
  typeof process.env.PHASE6_TEST_INTERN_PASSWORD === "string" &&
  process.env.PHASE6_TEST_INTERN_PASSWORD.length > 0;
const REQUEST_TIMEOUT_MS = 5_000;

// ─── Budgets (from plan.md §Phase 6) ────────────────────────
const BUDGET = {
  DASHBOARD_COLD_MS: 3_000,
  DASHBOARD_WARM_MS: 1_000,
  MODULE_PAGE_MS: 2_000,
  LESSON_PAGE_MS: 2_000,
  ADMIN_PAGE_MS: 3_000,
  DASHBOARD_API_MS: 500,
  MODULE_BY_SLUG_API_MS: 300,
  LESSON_API_MS: 300,
  SUBMIT_QUIZ_API_MS: 500,
  CHAT_FIRST_TOKEN_MS: 5_000,
  MAIN_JS_GZIPPED_BYTES: 500 * 1024,
  SLOW_3G_PER_REQUEST_MS: 8_000, // Slow 3G TTFB budget + payload
  FAST_4G_PER_REQUEST_MS: 3_000, // Fast 4G TTFB budget + payload
} as const;

const testIf = (skipCondition: boolean) => (!RUN_LIVE_SMOKE || skipCondition ? it.skip : it);
const skipIf = testIf(SKIP);
const skipIfNoInternCreds = testIf(SKIP || !HAS_INTERN_CREDS);

// ─── Helpers ──────────────────────────────────────────────

/**
 * fetch with a per-call timeout, mirroring the helper shape used in
 * Phases 1–5. `redirect: "follow"` matches the Phase 1 fix (commit
 * `a0862b3`) and the Phase 4 fix (commit `5b4f278`) — Next.js 308
 * trailing-slash redirects are a valid response and the tests should
 * follow them rather than asserting on the 308.
 */
const fetchWithTimeout = async (
  input: string,
  init: RequestInit & { redirect?: RequestRedirect; timeoutMs?: number } = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      redirect: init.redirect ?? "follow",
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Measures elapsed milliseconds around an async operation using the
 * monotonic `performance.now()` clock. Captures the end-to-end wall
 * time, which is the correct boundary for "page loads in N seconds"
 * style budgets.
 */
const measureMs = async <T>(fn: () => Promise<T>): Promise<{ result: T; elapsedMs: number }> => {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = performance.now() - start;
  return { result, elapsedMs };
};

interface LoginResult {
  cookie: string;
  userRole: string;
}

const trpcInput = (json: unknown = null) =>
  encodeURIComponent(JSON.stringify({ json, meta: { values: ["undefined"] } }));

async function loginAndGetCookie(username: string, password: string): Promise<LoginResult> {
  const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (response.status !== 200) {
    const body = await response.text();
    throw new Error(`login failed for ${username}: status=${response.status} body=${body.slice(0, 200)}`);
  }
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session_token=([^;]+)/);
  if (!match) {
    throw new Error(`login succeeded but no session_token Set-Cookie header — got: ${setCookie.slice(0, 200)}`);
  }
  const body = (await response.json()) as { success: boolean; user: { role: string } };
  return { cookie: `session_token=${match[1]}`, userRole: body.user.role };
}

async function trpcGet(
  procedure: string,
  init: { cookie?: string; inputJson?: unknown; timeoutMs?: number } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (init.cookie) headers["Cookie"] = init.cookie;
  const url = `${PROD_URL}/api/trpc/${procedure}?input=${trpcInput(init.inputJson ?? null)}`;
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers,
    timeoutMs: init.timeoutMs,
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

async function trpcPost(
  procedure: string,
  init: { cookie?: string; inputJson?: unknown; timeoutMs?: number } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.cookie) headers["Cookie"] = init.cookie;
  const url = `${PROD_URL}/api/trpc/${procedure}?input=${trpcInput(init.inputJson ?? null)}`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers,
    body: JSON.stringify(init.inputJson ?? {}),
    timeoutMs: init.timeoutMs,
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/**
 * Pulls Next.js `/_next/static/chunks/*.js` and `<script src="...">`
 * entries from a rendered HTML document. The set returned here is the
 * candidate pool for the "main JS bundle" — Phase 6 plan says "< 500KB
 * gzipped main" so we measure the largest gzipped chunk in this set.
 */
function extractScriptUrls(html: string): string[] {
  const urls = new Set<string>();
  const attrRe = /<script[^>]+src=["']([^"']+)["']/gi;
  const cssImportRe = /@import\s+url\(["']?([^"')]+)["']?\)/gi;
  const linkRe = /<link\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html))) urls.add(m[1]!);
  while ((m = cssImportRe.exec(html))) urls.add(m[1]!);
  while ((m = linkRe.exec(html))) {
    const attrs = m[1]!;
    if (!/\brel\s*=\s*["']preload["']/i.test(attrs)) continue;
    if (!/\bas\s*=\s*["']font["']/i.test(attrs)) continue;
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) urls.add(href);
  }
  return [...urls];
}

/**
 * Resolves a possibly-relative URL against the production origin.
 * Returns only http(s) absolute URLs — relative `/` paths are prefixed
 * with the prod origin.
 */
function resolveAssetUrl(href: string): string | null {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${PROD_URL}${href}`;
  return null;
}

/**
 * Extracts `<img>` URLs from rendered HTML. Captures both eager-loaded
 * `src=` and lazy-loaded `data-src=` attributes, plus the first URL of
 * each `srcset=` entry (responsive images declare multiple candidates
 * per attribute). Used by the Phase 6 "Icons and images load correctly"
 * sub-task — when an image URL is referenced it must return <400 or
 * the user sees a broken-image icon in the browser.
 */
function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();
  const attrRe = /<img\b[^>]+(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
  const srcsetRe = /<img\b[^>]+srcset\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html))) urls.add(m[1]!);
  while ((m = srcsetRe.exec(html))) {
    for (const entry of m[1]!.split(",")) {
      const url = entry.trim().split(/\s+/)[0];
      if (url) urls.add(url);
    }
  }
  return [...urls];
}

/**
 * Counts render-blocking external scripts in the document `<head>`.
 * A script is render-blocking when ALL of the following hold:
 *   - it lives in the `<head>` element (not `<body>`),
 *   - it has a `src=` attribute (external script — inline scripts
 *     are ignored because they make no network request),
 *   - it does NOT have `defer`, `async`, or `type="module"` (any of
 *     which makes the script non-blocking).
 *
 * Modern Next.js emits scripts with `async` / `defer` and never
 * produces a render-blocking external script, so the expected
 * count is 0. A non-zero count indicates an unoptimized asset is
 * blocking first paint of the page.
 */
function countRenderBlockingScripts(html: string): number {
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return 0;
  const head = headMatch[1]!;
  const scriptRe = /<script\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = scriptRe.exec(head))) {
    const attrs = m[1]!;
    if (!/\bsrc\s*=/i.test(attrs)) continue; // ignore inline scripts
    if (/\bdefer\b/i.test(attrs)) continue;
    if (/\basync\b/i.test(attrs)) continue;
    if (/\btype\s*=\s*["']module["']/i.test(attrs)) continue;
    count++;
  }
  return count;
}

// ─── Tests ────────────────────────────────────────────────

describe("Phase 6 — Page load times", () => {
  beforeAll(() => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    expect(PROD_URL, "PHASE6_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  describe("Dashboard (unauth → login wall)", () => {
    skipIf(
      "GET /en/ (cold) returns 200 within 3 seconds",
      async () => {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" }),
        );
        expect.soft(result.status, `expected 200 from /en/, got ${result.status}`).toBe(200);
        expect.soft(
          elapsedMs,
          `cold dashboard took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.DASHBOARD_COLD_MS}ms`,
        ).toBeLessThan(BUDGET.DASHBOARD_COLD_MS);
      },
      BUDGET.DASHBOARD_COLD_MS + 2_000,
    );

    skipIf(
      "GET /en/ (warm) returns 200 within 1 second",
      async () => {
        // Warmup: pay the cold-start cost before the warm measurement.
        await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" }),
        );
        expect.soft(result.status, `expected 200 from /en/, got ${result.status}`).toBe(200);
        expect.soft(
          elapsedMs,
          `warm dashboard took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.DASHBOARD_WARM_MS}ms`,
        ).toBeLessThan(BUDGET.DASHBOARD_WARM_MS);
      },
      BUDGET.DASHBOARD_WARM_MS * 2 + 4_000,
    );
  });

  describe("Module page (unauth → login wall)", () => {
    skipIf(
      "GET /en/module/dev-environment returns 2xx/3xx within 2 seconds",
      async () => {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/module/dev-environment`, { method: "GET" }),
        );
        expect.soft(
          result.status,
          `expected <400 for /en/module/dev-environment, got ${result.status}`,
        ).toBeLessThan(400);
        expect.soft(
          elapsedMs,
          `module page took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.MODULE_PAGE_MS}ms`,
        ).toBeLessThan(BUDGET.MODULE_PAGE_MS);
      },
      BUDGET.MODULE_PAGE_MS + 2_000,
    );
  });

  describe("Lesson page (unauth → login wall)", () => {
    skipIf(
      "GET /en/lesson/<uuid-or-slug> returns non-5xx within 2 seconds",
      async () => {
        const probeId = "00000000-0000-0000-0000-000000000000";
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/lesson/${probeId}`, { method: "GET" }),
        );
        expect.soft(
          result.status,
          `expected non-5xx for /en/lesson/<probe>, got ${result.status}`,
        ).toBeLessThan(500);
        expect.soft(
          elapsedMs,
          `lesson page took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.LESSON_PAGE_MS}ms`,
        ).toBeLessThan(BUDGET.LESSON_PAGE_MS);
      },
      BUDGET.LESSON_PAGE_MS + 2_000,
    );
  });

  describe("Admin page (unauth → login redirect)", () => {
    skipIf(
      "GET /en/admin returns 3xx (login redirect) within 3 seconds",
      async () => {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/admin`, { method: "GET", redirect: "manual" }),
        );
        expect.soft(
          result.status,
          `expected 3xx for /en/admin (unauth), got ${result.status}`,
        ).toBeGreaterThanOrEqual(300);
        expect.soft(
          result.status,
          `expected <400 for /en/admin, got ${result.status}`,
        ).toBeLessThan(400);
        expect.soft(
          elapsedMs,
          `admin redirect took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.ADMIN_PAGE_MS}ms`,
        ).toBeLessThan(BUDGET.ADMIN_PAGE_MS);
      },
      BUDGET.ADMIN_PAGE_MS + 2_000,
    );
  });

  afterAll(() => {
    if (SKIP) {
      console.warn("[phase-6-performance-and-latency] PHASE6_SKIP=1 — suite skipped");
    }
  });
});

describe("Phase 6 — API response times", () => {
  describe("tRPC procedures (INTERN)", () => {
    skipIfNoInternCreds(
      "GET /api/trpc/codecamp.dashboard (INTERN) returns 2xx within 500ms",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        const { result, elapsedMs } = await measureMs(() =>
          trpcGet("codecamp.dashboard", { cookie }),
        );
        expect.soft(result.status, `expected 2xx for dashboard, got ${result.status}`).toBeLessThan(300);
        expect.soft(
          elapsedMs,
          `codecamp.dashboard took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.DASHBOARD_API_MS}ms`,
        ).toBeLessThan(BUDGET.DASHBOARD_API_MS);
      },
      BUDGET.DASHBOARD_API_MS + 4_000,
    );

    skipIfNoInternCreds(
      "GET /api/trpc/codecamp.moduleBySlug (INTERN, slug=dev-environment) returns 2xx within 300ms",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        const { result, elapsedMs } = await measureMs(() =>
          trpcGet("codecamp.moduleBySlug", {
            cookie,
            inputJson: { slug: "dev-environment" },
          }),
        );
        expect.soft(result.status, `expected 2xx for moduleBySlug, got ${result.status}`).toBeLessThan(300);
        expect.soft(
          elapsedMs,
          `codecamp.moduleBySlug took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.MODULE_BY_SLUG_API_MS}ms`,
        ).toBeLessThan(BUDGET.MODULE_BY_SLUG_API_MS);
      },
      BUDGET.MODULE_BY_SLUG_API_MS + 4_000,
    );

    skipIfNoInternCreds(
      "GET /api/trpc/codecamp.lesson (INTERN, lessonId) returns 2xx within 300ms",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        // We need a real lesson ID. Pull it from codecamp.moduleBySlug
        // (which has its own SLA test above) so this test doesn't
        // require a static fixture.
        const modRes = await trpcGet("codecamp.moduleBySlug", {
          cookie,
          inputJson: { slug: "dev-environment" },
        });
        const modBody = modRes.body as {
          result?: { data?: { json?: { lessons?: Array<{ id: string }> } } };
        };
        const lessonId = modBody.result?.data?.json?.lessons?.[0]?.id;
        expect.soft(lessonId, "expected moduleBySlug to return at least one lesson id").toBeDefined();
        if (!lessonId) return;
        const { result, elapsedMs } = await measureMs(() =>
          trpcGet("codecamp.lesson", { cookie, inputJson: { id: lessonId } }),
        );
        expect.soft(result.status, `expected 2xx for lesson, got ${result.status}`).toBeLessThan(300);
        expect.soft(
          elapsedMs,
          `codecamp.lesson took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.LESSON_API_MS}ms`,
        ).toBeLessThan(BUDGET.LESSON_API_MS);
      },
      BUDGET.LESSON_API_MS + 4_000,
    );

    skipIfNoInternCreds(
      "POST /api/trpc/codecamp.submitQuiz (INTERN) returns 2xx within 500ms",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        // Use a probe input — the test measures server-roundtrip
        // latency, not correctness. A 4xx on the body shape is fine;
        // 5xx is not.
        const { result, elapsedMs } = await measureMs(() =>
          trpcPost("codecamp.submitQuiz", {
            cookie,
            inputJson: {
              lessonId: "00000000-0000-0000-0000-000000000000",
              answers: [],
            },
          }),
        );
        expect.soft(
          result.status,
          `expected non-5xx for submitQuiz, got ${result.status}`,
        ).toBeLessThan(500);
        expect.soft(
          elapsedMs,
          `codecamp.submitQuiz took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.SUBMIT_QUIZ_API_MS}ms`,
        ).toBeLessThan(BUDGET.SUBMIT_QUIZ_API_MS);
      },
      BUDGET.SUBMIT_QUIZ_API_MS + 4_000,
    );
  });

  describe("Chat API (POST /api/chat)", () => {
    skipIf(
      "POST /api/chat (unauth) returns 401 within 5 seconds (rejects fast — first-token TTFB ceiling)",
      async () => {
        // Unauth path is the worst-case first-token timing: the auth
        // gate fires before streamText. If the unauth path is slow,
        // the authed path is slower.
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(
            `${PROD_URL}/api/chat`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: "ping" }),
              timeoutMs: BUDGET.CHAT_FIRST_TOKEN_MS,
            },
          ),
        );
        expect.soft(result.status, `expected 401 for unauth chat, got ${result.status}`).toBe(401);
        expect.soft(
          elapsedMs,
          `unauth chat took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.CHAT_FIRST_TOKEN_MS}ms`,
        ).toBeLessThan(BUDGET.CHAT_FIRST_TOKEN_MS);
      },
      BUDGET.CHAT_FIRST_TOKEN_MS + 2_000,
    );

    skipIfNoInternCreds(
      "POST /api/chat (INTERN) returns the first streaming byte within 5 seconds",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), BUDGET.CHAT_FIRST_TOKEN_MS + 2_000);
        const start = performance.now();
        try {
          const response = await fetch(`${PROD_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: cookie },
            body: JSON.stringify({ message: "ping" }),
            signal: controller.signal,
          });
          expect.soft(
            response.status,
            `expected 2xx for authed chat, got ${response.status}`,
          ).toBeLessThan(300);
          expect.soft(response.body, "expected chat response to have a streaming body").toBeDefined();
          if (!response.body) return;
          const reader = response.body.getReader();
          const { done } = await reader.read();
          const elapsedMs = performance.now() - start;
          expect.soft(done, "expected at least one chunk to be readable (first token)").toBe(false);
          expect.soft(
            elapsedMs,
            `first chat token took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.CHAT_FIRST_TOKEN_MS}ms`,
          ).toBeLessThan(BUDGET.CHAT_FIRST_TOKEN_MS);
          // Best-effort cancel — don't await a slow tail.
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
        } finally {
          clearTimeout(timer);
        }
      },
      BUDGET.CHAT_FIRST_TOKEN_MS + 4_000,
    );
  });
});

describe("Phase 6 — Asset loading", () => {
  describe("Thai font and static assets", () => {
    skipIf(
      "GET /en/ HTML references the Thai font (Noto Sans Thai or next/font className) and the font URL returns 2xx",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        expect.soft(response.status, `expected 200 from /en/, got ${response.status}`).toBe(200);
        const body = await response.text();
        const candidateUrls = extractScriptUrls(body)
          .map(resolveAssetUrl)
          .filter((u): u is string => u !== null);
        const fontCandidates = candidateUrls.filter(
          (u) => /\.(woff2?|ttf|otf)(\?|$)/i.test(u) || /\/font/i.test(u),
        );
        const thaiFontCandidates = fontCandidates.filter((u) => /thai|noto/i.test(u));
        expect.soft(
          thaiFontCandidates.length,
          `expected at least one Thai font URL in /en/ HTML — found fonts: ${fontCandidates.join(", ")}`,
        ).toBeGreaterThan(0);
        for (const fontUrl of fontCandidates) {
          const fontRes = await fetchWithTimeout(fontUrl, { method: "HEAD" });
          expect.soft(
            fontRes.status,
            `Thai font URL ${fontUrl} returned ${fontRes.status} (expected <400)`,
          ).toBeLessThan(400);
        }
      },
      BUDGET.DASHBOARD_COLD_MS + 4_000,
    );

    skipIf(
      "GET /en/ static asset URLs (scripts, fonts, preloads) all return <400",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        expect.soft(response.status, `expected 200 from /en/, got ${response.status}`).toBe(200);
        const body = await response.text();
        const candidateUrls = extractScriptUrls(body)
          .map(resolveAssetUrl)
          .filter((u): u is string => u !== null);
        // Limit the breadth so the test stays inside the timeout budget.
        // We probe every candidate we found, but cap at 20 to avoid
        // hammering prod on dense pages.
        const sample = candidateUrls.slice(0, 20);
        expect.soft(
          sample.length,
          `expected /en/ to reference at least 1 static asset, found ${sample.length}`,
        ).toBeGreaterThan(0);
        const failing: string[] = [];
        for (const url of sample) {
          const r = await fetchWithTimeout(url, { method: "HEAD" });
          if (r.status >= 400) failing.push(`${url} → ${r.status}`);
        }
        expect.soft(
          failing,
          `static asset 404/5xx: ${failing.slice(0, 5).join(", ")} (${failing.length} of ${sample.length} failed)`,
        ).toEqual([]);
      },
      BUDGET.DASHBOARD_COLD_MS + 8_000,
    );
  });

  describe("JS bundle size", () => {
    skipIf(
      "largest gzipped JS chunk from /en/ is under 500KB",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        expect.soft(response.status, `expected 200 from /en/, got ${response.status}`).toBe(200);
        const body = await response.text();
        const scriptUrls = extractScriptUrls(body)
          .map(resolveAssetUrl)
          .filter((u): u is string => u !== null)
          .filter((u) => /\/_next\/static\/.*\.js(\?|$)/i.test(u));
        expect.soft(
          scriptUrls.length,
          `expected at least 1 Next.js script URL, found ${scriptUrls.length}`,
        ).toBeGreaterThan(0);
        let maxChunkGzipped = 0;
        let maxChunkUrl = "";
        for (const url of scriptUrls) {
          const r = await fetchWithTimeout(url, { method: "GET" });
          if (r.status !== 200) continue;
          const text = await r.text();
          const gz = gzipSync(Buffer.from(text, "utf8"));
          if (gz.byteLength > maxChunkGzipped) {
            maxChunkGzipped = gz.byteLength;
            maxChunkUrl = url;
          }
        }
        expect.soft(
          maxChunkGzipped,
          `largest gzipped JS chunk is ${maxChunkGzipped} bytes (${maxChunkUrl}) — budget ${BUDGET.MAIN_JS_GZIPPED_BYTES} bytes`,
        ).toBeLessThan(BUDGET.MAIN_JS_GZIPPED_BYTES);
      },
      BUDGET.DASHBOARD_COLD_MS + 15_000,
    );
  });

  describe("Icons and images (no broken-image assets)", () => {
    // The unauth login wall is rendered with lucide-react (inline SVG)
    // so the body is expected to contain zero `<img>` tags. The probe
    // below still runs — it documents the contract that IF a page
    // surfaces an image URL, that URL must return <400. A zero-image
    // result is a valid pass; the test exercises the regression guard
    // for the credential-gated surface, which is the more interesting
    // case (the authed dashboard can include user/profile imagery).
    skipIf(
      "GET /en/ (unauth login wall) surfaces zero broken <img> asset URLs",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        expect.soft(response.status, `expected 200 from /en/, got ${response.status}`).toBe(200);
        const body = await response.text();
        const imageUrls = extractImageUrls(body)
          .map(resolveAssetUrl)
          .filter((u): u is string => u !== null)
          .filter((u) => /^https?:\/\//i.test(u));
        const failing: string[] = [];
        for (const url of imageUrls) {
          const r = await fetchWithTimeout(url, { method: "HEAD" });
          if (r.status >= 400) failing.push(`${url} → ${r.status}`);
        }
        expect.soft(
          failing,
          `image asset 404/5xx: ${failing.slice(0, 5).join(", ")} (${failing.length} of ${imageUrls.length} failed)`,
        ).toEqual([]);
      },
      BUDGET.DASHBOARD_COLD_MS + 8_000,
    );

    skipIfNoInternCreds(
      "GET /en/ (INTERN cookie) surfaces zero broken <img> asset URLs on the authed dashboard",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        const response = await fetchWithTimeout(`${PROD_URL}/en/`, {
          method: "GET",
          headers: { Cookie: cookie },
        });
        expect.soft(
          response.status,
          `expected 200 from authed /en/, got ${response.status}`,
        ).toBe(200);
        const body = await response.text();
        const imageUrls = extractImageUrls(body)
          .map(resolveAssetUrl)
          .filter((u): u is string => u !== null)
          .filter((u) => /^https?:\/\//i.test(u));
        const failing: string[] = [];
        for (const url of imageUrls.slice(0, 30)) {
          const r = await fetchWithTimeout(url, { method: "HEAD" });
          if (r.status >= 400) failing.push(`${url} → ${r.status}`);
        }
        expect.soft(
          failing,
          `authed dashboard image asset 404/5xx: ${failing.slice(0, 5).join(", ")} (${failing.length} of ${imageUrls.length} failed)`,
        ).toEqual([]);
      },
      BUDGET.DASHBOARD_COLD_MS + 12_000,
    );
  });

  describe("No large unoptimized assets blocking render", () => {
    skipIf(
      "GET /en/ has zero render-blocking external <script> tags in <head>",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        expect.soft(response.status, `expected 200 from /en/, got ${response.status}`).toBe(200);
        const body = await response.text();
        const blocking = countRenderBlockingScripts(body);
        expect.soft(
          blocking,
          `expected 0 render-blocking external <script src="..."> in <head>, found ${blocking}`,
        ).toBe(0);
      },
      BUDGET.DASHBOARD_COLD_MS + 4_000,
    );

    skipIf(
      "GET /th/ has zero render-blocking external <script> tags in <head>",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/th/`, { method: "GET" });
        expect.soft(response.status, `expected 200 from /th/, got ${response.status}`).toBe(200);
        const body = await response.text();
        const blocking = countRenderBlockingScripts(body);
        expect.soft(
          blocking,
          `expected 0 render-blocking external <script src="..."> in /th/ <head>, found ${blocking}`,
        ).toBe(0);
      },
      BUDGET.DASHBOARD_COLD_MS + 4_000,
    );
  });
});

describe("Phase 6 — Mobile network simulation", () => {
  describe("Slow 3G (per-request timeout 8s)", () => {
    skipIf(
      "GET /en/ on Slow 3G still returns <400 within 8s",
      async () => {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/`, {
            method: "GET",
            timeoutMs: BUDGET.SLOW_3G_PER_REQUEST_MS,
          }),
        );
        expect.soft(
          result.status,
          `expected <400 from /en/ on Slow 3G, got ${result.status}`,
        ).toBeLessThan(400);
        expect.soft(
          elapsedMs,
          `Slow 3G /en/ took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.SLOW_3G_PER_REQUEST_MS}ms`,
        ).toBeLessThan(BUDGET.SLOW_3G_PER_REQUEST_MS);
      },
      BUDGET.SLOW_3G_PER_REQUEST_MS + 2_000,
    );

    skipIfNoInternCreds(
      "POST /api/trpc/codecamp.submitQuiz on Slow 3G still returns <500 within 8s",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        const { result, elapsedMs } = await measureMs(() =>
          trpcPost("codecamp.submitQuiz", {
            cookie,
            inputJson: {
              lessonId: "00000000-0000-0000-0000-000000000000",
              answers: [],
            },
            timeoutMs: BUDGET.SLOW_3G_PER_REQUEST_MS,
          }),
        );
        expect.soft(
          result.status,
          `expected non-5xx for submitQuiz on Slow 3G, got ${result.status}`,
        ).toBeLessThan(500);
        expect.soft(
          elapsedMs,
          `Slow 3G submitQuiz took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.SLOW_3G_PER_REQUEST_MS}ms`,
        ).toBeLessThan(BUDGET.SLOW_3G_PER_REQUEST_MS);
      },
      BUDGET.SLOW_3G_PER_REQUEST_MS + 2_000,
    );
  });

  describe("Fast 4G (per-request timeout 3s)", () => {
    skipIfNoInternCreds(
      "POST /api/chat on Fast 4G reaches first byte within 3s",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE6_TEST_INTERN_USERNAME!,
          process.env.PHASE6_TEST_INTERN_PASSWORD!,
        );
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), BUDGET.FAST_4G_PER_REQUEST_MS + 2_000);
        const start = performance.now();
        try {
          const response = await fetch(`${PROD_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: cookie },
            body: JSON.stringify({ message: "ping" }),
            signal: controller.signal,
          });
          expect.soft(
            response.status,
            `expected 2xx for chat on Fast 4G, got ${response.status}`,
          ).toBeLessThan(300);
          if (!response.body) return;
          const reader = response.body.getReader();
          const { done } = await reader.read();
          const elapsedMs = performance.now() - start;
          expect.soft(done, "expected at least one chunk (first byte)").toBe(false);
          expect.soft(
            elapsedMs,
            `Fast 4G chat first byte took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.FAST_4G_PER_REQUEST_MS}ms`,
          ).toBeLessThan(BUDGET.FAST_4G_PER_REQUEST_MS);
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
        } finally {
          clearTimeout(timer);
        }
      },
      BUDGET.FAST_4G_PER_REQUEST_MS + 4_000,
    );
  });

  describe("No timeout errors (all requests resolve within budget)", () => {
    skipIf(
      "no Surrogate-Control / 5xx / network errors on the dashboard / module / admin surfaces",
      async () => {
        const probes = [
          `${PROD_URL}/en/`,
          `${PROD_URL}/en/module/dev-environment`,
          `${PROD_URL}/en/admin`,
        ];
        const failures: string[] = [];
        for (const url of probes) {
          try {
            const r = await fetchWithTimeout(url, {
              method: "GET",
              timeoutMs: BUDGET.SLOW_3G_PER_REQUEST_MS,
            });
            if (r.status >= 500) failures.push(`${url} → ${r.status}`);
          } catch (err) {
            failures.push(`${url} → ${(err as Error).message}`);
          }
        }
        expect.soft(
          failures,
          `slow-connection failures: ${failures.join("; ")}`,
        ).toEqual([]);
      },
      BUDGET.SLOW_3G_PER_REQUEST_MS * 3 + 4_000,
    );
  });
});

/**
 * Phase 6 P1 launch gate — a single hard-failing test that summarizes
 * the production performance & latency posture across the four tasks
 * in the plan. Unlike the per-budget checks above (which use
 * `expect.soft` so a single run can enumerate all budget violations),
 * this gate fails fast on the first gap with a list of every critical
 * over-budget probe, so CI can flag P1 regressions in a single
 * assertion.
 *
 * All sub-checks are P1 per plan.md §Phase 6 — should pass before
 * public launch, but a P0 launch (Phases 1–5) does not block on
 * Phase 6. A failure here becomes a P1 ticket, not a P0 blocker.
 */
describe("Phase 6 — P1 launch gate (single hard assertion)", () => {
  skipIf(
    "all Phase 6 unauth P1 performance budgets are met (launch gate)",
    async () => {
      const overBudget: string[] = [];

      // 1. Dashboard cold-start budget.
      {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" }),
        );
        if (result.status !== 200) {
          overBudget.push(`GET /en/ (cold) returned ${result.status} (expected 200)`);
        } else if (elapsedMs >= BUDGET.DASHBOARD_COLD_MS) {
          overBudget.push(
            `GET /en/ (cold) took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.DASHBOARD_COLD_MS}ms`,
          );
        }
      }

      // 2. Dashboard warm budget.
      {
        await fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" });
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/`, { method: "GET" }),
        );
        if (result.status !== 200) {
          overBudget.push(`GET /en/ (warm) returned ${result.status} (expected 200)`);
        } else if (elapsedMs >= BUDGET.DASHBOARD_WARM_MS) {
          overBudget.push(
            `GET /en/ (warm) took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.DASHBOARD_WARM_MS}ms`,
          );
        }
      }

      // 3. Module page budget.
      {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/module/dev-environment`, { method: "GET" }),
        );
        if (result.status >= 400) {
          overBudget.push(
            `GET /en/module/dev-environment returned ${result.status} (expected <400)`,
          );
        } else if (elapsedMs >= BUDGET.MODULE_PAGE_MS) {
          overBudget.push(
            `GET /en/module/dev-environment took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.MODULE_PAGE_MS}ms`,
          );
        }
      }

      // 4. Admin page budget.
      {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(`${PROD_URL}/en/admin`, {
            method: "GET",
            redirect: "manual",
          }),
        );
        if (result.status < 300 || result.status >= 400) {
          overBudget.push(`GET /en/admin returned ${result.status} (expected 3xx redirect)`);
        } else if (elapsedMs >= BUDGET.ADMIN_PAGE_MS) {
          overBudget.push(
            `GET /en/admin took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.ADMIN_PAGE_MS}ms`,
          );
        }
      }

      // 5. Chat unauth first-byte budget.
      {
        const { result, elapsedMs } = await measureMs(() =>
          fetchWithTimeout(
            `${PROD_URL}/api/chat`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: "ping" }),
              timeoutMs: BUDGET.CHAT_FIRST_TOKEN_MS,
            },
          ),
        );
        if (result.status !== 401) {
          overBudget.push(`POST /api/chat (unauth) returned ${result.status} (expected 401)`);
        } else if (elapsedMs >= BUDGET.CHAT_FIRST_TOKEN_MS) {
          overBudget.push(
            `POST /api/chat (unauth) took ${elapsedMs.toFixed(0)}ms — budget ${BUDGET.CHAT_FIRST_TOKEN_MS}ms`,
          );
        }
      }

      expect(
        overBudget,
        `Phase 6 P1 launch gate failed — ${overBudget.length} budget violation(s): ${overBudget.join("; ")}`,
      ).toEqual([]);
    },
    BUDGET.SLOW_3G_PER_REQUEST_MS + 20_000,
  );
});

// ─── Unit tests (no network) ───────────────────────────────
//
// These run unconditionally so a regression in the asset-parser
// helper or the budget math fails the suite immediately (rather than
// masquerading as a production budget gap in the network probes).
// Mirrors the Phase 3/4/5 pattern of including pure unit tests for
// helper functions.

describe("Phase 6 — helper unit tests", () => {
  describe("extractScriptUrls", () => {
    it("captures script src= attributes", () => {
      const html = `<script src="/_next/static/chunks/main.js"></script>`;
      expect(extractScriptUrls(html)).toContain("/_next/static/chunks/main.js");
    });

    it("captures single-quoted src= attributes", () => {
      const html = `<script src='/_next/static/chunks/main.js'></script>`;
      expect(extractScriptUrls(html)).toContain("/_next/static/chunks/main.js");
    });

    it("captures preload font links", () => {
      const html = `<link rel="preload" as="font" href="/_next/static/media/noto-sans-thai.woff2" crossorigin>`;
      expect(extractScriptUrls(html)).toContain("/_next/static/media/noto-sans-thai.woff2");
    });

    it("captures preload font links regardless of attribute order", () => {
      const html = `<link href="/_next/static/media/noto-sans-thai.woff2" as="font" rel="preload" crossorigin>`;
      expect(extractScriptUrls(html)).toContain("/_next/static/media/noto-sans-thai.woff2");
    });

    it("does not capture non-font preload links", () => {
      const html = `<link rel="preload" as="script" href="/_next/static/chunks/main.js">`;
      expect(extractScriptUrls(html)).not.toContain("/_next/static/chunks/main.js");
    });

    it("does not infer Thai font loading from a generic Next font class", () => {
      const html = `<html class="next-font-a1b2c3"><head><link rel="preload" as="font" href="/_next/static/media/inter.woff2"></head></html>`;
      const fontCandidates = extractScriptUrls(html).filter(
        (u) => /\.(woff2?|ttf|otf)(\?|$)/i.test(u) || /\/font/i.test(u),
      );
      expect(fontCandidates.filter((u) => /thai|noto/i.test(u))).toEqual([]);
    });

    it("recognizes Thai font loading from the font URL", () => {
      const html = `<link rel="preload" as="font" href="/_next/static/media/noto-sans-thai.woff2">`;
      const fontCandidates = extractScriptUrls(html).filter(
        (u) => /\.(woff2?|ttf|otf)(\?|$)/i.test(u) || /\/font/i.test(u),
      );
      expect(fontCandidates.filter((u) => /thai|noto/i.test(u))).toContain(
        "/_next/static/media/noto-sans-thai.woff2",
      );
    });

    it("deduplicates repeated URLs", () => {
      const html = `<script src="/a.js"></script><script src="/a.js"></script>`;
      expect(extractScriptUrls(html).filter((u) => u === "/a.js")).toHaveLength(1);
    });

    it("returns an empty array for HTML with no script/preload tags", () => {
      const html = `<p>no scripts</p>`;
      expect(extractScriptUrls(html)).toEqual([]);
    });
  });

  describe("resolveAssetUrl", () => {
    it("passes https:// URLs through unchanged", () => {
      expect(resolveAssetUrl("https://cdn.example.com/a.js")).toBe("https://cdn.example.com/a.js");
    });

    it("upgrades protocol-relative // URLs to https://", () => {
      expect(resolveAssetUrl("//cdn.example.com/a.js")).toBe("https://cdn.example.com/a.js");
    });

    it("prefixes / relative paths with the prod origin", () => {
      expect(resolveAssetUrl("/_next/static/a.js")).toBe(`${PROD_URL}/_next/static/a.js`);
    });

    it("rejects non-URL values (e.g. raw identifiers)", () => {
      expect(resolveAssetUrl("not-a-url")).toBeNull();
    });
  });

  describe("BUDGET constants", () => {
    it("warm dashboard budget is strictly less than cold dashboard budget", () => {
      expect(BUDGET.DASHBOARD_WARM_MS).toBeLessThan(BUDGET.DASHBOARD_COLD_MS);
    });

    it("module page budget is at most 2 seconds", () => {
      expect(BUDGET.MODULE_PAGE_MS).toBeLessThanOrEqual(2_000);
    });

    it("moduleBySlug API budget is at most 300ms", () => {
      expect(BUDGET.MODULE_BY_SLUG_API_MS).toBeLessThanOrEqual(300);
    });

    it("lesson API budget is at most 300ms", () => {
      expect(BUDGET.LESSON_API_MS).toBeLessThanOrEqual(300);
    });

    it("main JS gzipped budget is 500KB", () => {
      expect(BUDGET.MAIN_JS_GZIPPED_BYTES).toBe(500 * 1024);
    });
  });

  describe("extractImageUrls", () => {
    it("captures <img src=> attributes", () => {
      const html = `<img src="/_next/static/media/avatar.png" alt="me">`;
      expect(extractImageUrls(html)).toContain("/_next/static/media/avatar.png");
    });

    it("captures single-quoted src= attributes", () => {
      const html = `<img src='/_next/static/media/avatar.png'>`;
      expect(extractImageUrls(html)).toContain("/_next/static/media/avatar.png");
    });

    it("captures lazy-loaded data-src= attributes", () => {
      const html = `<img data-src="https://cdn.example.com/lazy.png" class="lazy">`;
      expect(extractImageUrls(html)).toContain("https://cdn.example.com/lazy.png");
    });

    it("captures the first URL of each srcset= entry", () => {
      const html = `<img srcset="/img-1x.png 1x, /img-2x.png 2x" src="/img-1x.png">`;
      const urls = extractImageUrls(html);
      expect(urls).toContain("/img-1x.png");
      expect(urls).toContain("/img-2x.png");
    });

    it("returns an empty array for HTML with no <img> tags", () => {
      const html = `<p>no images, only lucide-react inline SVG</p>`;
      expect(extractImageUrls(html)).toEqual([]);
    });

    it("deduplicates repeated URLs", () => {
      const html = `<img src="/a.png"><img src="/a.png"><img data-src="/a.png">`;
      expect(extractImageUrls(html).filter((u) => u === "/a.png")).toHaveLength(1);
    });
  });

  describe("countRenderBlockingScripts", () => {
    it("returns 0 for a head with no scripts", () => {
      const html = `<html><head><title>x</title></head><body></body></html>`;
      expect(countRenderBlockingScripts(html)).toBe(0);
    });

    it("returns 0 when every external script has async or defer", () => {
      const html = `
        <html>
          <head>
            <script src="/a.js" async></script>
            <script src="/b.js" defer></script>
            <script type="module" src="/c.js"></script>
          </head>
          <body></body>
        </html>
      `;
      expect(countRenderBlockingScripts(html)).toBe(0);
    });

    it("counts synchronous external <script src=...> in <head>", () => {
      const html = `
        <html>
          <head>
            <script src="/a.js" async></script>
            <script src="/blocker.js"></script>
          </head>
          <body></body>
        </html>
      `;
      expect(countRenderBlockingScripts(html)).toBe(1);
    });

    it("ignores inline scripts (no src= attribute)", () => {
      const html = `
        <html>
          <head>
            <script>window.__NEXT_DATA__ = {};</script>
            <script src="/blocker.js"></script>
          </head>
          <body></body>
        </html>
      `;
      expect(countRenderBlockingScripts(html)).toBe(1);
    });

    it("ignores scripts in <body> (only counts <head>)", () => {
      const html = `
        <html>
          <head><title>x</title></head>
          <body>
            <script src="/body-blocker.js"></script>
          </body>
        </html>
      `;
      expect(countRenderBlockingScripts(html)).toBe(0);
    });
  });
});
