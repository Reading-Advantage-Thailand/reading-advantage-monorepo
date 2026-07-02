import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { RUN_LIVE_SMOKE, resolveLiveSmokeUrl } from "./_helpers/live-smoke-guard";

/**
 * Phase 1 — Infrastructure & Deployment Verification (P0)
 *
 * Black-box smoke tests for the deployed production service at
 * https://codecamp.reading-advantage.com (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * These tests encode the Phase 1 acceptance criteria as executable contract.
 * They will fail (Red) until:
 *   (a) the deployment exposes the expected headers / status codes, and
 *   (b) a test runner can reach the public production URL.
 *
 * Two valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach prod) —
 *      indicates the probe must be run from a network that can reach prod.
 *   2. Assertion failure (prod reachable, but the contract is unmet) —
 *      indicates a real production gap to file as a follow-up track.
 *
 * Set PHASE1_PROD_URL to override the default target (useful for staging).
 * Set PHASE1_SKIP=1 to skip the entire suite in environments without network.
 */

const PROD_URL = resolveLiveSmokeUrl("PHASE1_PROD_URL") ?? "";
const SKIP = process.env.PHASE1_SKIP === "1";
const REQUEST_TIMEOUT_MS = 5_000;
const COLD_START_BUDGET_MS = 5_000;

const skipIf = !RUN_LIVE_SMOKE || SKIP ? it.skip : it;

const fetchWithTimeout = async (
  input: string,
  init: RequestInit & { redirect?: RequestRedirect } = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
};

