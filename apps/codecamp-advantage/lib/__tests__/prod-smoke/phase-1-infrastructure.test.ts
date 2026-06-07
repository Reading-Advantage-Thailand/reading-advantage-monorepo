import { describe, it, expect, beforeAll, afterAll } from "vitest";

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

const PROD_URL = process.env.PHASE1_PROD_URL ?? "https://codecamp.reading-advantage.com";
const SKIP = process.env.PHASE1_SKIP === "1";
const REQUEST_TIMEOUT_MS = 5_000;
const COLD_START_BUDGET_MS = 5_000;

const skipIf = SKIP ? it.skip : it;

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
    if (SKIP) return;
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
});

describe("Phase 1 — Cloud Run health", () => {
  skipIf("root URL returns 200", async () => {
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    expect.soft(response.status, `expected 200, got ${response.status}`).toBe(200);
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
    const start = Date.now();
    const response = await fetchWithTimeout(PROD_URL, { method: "GET" });
    const elapsed = Date.now() - start;
    expect.soft(response.status).toBe(200);
    expect.soft(elapsed, `cold start took ${elapsed}ms`).toBeLessThan(COLD_START_BUDGET_MS);
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