describe("Phase 1 — DNS & SSL", () => {
  beforeAll(() => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    expect(PROD_URL, "PHASE1_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  skipIf("production URL resolves to a reachable host", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    expect.soft(response, "fetch should not throw and should return a Response").toBeDefined();
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("SSL certificate is valid (HTTPS request succeeds without TLS error)", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    expect.soft([200, 301, 302, 307, 308]).toContain(response.status);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("HTTP → HTTPS redirect is configured", async () => {
    const httpUrl = PROD_URL.replace(/^https:/, "http:");
    const response = await fetchWithTimeout(httpUrl, { method: "GET" });
    expect.soft([301, 302, 307, 308]).toContain(response.status);
    const location = response.headers.get("location") ?? "";
    expect.soft(location.startsWith("https://"), `expected redirect to https://, got ${location}`).toBe(true);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("HSTS header (Strict-Transport-Security) is present", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const hsts = response.headers.get("strict-transport-security");
    expect.soft(hsts, "HSTS header missing — set in next.config.ts headers()").toBeTruthy();
    expect.soft(hsts ?? "").toMatch(/max-age=\d+/);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf(
    "rendered HTML contains no http:// resource references (no mixed content)",
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(PROD_URL, {
          redirect: "follow",
          signal: controller.signal,
        });
        expect.soft(response.status, `expected 2xx/3xx chain, got ${response.status}`).toBeLessThan(400);
        const body = await response.text();
        expect(body.length, "expected non-empty response body — network did not reach prod").toBeGreaterThan(0);
        const refs = extractResourceReferences(body);
        const mixed = refs.filter((r) => /^http:\/\//i.test(r) || /^\/\//.test(r));
        expect.soft(
          mixed,
          `mixed-content references found: ${mixed.slice(0, 5).join(", ")} (total ${refs.length} refs scanned)`,
        ).toEqual([]);
      } finally {
        clearTimeout(timer);
      }
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );
});

describe("Phase 1 — Cloud Run health", () => {
  skipIf("root URL returns 200 (following locale redirect)", async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(PROD_URL, { redirect: "follow", signal: controller.signal });
      expect.soft(response.status, `expected 200 after following redirects, got ${response.status}`).toBe(200);
    } finally {
      clearTimeout(timer);
    }
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("/api/auth/session returns 200 (unauthenticated)", async () => {
    const response = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, { method: "GET" });
    expect.soft(response.status, `expected 200, got ${response.status}`).toBe(200);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("response includes X-Cloud-Trace-Context header (Cloud Run)", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const trace = response.headers.get("x-cloud-trace-context");
    expect.soft(trace, "X-Cloud-Trace-Context header missing — Cloud Run should inject it").toBeTruthy();
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("cold start returns 2xx (no 502/503)", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    expect.soft(response.status).toBeLessThan(400);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("cold start time is within budget", async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const start = Date.now();
    try {
      const response = await fetch(PROD_URL, { redirect: "follow", signal: controller.signal });
      const elapsed = Date.now() - start;
      expect.soft(response.status).toBe(200);
      expect.soft(elapsed, `cold start took ${elapsed}ms`).toBeLessThan(COLD_START_BUDGET_MS);
    } finally {
      clearTimeout(timer);
    }
  }, REQUEST_TIMEOUT_MS + 2_000);
});

describe("Phase 1 — Security headers", () => {
  skipIf("Content-Security-Policy header is present", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const csp = response.headers.get("content-security-policy");
    expect.soft(csp, "CSP header missing — set in next.config.ts headers()").toBeTruthy();
    expect.soft(csp ?? "").toMatch(/default-src/);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("X-Frame-Options is DENY or SAMEORIGIN", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const xfo = response.headers.get("x-frame-options");
    expect.soft(xfo, "X-Frame-Options missing — set in next.config.ts headers()").toBeTruthy();
    const normalized = (xfo ?? "").toUpperCase();
    expect.soft(["DENY", "SAMEORIGIN"]).toContain(normalized);
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("X-Content-Type-Options is nosniff", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const xcto = response.headers.get("x-content-type-options");
    expect.soft(xcto, "X-Content-Type-Options missing").toBeTruthy();
    expect.soft((xcto ?? "").toLowerCase()).toBe("nosniff");
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("Referrer-Policy header is set", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const rp = response.headers.get("referrer-policy");
    expect.soft(rp, "Referrer-Policy missing — set in next.config.ts headers()").toBeTruthy();
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("CORS headers correct for API routes (Access-Control-Allow-Origin present)", async () => {
    const response = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
      method: "OPTIONS",
      headers: { "Origin": PROD_URL, "Access-Control-Request-Method": "GET" },
    });
    const aco = response.headers.get("access-control-allow-origin");
    expect.soft(aco, "Access-Control-Allow-Origin missing on CORS preflight").toBeTruthy();
  }, REQUEST_TIMEOUT_MS + 2_000);

  afterAll(() => {
    if (SKIP) {
      console.warn("[phase-1-infrastructure] PHASE1_SKIP=1 — suite skipped");
    }
  });
});

/**
 * Phase 1 P0 launch-gate — a single hard-failing test that summarizes
 * the production security-header posture. Unlike the per-header checks
 * above (which use `expect.soft` so a run can enumerate all missing
 * headers in one pass), this gate fails fast on the first gap with a
 * list of every missing critical header, so CI can block deploys to
 * public launch.
 *
 * All sub-checks are P0 per plan.md §Phase 1 — must pass before the
 * codecamp.reading-advantage.com domain accepts public traffic.
 */
describe("Phase 1 — P0 launch gate (single hard assertion)", () => {
  skipIf(
    "all critical security headers are present (P0 launch gate)",
    async () => {
      const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
      expect(response.status, `expected 2xx/3xx from root URL, got ${response.status}`).toBeLessThan(400);
      const missing: string[] = [];
      const csp = response.headers.get("content-security-policy");
      if (!csp || !/default-src/.test(csp)) missing.push("Content-Security-Policy (default-src)");
      const hsts = response.headers.get("strict-transport-security");
      if (!hsts || !/max-age=\d+/.test(hsts)) missing.push("Strict-Transport-Security (max-age)");
      const xfo = response.headers.get("x-frame-options");
      if (!xfo || !["DENY", "SAMEORIGIN"].includes(xfo.toUpperCase())) missing.push("X-Frame-Options (DENY|SAMEORIGIN)");
      const xcto = response.headers.get("x-content-type-options");
      if ((xcto ?? "").toLowerCase() !== "nosniff") missing.push("X-Content-Type-Options (nosniff)");
      const rp = response.headers.get("referrer-policy");
      if (!rp) missing.push("Referrer-Policy");
      expect(
        missing,
        `P0 launch gate failed — ${missing.length} critical security header(s) missing: ${missing.join(", ")}`,
      ).toEqual([]);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );
});

describe("extractResourceReferences (helper unit tests)", () => {
  it("captures absolute https:// URLs in src and href", () => {
    const html = `<a href="https://example.com/page">x</a><img src="https://cdn.example.com/a.png">`;
    const refs = extractResourceReferences(html);
    expect(refs).toContain("https://example.com/page");
    expect(refs).toContain("https://cdn.example.com/a.png");
  });

  it("captures http:// URLs (mixed-content markers)", () => {
    const html = `<img src="http://insecure.example.com/a.png">`;
    const refs = extractResourceReferences(html);
    expect(refs.some((r) => r.startsWith("http://"))).toBe(true);
  });

  it("captures protocol-relative // URLs (mixed-content markers)", () => {
    const html = `<script src="//cdn.example.com/a.js"></script>`;
    const refs = extractResourceReferences(html);
    expect(refs.some((r) => r.startsWith("//"))).toBe(true);
  });

  it("captures single-quoted attributes", () => {
    const html = `<img src='https://example.com/a.png'>`;
    const refs = extractResourceReferences(html);
    expect(refs).toContain("https://example.com/a.png");
  });

  it("captures data: and mailto: URLs", () => {
    const html = `<a href="mailto:hi@example.com">m</a><img src="data:image/png;base64,AAA">`;
    const refs = extractResourceReferences(html);
    expect(refs).toContain("mailto:hi@example.com");
    expect(refs.some((r) => r.startsWith("data:"))).toBe(true);
  });

  it("captures root-relative paths", () => {
    const html = `<link rel="stylesheet" href="/_next/static/css/x.css">`;
    const refs = extractResourceReferences(html);
    expect(refs).toContain("/_next/static/css/x.css");
  });

  it("returns empty array for html with no resource attributes", () => {
    const html = `<p>hello</p>`;
    const refs = extractResourceReferences(html);
    expect(refs).toEqual([]);
  });

  it("captures data-src (lazy-load) attributes", () => {
    const html = `<img data-src="https://cdn.example.com/lazy.png">`;
    const refs = extractResourceReferences(html);
    expect(refs).toContain("https://cdn.example.com/lazy.png");
  });
});

/**
 * Extracts resource URLs (src, href, action, poster, data-src) from an HTML
 * document. Captures protocol-relative `//host/path` and absolute `http(s)://`
 * URLs only — leaves relative paths and `data:`/`mailto:` URLs alone.
 *
 * Used by the no-mixed-content check: any `http://` or protocol-relative `//`
 * reference rendered on an HTTPS page is a mixed-content violation.
 */
function extractResourceReferences(html: string): string[] {
  const refs: string[] = [];
  const attrRe = /\b(?:src|href|action|poster|data-src)\s*=\s*"([^"]+)"|\b(?:src|href|action|poster|data-src)\s*=\s*'([^']+)'/gi;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(html)) !== null) {
    const value = match[1] ?? match[2] ?? "";
    if (!value) continue;
    if (
      /^https?:\/\//i.test(value) ||
      /^\/\//.test(value) ||
      /^data:/i.test(value) ||
      /^mailto:/i.test(value) ||
      value.startsWith("/") ||
      value.startsWith("#") ||
      value.startsWith("?")
    ) {
      refs.push(value);
    }
  }
  return refs;
}
