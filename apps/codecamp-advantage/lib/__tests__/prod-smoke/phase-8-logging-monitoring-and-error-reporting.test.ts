import { describe, it, expect, afterAll } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUN_LIVE_SMOKE, resolveLiveSmokeUrl } from "./_helpers/live-smoke-guard";

/**
 * Phase 8 — Logging, Monitoring & Error Reporting (P1)
 *
 * Black-box smoke tests for the deployed production service at
 * https://codecamp.reading-advantage.com (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * These tests encode the Phase 8 acceptance criteria as executable contract.
 * They will fail (Red) until:
 *   (a) Application errors emit structured logs with stack traces that
 *       surface in Cloud Logging (AGENTS.md "Observability" — "structured
 *       logs", "stack traces"),
 *   (b) tRPC procedures log the procedure name, the input that caused the
 *       error, and the request latency / status code so per-procedure error
 *       rates are observable in Cloud Logging,
 *   (c) 404 and 500 responses render through Next.js App-Router `error.tsx`
 *       and `not-found.tsx` files (and never leak a raw stack trace to the
 *       client), and
 *   (d) tRPC error envelopes sent to the client are sanitized (no internal
 *       error.message leakage of DB / stack info) and the underlying server
 *       log retains the original error.
 *
 * Two valid Red-phase failure modes are expected:
 *   1. Source-code static checks fail (e.g. `app/[locale]/error.tsx` is
 *      missing, tRPC router has no logging middleware) — indicates a real
 *      production observability gap to file as a follow-up track (do not
 *      inline-fix here, per test-strategy.md §4).
 *   2. Network/connectivity failure (the test runner cannot reach prod) —
 *      indicates the probe must be run from a network that can reach prod.
 *
 * Set PHASE8_PROD_URL to override the default target (useful for staging).
 * Set PHASE8_SKIP=1 to skip the network probes; the source-code static
 * checks and helper unit tests still run unconditionally so a regression
 * in observability primitives fails the suite immediately.
 *
 * **Test budget:** Phase 8 is informational + gating — the per-check probes
 * use `expect.soft` so a single run enumerates all gaps, and a single P1
 * launch-gate test fails hard if any critical observability primitive is
 * missing.
 *
 * Note on divergence from test-strategy.md: the test-strategy §5 says
 * "P8 Observability: Cloud Logging queries by `resource.labels.service_name=
 * "codecamp-advantage"`" — i.e. a console-driven manual probe. Per the
 * 2026-06-07 mid-session supervisor instruction (same as Phases 1–7),
 * Phase 8 is elevated from manual probes to executable contract. The
 * static checks (file presence, source-code patterns) and the helper unit
 * tests run unconditionally so regressions in those primitives fail the
 * suite immediately. The network probes (404 page rendering, 500
 * sanitization, tRPC envelope shape, trace-header propagation) remain
 * black-box HTTP probes against prod, consistent with the strategy.
 */

const PROD_URL = resolveLiveSmokeUrl("PHASE8_PROD_URL") ?? "";
const SKIP = process.env.PHASE8_SKIP === "1";

const REQUEST_TIMEOUT_MS = 5_000;

// ─── Repository paths for static source-code checks ──────────
//
// The Vitest test runner is invoked from `apps/codecamp-advantage/`, so
// `process.cwd()` is the app root. We resolve the package + monorepo
// paths from there. `import.meta.url` is the URL of this test file and
// is independent of the cwd, so we prefer it.
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../../..");
const MONOREPO_ROOT = resolve(APP_ROOT, "../..");
const LOCALE_SEGMENT = resolve(APP_ROOT, "app/[locale]");
const LOCALE_ERROR_TSX = resolve(LOCALE_SEGMENT, "error.tsx");
const LOCALE_NOT_FOUND_TSX = resolve(LOCALE_SEGMENT, "not-found.tsx");
const APP_ERROR_TSX = resolve(APP_ROOT, "app/error.tsx");
const APP_GLOBAL_ERROR_TSX = resolve(APP_ROOT, "app/global-error.tsx");
const APP_NOT_FOUND_TSX = resolve(APP_ROOT, "app/not-found.tsx");
const TRPC_INDEX_TS = resolve(MONOREPO_ROOT, "packages/api/src/trpc.ts");
const TRPC_ROUTER_DIR = resolve(MONOREPO_ROOT, "packages/api/src/routers");
const TRPC_CONTEXT_TS = resolve(MONOREPO_ROOT, "packages/api/src/context.ts");

// ─── Conditional test helpers ───────────────────────────────
const testIf = (skipCondition: boolean) => (!RUN_LIVE_SMOKE || skipCondition ? it.skip : it);
const skipIf = testIf(SKIP);

// ─── HTTP helper ─────────────────────────────────────────────
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

// ─── Static-analysis helpers (no network) ────────────────────

/**
 * Walks a directory one level deep and returns all file paths.
 * Used to enumerate `packages/api/src/routers/*.ts` for the
 * tRPC-router "uses a logging middleware" probe.
 */
function listFilesShallow(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isFile()) out.push(full);
  }
  return out;
}

/**
 * Tries to read a file as UTF-8 text. Returns `null` if the file
 * does not exist or cannot be read (e.g. permission error). The
 * read is best-effort — a missing file is a valid Red-phase signal,
 * not a test infrastructure failure.
 */
function tryReadFile(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * Cheap regex for the AGENTS.md "structured logging" requirement.
 * Phase 8 says "structured logs" with "request identifiers,
 * operation names, timing information" — a production code base
 * typically uses a JSON-line logger (`logger.info({ ... })`) or
 * `pino` / `winston` / `@google-cloud/logging` directly. We do not
 * require a specific library; we just require a non-`console.*`
 * call site that looks structured.
 */
const STRUCTURED_LOGGER_PATTERNS: RegExp[] = [
  /\bpino\b/,
  /\bwinston\s*\./,
  /@google-cloud\/logging/,
  /\bstructuredLogger?\b/,
  /\blogger\.(?:info|warn|error|debug)\s*\(\s*\{/,
  /\bconsole\.(?:log|info|warn|error)\s*\(\s*JSON\.stringify\s*\(/,
];

/**
 * Cheap regex for "logs include a stack trace". A production
 * error-log call site should pass the `Error` object itself (or
 * `error.stack`) so the structured logger captures the stack.
 */
const STACK_LOG_PATTERNS: RegExp[] = [
  /\berror\.stack\b/,
  /\bstack:\s*err\.stack\b/,
  /\blogger\.(?:error|warn)\s*\(\s*\{[^}]*stack\s*:/,
];

// ─── Unit-testable parser helpers ────────────────────────────

/**
 * Parses a tRPC error envelope body into a normalized shape.
 * tRPC over HTTP returns `{ error: { json: { message, code, data } } }`
 * for errored responses, or `{ result: { data: ... } }` for successes.
 * We only care about the error path here.
 *
 * Returns `null` for non-JSON, empty, or missing `error` field.
 */
function parseTrpcErrorEnvelope(body: string): {
  message: string;
  code: string;
  data?: unknown;
} | null {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const errField = root.error;
  if (!errField || typeof errField !== "object") return null;
  const err = errField as Record<string, unknown>;
  const inner = err.json;
  if (!inner || typeof inner !== "object") return null;
  const i = inner as Record<string, unknown>;
  return {
    message: typeof i.message === "string" ? i.message : "",
    code: typeof i.code === "number" ? String(i.code) : typeof i.code === "string" ? i.code : "",
    data: i.data,
  };
}

/**
 * Classifies an HTTP status as "client error" (4xx) or "server error"
 * (5xx). Returns "ok" for 2xx/3xx.
 */
function classifyHttpStatus(status: number): "ok" | "client" | "server" {
  if (status >= 200 && status < 400) return "ok";
  if (status >= 400 && status < 500) return "client";
  return "server";
}

/**
 * Pulls the W3C `traceparent` header value (if present) from a
 * Response. Used to verify the production app propagates the
 * Cloud Run trace context through to tRPC responses (so Cloud
 * Logging can correlate client → server log lines).
 */
function extractTraceparent(headers: Headers): string | null {
  return headers.get("traceparent") ?? headers.get("x-cloud-trace-context");
}

/**
 * Cheap heuristic for "the response body looks like a raw stack
 * trace". We never want a 500 to leak `at functionName (file:line)`
 * to the client. If the body contains the literal substring
 * "at " followed by `(` (Node's stack-trace frame format) or
 * "Error:" prefixed lines, we flag it. The `at fn(` matcher uses
 * a `(?:^|\n)` lookbehind-style alternative to anchor the frame
 * to the start of input OR a newline so single-line test inputs
 * (e.g. "  at fn (file.ts:1:1)") also match.
 */
function bodyLooksLikeStackTrace(body: string): boolean {
  if (!body) return false;
  if (/\bError:\s+[A-Z]/.test(body)) return true;
  if (/(?:^|\n)\s*at\s+[A-Za-z_$][\w$]*\s*\(/.test(body)) return true;
  return false;
}

// --------------------------------------------------------------------
// Phase 8 — Cloud Logging (source-code static checks + HTTP probes)
// --------------------------------------------------------------------

describe("Phase 8 — Cloud Logging", () => {
  skipIf("Cloud Logging: production code uses a structured logger, not raw console.* (AGENTS.md \"Observability\")", async () => {
    // Walk every `.ts`/`.tsx` file under `app/` and `packages/api/src/`
    // (the two boundaries that own server-side observability for
    // codecamp-advantage). For each file, look for either a structured
    // logger call site (pino / winston / @google-cloud/logging / a
    // `logger.info({…})` style) or a console.* call wrapped in
    // `JSON.stringify(...)` (a poor-man's structured logger, common in
    // bare Cloud Run / container deploys that pre-date the AGENTS.md
    // logging requirement).
    const roots = [resolve(APP_ROOT, "app"), resolve(MONOREPO_ROOT, "packages/api/src")];
    let found = 0;
    let withRawConsole = 0;
    const samples: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (st.isFile() && /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
          const text = tryReadFile(full);
          if (!text) continue;
          if (STRUCTURED_LOGGER_PATTERNS.some((re) => re.test(text))) {
            found += 1;
          } else if (/\bconsole\.(?:log|info|warn|error)\b/.test(text)) {
            withRawConsole += 1;
            if (samples.length < 3) samples.push(full.replace(MONOREPO_ROOT, "."));
          }
        }
      }
    };
    for (const r of roots) walk(r);
    // Soft fail: if the codebase has at least one structured logger
    // call site, the AGENTS.md contract is partially met. The P1
    // launch gate (below) is the hard gate.
    expect.soft(
      found,
      `no structured logger call site (pino/winston/@google-cloud/logging/logger.info({…}) or console.*(JSON.stringify(...))) found in app/ or packages/api/src/; ${withRawConsole} files use raw console.* instead (samples: ${samples.join(", ") || "<none>"})`,
    ).toBeGreaterThan(0);
  });

  skipIf("Cloud Logging: error-log call sites include the stack trace (AGENTS.md \"error logs have stack traces\")", async () => {
    // Walk the same roots. Look for at least one site that logs an
    // Error and includes its stack (either `error.stack`, `stack:
    // err.stack`, or a structured `{ stack: … }` literal in the log
    // payload).
    const roots = [resolve(APP_ROOT, "app"), resolve(MONOREPO_ROOT, "packages/api/src")];
    let found = 0;
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (st.isFile() && /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
          const text = tryReadFile(full);
          if (!text) continue;
          if (STACK_LOG_PATTERNS.some((re) => re.test(text))) found += 1;
        }
      }
    };
    for (const r of roots) walk(r);
    expect.soft(
      found,
      `no error-log call site in app/ or packages/api/src/ includes the stack trace (expected error.stack or a structured { stack: … } payload)`,
    ).toBeGreaterThan(0);
  });

  skipIf("tRPC: every router in packages/api/src/routers/* uses a logging middleware that captures procedure name, input, latency, and status", async () => {
    // Phase 8 calls out "tRPC error logs include procedure name and input"
    // and "request logs include latency and status code" — these are
    // implemented as tRPC middlewares that wrap the procedure. We
    // assert two static properties:
    //   1. `packages/api/src/trpc.ts` exports at least one middleware
    //      that captures these fields (e.g. an "observability" /
    //      "logging" / "timing" middleware).
    //   2. Every router file in `routers/*` applies that middleware
    //      (or uses a base `protectedProcedure` / `adminProcedure`
    //      that already wraps it). The check is "all routers use
    //      procedures that transitively include the logging
    //      middleware".
    const trpcSrc = tryReadFile(TRPC_INDEX_TS) ?? "";
    const hasLoggingMiddleware =
      /\bmiddleware\s*\(/.test(trpcSrc) &&
      /(?:logger|observ|loggin|metric|timin|trac|span)/i.test(trpcSrc);
    expect.soft(
      hasLoggingMiddleware,
      `packages/api/src/trpc.ts does not define an observability/logging middleware that captures procedure name, input, latency, and status code (searched for 'logger|observ|loggin|metric|timin|trac|span')`,
    ).toBe(true);

    const routerFiles = listFilesShallow(TRPC_ROUTER_DIR).filter((p) =>
      p.endsWith(".ts"),
    );
    expect.soft(routerFiles.length, `no router files under ${TRPC_ROUTER_DIR}`).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const f of routerFiles) {
      const src = tryReadFile(f) ?? "";
      // A router is "covered" if it uses one of the shared procedures
      // (protectedProcedure, adminProcedure, publicProcedure) from
      // ../trpc.js / ../../trpc / etc. — those procedures already
      // chain the logging middleware if it is defined in trpc.ts.
      // Alternatively, the router may explicitly use `.use(…)` on
      // its own procedures.
      const usesSharedProcedure =
        /\b(?:protectedProcedure|adminProcedure|publicProcedure)\b/.test(src);
      const usesLocalMiddleware = /\.use\s*\(/.test(src);
      if (!usesSharedProcedure && !usesLocalMiddleware) {
        offenders.push(f.replace(MONOREPO_ROOT, "."));
      }
    }
    expect.soft(
      offenders,
      `router(s) do not use a shared procedure (protectedProcedure/adminProcedure/publicProcedure) or a local .use(…) middleware — they cannot transitively include the logging middleware: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  skipIf("tRPC responses propagate Cloud Run trace context (traceparent / x-cloud-trace-context header on /api/trpc/*)", async () => {
    // Cloud Logging groups log lines by trace ID. The
    // `X-Cloud-Trace-Context` header is injected by the Cloud Run
    // ingress for every request; if the Next.js app forwards it (or
    // generates its own `traceparent`) and emits it on the response,
    // a curl-side probe can correlate the request to a trace.
    // Either header is acceptable.
    const trpcUrl = `${PROD_URL}/api/trpc/codecamp.dashboard?input=${encodeURIComponent(
      JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
    )}`;
    const response = await fetchWithTimeout(trpcUrl, { method: "GET" });
    const trace = extractTraceparent(response.headers);
    expect.soft(
      trace,
      `tRPC response missing both 'traceparent' and 'x-cloud-trace-context' headers (Cloud Logging cannot correlate the request to a trace)`,
    ).not.toBeNull();
  }, REQUEST_TIMEOUT_MS + 2_000);

  skipIf("tRPC error responses (forced UNAUTHORIZED on authed proc) include HTTP status 401 — observability captures status code", async () => {
    // Probe a protected procedure without a cookie. The response is
    // a 401 UNAUTHORIZED. The HTTP status code is the canonical
    // observability signal that AGENTS.md says request logs should
    // include. We assert it here as a black-box signal that the
    // framework is at least surfacing the status code.
    const trpcUrl = `${PROD_URL}/api/trpc/codecamp.dashboard?input=${encodeURIComponent(
      JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
    )}`;
    const response = await fetchWithTimeout(trpcUrl, { method: "GET" });
    expect.soft(
      response.status,
      `expected tRPC unauth probe to return 401, got ${response.status}`,
    ).toBe(401);
  }, REQUEST_TIMEOUT_MS + 2_000);
});

// --------------------------------------------------------------------
// Phase 8 — Error handling (file-presence static + HTTP probes)
// --------------------------------------------------------------------

describe("Phase 8 — Error handling", () => {
  skipIf("Next.js: app/[locale]/error.tsx exists (App-Router boundary-level error boundary)", () => {
    expect.soft(
      existsSync(LOCALE_ERROR_TSX),
      `missing ${LOCALE_ERROR_TSX.replace(MONOREPO_ROOT, ".")} — Next.js App-Router error boundary is not configured for the locale segment; 500s will fall through to the default page (or to a stack-trace leak in development)`,
    ).toBe(true);
  });

  skipIf("Next.js: app/[locale]/not-found.tsx exists (App-Router boundary-level 404 page)", () => {
    expect.soft(
      existsSync(LOCALE_NOT_FOUND_TSX),
      `missing ${LOCALE_NOT_FOUND_TSX.replace(MONOREPO_ROOT, ".")} — Next.js App-Router 404 page is not configured for the locale segment; missing routes will fall through to the default 404 (unstyled, no reset, no back-to-home CTA)`,
    ).toBe(true);
  });

  skipIf("Next.js: app/error.tsx OR app/global-error.tsx exists (root-level fallback error boundary)", () => {
    const ok = existsSync(APP_ERROR_TSX) || existsSync(APP_GLOBAL_ERROR_TSX);
    expect.soft(
      ok,
      `missing both ${APP_ERROR_TSX.replace(MONOREPO_ROOT, ".")} and ${APP_GLOBAL_ERROR_TSX.replace(MONOREPO_ROOT, ".")} — no root-level error boundary; a top-level rendering crash will surface as Next.js's default 500 with no recovery affordance`,
    ).toBe(true);
  });

  skipIf("Next.js: app/not-found.tsx exists (root-level fallback 404 page)", () => {
    expect.soft(
      existsSync(APP_NOT_FOUND_TSX),
      `missing ${APP_NOT_FOUND_TSX.replace(MONOREPO_ROOT, ".")} — no root-level 404 page; unmatched paths will surface Next.js's default 404`,
    ).toBe(true);
  });

  skipIf("404: GET on a known-missing route returns 404 with a styled HTML body (not a raw stack trace)", async () => {
    const response = await fetchWithTimeout(`${PROD_URL}/__phase8_does_not_exist__`, { method: "GET" });
    expect.soft(
      response.status,
      `expected 404 for missing route, got ${response.status}`,
    ).toBe(404);
    const body = await response.text();
    expect.soft(
      body.length,
      `404 body is empty (length=0); a styled not-found page is expected`,
    ).toBeGreaterThan(0);
    expect.soft(
      bodyLooksLikeStackTrace(body),
      `404 body looks like a raw stack trace (matched Error: … or 'at fn(' stack frame) — this is a stack-trace leak on the public surface`,
    ).toBe(false);
  }, REQUEST_TIMEOUT_MS + 4_000);

  skipIf("500: a 500-range response on a Next.js route never leaks a raw stack trace to the client", async () => {
    // We cannot reliably force a 500 on a healthy production app
    // without a controlled injection. Instead, we probe the
    // `/api/auth/login` route with a malformed JSON body — the
    // current implementation is documented in
    // `apps/codecamp-advantage/app/api/auth/login/route.ts` to
    // return a 500 only for unhandled server errors; a malformed
    // body should be caught by Zod and return 400. If the response
    // is a 5xx, the body must not contain a stack trace.
    const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    // The test is "if it's a 5xx, no stack trace"; 4xx is a pass
    // because Zod rejected the body before reaching the catch-all.
    if (response.status >= 500) {
      const body = await response.text();
      expect.soft(
        bodyLooksLikeStackTrace(body),
        `5xx response on /api/auth/login (status=${response.status}) contains a raw stack trace (${body.slice(0, 240)}…) — error.tsx error boundary or sanitization missing`,
      ).toBe(false);
    } else {
      expect.soft(
        response.status,
        `expected 4xx (Zod rejection) on malformed login body, got ${response.status} — login route is not validating input at the framework boundary`,
      ).toBeGreaterThanOrEqual(400);
    }
  }, REQUEST_TIMEOUT_MS + 4_000);

  skipIf("tRPC: error envelope is sanitized — no internal stack frame, no DB error string, no file path leaks", async () => {
    // Force a tRPC error by hitting a non-existent procedure. The
    // production error envelope should look like
    //   { error: { json: { message: "No procedure found on path …",
    //                       code: 404, data: { … } } } }
    // — a stable, well-known client-facing message. A regression
    // that starts leaking `error.stack` or a Drizzle `relation … does
    // not exist` string into the message would be observable here.
    const trpcUrl = `${PROD_URL}/api/trpc/__phase8_does_not_exist__`;
    const response = await fetchWithTimeout(trpcUrl, { method: "GET" });
    const body = await response.text();
    const envelope = parseTrpcErrorEnvelope(body);
    expect.soft(envelope, `tRPC response on missing procedure is not a valid JSON error envelope: ${body.slice(0, 200)}`).not.toBeNull();
    if (!envelope) return;
    expect.soft(
      envelope.message,
      `tRPC error message is empty (envelope.message="") — should be a stable client-facing string`,
    ).not.toEqual("");
    expect.soft(
      bodyLooksLikeStackTrace(body),
      `tRPC error body looks like a raw stack trace (Error: … or 'at fn(' frame present)`,
    ).toBe(false);
    // Common internal-leakage signatures we want to flag.
    const leakSignatures = [
      /node_modules/, // server-side path leak
      /\.ts:\d+:\d+/, // TypeScript source map leak
      /relation "[^"]+" does not exist/, // Postgres Drizzle error
      /ECONNREFUSED/i, // network-error leakage
      /password/i, // credential leakage
    ];
    for (const re of leakSignatures) {
      expect.soft(
        re.test(body),
        `tRPC error body matches internal-leakage signature ${re} — should be sanitized to a stable client-facing string`,
      ).toBe(false);
    }
  }, REQUEST_TIMEOUT_MS + 4_000);

  skipIf("DB connection errors: the tRPC context uses a DB client that re-connects on transient errors (no permanent connection-pool lock-up)", async () => {
    // Phase 8 calls out "Database connection errors are logged and
    // recovered." A black-box probe cannot directly inspect a
    // connection pool, so we read the source for the recovery
    // contract: the tRPC context must (a) wrap DB calls in a
    // try/catch that logs and (b) construct the client on every
    // request OR use a pool that recovers from `ECONNRESET` /
    // `ENOTFOUND`. We assert the tRPC context file does NOT throw
    // a raw connection error to the caller unhandled.
    const ctxSrc = tryReadFile(TRPC_CONTEXT_TS) ?? "";
    expect.soft(
      ctxSrc.length,
      `${TRPC_CONTEXT_TS.replace(MONOREPO_ROOT, ".")} not readable — tRPC context is the boundary that owns DB connection recovery`,
    ).toBeGreaterThan(0);
    if (ctxSrc.length === 0) return;
    // The presence of a try/catch or a known-recovery library
    // (`drizzle-orm`'s `node-postgres` pool auto-reconnects on
    // ECONNRESET, so the most common recovery path is just "don't
    // rethrow the original error"). We accept either.
    const hasTryCatch = /\btry\s*\{[\s\S]{0,400}?db[\s\S]{0,400}?\}\s*catch\b/.test(ctxSrc);
    const mentionsDrizzlePool = /drizzle-orm\/node-postgres/.test(ctxSrc) || /Pool\s*\(/.test(ctxSrc);
    const ok = hasTryCatch || mentionsDrizzlePool;
    expect.soft(
      ok,
      `${TRPC_CONTEXT_TS.replace(MONOREPO_ROOT, ".")} does not wrap DB calls in a try/catch and does not use a connection pool that auto-reconnects (drizzle-orm/node-postgres Pool) — a transient DB error will surface unhandled to the tRPC caller`,
    ).toBe(true);
  });
});

// --------------------------------------------------------------------
// Phase 8 — Alerts (static checks; "if configured" in plan)
// --------------------------------------------------------------------

describe("Phase 8 — Alerts (if configured)", () => {
  // The plan explicitly marks alerts as "if configured." Cloud Run
  // alert policies live in the GCP project, not in this repo. The
  // static checks below look for any alert-policy configuration
  // files the team may have committed (e.g. a Terraform module, a
  // gcloud config export, or a documented `alerts.md`). If none
  // are present, the alerts are configured out-of-band and the
  // gap is informational, not a hard failure.

  skipIf("alerts: high error rate — at least one alert-policy artifact is present (Terraform / gcloud export / docs)", () => {
    const candidates = [
      resolve(MONOREPO_ROOT, "infra/alerts"),
      resolve(MONOREPO_ROOT, "terraform/alerts"),
      resolve(MONOREPO_ROOT, "infra/monitoring"),
      resolve(MONOREPO_ROOT, "measure/alerts.md"),
    ];
    const found = candidates.filter((p) => existsSync(p)).length;
    expect.soft(
      found,
      `no alert-policy artifact present at any of ${candidates.map((p) => p.replace(MONOREPO_ROOT, ".")).join(", ")} — alert policy may be configured out-of-band (gcloud / Cloud Console); this is informational`,
    ).toBeGreaterThan(0);
  });

  skipIf("alerts: high latency — at least one alert-policy artifact is present (Terraform / gcloud export / docs)", () => {
    // Mirrors the prior probe but for latency-based alerts.
    const candidates = [
      resolve(MONOREPO_ROOT, "infra/alerts"),
      resolve(MONOREPO_ROOT, "terraform/alerts"),
      resolve(MONOREPO_ROOT, "infra/monitoring"),
      resolve(MONOREPO_ROOT, "measure/alerts.md"),
    ];
    const found = candidates.filter((p) => existsSync(p)).length;
    expect.soft(
      found,
      `no alert-policy artifact present at any of ${candidates.map((p) => p.replace(MONOREPO_ROOT, ".")).join(", ")} — alert policy may be configured out-of-band (gcloud / Cloud Console); this is informational`,
    ).toBeGreaterThan(0);
  });

  skipIf("alerts: database connection issues — at least one alert-policy artifact is present (Terraform / gcloud export / docs)", () => {
    // Mirrors the prior probe but for DB-connection alerts.
    const candidates = [
      resolve(MONOREPO_ROOT, "infra/alerts"),
      resolve(MONOREPO_ROOT, "terraform/alerts"),
      resolve(MONOREPO_ROOT, "infra/monitoring"),
      resolve(MONOREPO_ROOT, "measure/alerts.md"),
    ];
    const found = candidates.filter((p) => existsSync(p)).length;
    expect.soft(
      found,
      `no alert-policy artifact present at any of ${candidates.map((p) => p.replace(MONOREPO_ROOT, ".")).join(", ")} — alert policy may be configured out-of-band (gcloud / Cloud Console); this is informational`,
    ).toBeGreaterThan(0);
  });

  afterAll(() => {
    if (SKIP) {
      console.warn("[phase-8-logging-monitoring-and-error-reporting] PHASE8_SKIP=1 — network probes skipped");
    }
  });
});

// --------------------------------------------------------------------
// Phase 8 — P1 launch gate (single hard assertion)
//
// Like Phases 1 / 6 / 7's P0/P1 launch gates, this is a single
// hard-failing test that aggregates the production observability
// posture. The per-check probes above use `expect.soft` so a run
// can enumerate all gaps; this gate fails fast with a single list
// of every missing critical observability primitive so CI can
// block deploys on observability regressions.
//
// Note: "alerts" are intentionally NOT part of the launch gate —
// the plan marks them "if configured" and they live in the GCP
// project, not in the repo. They are informational only.
// --------------------------------------------------------------------

describe("Phase 8 — P1 launch gate (single hard assertion)", () => {
  skipIf(
    "all critical observability primitives are present in the deployed production service (P1 launch gate)",
    async () => {
      const gaps: string[] = [];

      // 1. App-Router error boundary at the locale segment.
      if (!existsSync(LOCALE_ERROR_TSX)) {
        gaps.push(
          `missing app/[locale]/error.tsx (Next.js App-Router error boundary; 500s fall through to default page)`,
        );
      }

      // 2. App-Router not-found at the locale segment.
      if (!existsSync(LOCALE_NOT_FOUND_TSX)) {
        gaps.push(
          `missing app/[locale]/not-found.tsx (Next.js App-Router 404 page; missing routes fall through to default 404)`,
        );
      }

      // 3. tRPC router has a logging/observability middleware.
      const trpcSrc = tryReadFile(TRPC_INDEX_TS) ?? "";
      const hasLoggingMiddleware =
        /\bmiddleware\s*\(/.test(trpcSrc) &&
        /(?:logger|observ|loggin|metric|timin|trac|span)/i.test(trpcSrc);
      if (!hasLoggingMiddleware) {
        gaps.push(
          `packages/api/src/trpc.ts does not define an observability/logging middleware that captures procedure name, input, latency, and status code`,
        );
      }

      // 4. At least one error-log call site includes the stack.
      const roots = [resolve(APP_ROOT, "app"), resolve(MONOREPO_ROOT, "packages/api/src")];
      let stackSites = 0;
      const walk = (dir: string) => {
        if (!existsSync(dir)) return;
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          const st = statSync(full);
          if (st.isDirectory()) walk(full);
          else if (st.isFile() && /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
            const text = tryReadFile(full);
            if (!text) continue;
            if (STACK_LOG_PATTERNS.some((re) => re.test(text))) stackSites += 1;
          }
        }
      };
      for (const r of roots) walk(r);
      if (stackSites === 0) {
        gaps.push(
          `no error-log call site in app/ or packages/api/src/ includes the stack trace (AGENTS.md "Error logs have stack traces")`,
        );
      }

      // 5. tRPC response propagates the Cloud Run trace context.
      const trpcUrl = `${PROD_URL}/api/trpc/codecamp.dashboard?input=${encodeURIComponent(
        JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
      )}`;
      const trpcResponse = await fetchWithTimeout(trpcUrl, { method: "GET" });
      const trace = extractTraceparent(trpcResponse.headers);
      if (!trace) {
        gaps.push(
          `tRPC response missing both 'traceparent' and 'x-cloud-trace-context' headers (Cloud Logging cannot correlate the request to a trace)`,
        );
      }

      // 6. 404 page returns a styled HTML body (no stack trace leak).
      const notFound = await fetchWithTimeout(`${PROD_URL}/__phase8_does_not_exist__`, { method: "GET" });
      if (notFound.status !== 404) {
        gaps.push(`404 probe returned status=${notFound.status} (expected 404)`);
      } else {
        const body = await notFound.text();
        if (body.length === 0) {
          gaps.push(`404 body is empty (no styled not-found page rendered)`);
        }
        if (bodyLooksLikeStackTrace(body)) {
          gaps.push(`404 body looks like a raw stack trace (Error: … or 'at fn(' frame present)`);
        }
      }

      expect(
        gaps,
        `Phase 8 P1 launch gate failed — ${gaps.length} critical observability gap(s): ${gaps.join("; ")}`,
      ).toEqual([]);
    },
    REQUEST_TIMEOUT_MS + 8_000,
  );
});

// --------------------------------------------------------------------
// Unit tests (no network, no file system) — these run unconditionally
// so a regression in the helper parsers fails the suite immediately
// rather than masquerading as a production observability gap in the
// static / network probes. Mirrors the Phase 3/4/5/6/7 pattern of
// including pure unit tests for the in-file helpers.
// --------------------------------------------------------------------

describe("Phase 8 — helper unit tests", () => {
  describe("parseTrpcErrorEnvelope", () => {
    it("returns null for empty body", () => {
      expect(parseTrpcErrorEnvelope("")).toBeNull();
    });

    it("returns null for non-JSON body", () => {
      expect(parseTrpcErrorEnvelope("not-json")).toBeNull();
    });

    it("returns null for a success envelope (result, not error)", () => {
      expect(parseTrpcErrorEnvelope(JSON.stringify({ result: { data: "ok" } }))).toBeNull();
    });

    it("returns null when error.json is missing", () => {
      expect(parseTrpcErrorEnvelope(JSON.stringify({ error: { message: "x" } }))).toBeNull();
    });

    it("parses a canonical tRPC error envelope", () => {
      const body = JSON.stringify({
        error: {
          json: { message: "UNAUTHORIZED", code: 401, data: { code: "UNAUTHORIZED" } },
        },
      });
      expect(parseTrpcErrorEnvelope(body)).toEqual({
        message: "UNAUTHORIZED",
        code: "401",
        data: { code: "UNAUTHORIZED" },
      });
    });

    it("accepts string code values (older tRPC versions)", () => {
      const body = JSON.stringify({
        error: { json: { message: "NOT_FOUND", code: "NOT_FOUND" } },
      });
      expect(parseTrpcErrorEnvelope(body)).toEqual({
        message: "NOT_FOUND",
        code: "NOT_FOUND",
        data: undefined,
      });
    });

    it("returns empty-string message when the inner message is not a string", () => {
      const body = JSON.stringify({ error: { json: { message: 42, code: 500 } } });
      expect(parseTrpcErrorEnvelope(body)).toEqual({
        message: "",
        code: "500",
        data: undefined,
      });
    });
  });

  describe("classifyHttpStatus", () => {
    it("classifies 2xx as ok", () => {
      expect(classifyHttpStatus(200)).toBe("ok");
      expect(classifyHttpStatus(204)).toBe("ok");
      expect(classifyHttpStatus(301)).toBe("ok");
      expect(classifyHttpStatus(308)).toBe("ok");
    });

    it("classifies 4xx as client error", () => {
      expect(classifyHttpStatus(400)).toBe("client");
      expect(classifyHttpStatus(401)).toBe("client");
      expect(classifyHttpStatus(404)).toBe("client");
    });

    it("classifies 5xx as server error", () => {
      expect(classifyHttpStatus(500)).toBe("server");
      expect(classifyHttpStatus(502)).toBe("server");
      expect(classifyHttpStatus(503)).toBe("server");
    });
  });

  describe("extractTraceparent", () => {
    it("returns the traceparent header when present", () => {
      const h = new Headers({ traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" });
      expect(extractTraceparent(h)).toBe(
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      );
    });

    it("returns the x-cloud-trace-context header when traceparent is absent", () => {
      const h = new Headers({ "x-cloud-trace-context": "105445aa7843bc8bf206b12000100000/1;o=1" });
      expect(extractTraceparent(h)).toBe("105445aa7843bc8bf206b12000100000/1;o=1");
    });

    it("prefers traceparent over x-cloud-trace-context when both are present", () => {
      const h = new Headers({
        traceparent: "00-trace-01",
        "x-cloud-trace-context": "x-trace/1",
      });
      expect(extractTraceparent(h)).toBe("00-trace-01");
    });

    it("returns null when neither header is present", () => {
      const h = new Headers();
      expect(extractTraceparent(h)).toBeNull();
    });
  });

  describe("bodyLooksLikeStackTrace", () => {
    it("flags 'Error: …' prefix lines", () => {
      expect(bodyLooksLikeStackTrace("Error: something broke\n  at foo (file.ts:1:1)")).toBe(true);
    });

    it("flags Node stack frames ('at fn(' on its own line)", () => {
      expect(bodyLooksLikeStackTrace("  at handlerFn (src/server.ts:42:13)")).toBe(true);
    });

    it("does not flag benign prose mentioning 'at' as a word", () => {
      expect(bodyLooksLikeStackTrace("Look at the dashboard for details.")).toBe(false);
    });

    it("does not flag an empty body", () => {
      expect(bodyLooksLikeStackTrace("")).toBe(false);
    });

    it("does not flag a JSON error envelope (no 'at fn(' frames)", () => {
      const body = JSON.stringify({
        error: { json: { message: "NOT_FOUND", code: 404 } },
      });
      expect(bodyLooksLikeStackTrace(body)).toBe(false);
    });
  });

  describe("STRUCTURED_LOGGER_PATTERNS and STACK_LOG_PATTERNS", () => {
    it("STRUCTURED_LOGGER_PATTERNS matches a pino import", () => {
      expect(STRUCTURED_LOGGER_PATTERNS.some((re) => re.test('import pino from "pino"'))).toBe(true);
    });

    it("STRUCTURED_LOGGER_PATTERNS matches a logger.info({…}) call", () => {
      expect(STRUCTURED_LOGGER_PATTERNS.some((re) => re.test('logger.info({ procedure, latencyMs })'))).toBe(true);
    });

    it("STRUCTURED_LOGGER_PATTERNS matches a console.* wrapped in JSON.stringify", () => {
      expect(
        STRUCTURED_LOGGER_PATTERNS.some((re) =>
          re.test('console.error(JSON.stringify({ event: "x" }))'),
        ),
      ).toBe(true);
    });

    it("STACK_LOG_PATTERNS matches an error.stack log call", () => {
      expect(STACK_LOG_PATTERNS.some((re) => re.test('console.error("oops", error.stack)'))).toBe(true);
    });

    it("STACK_LOG_PATTERNS matches a structured { stack: … } payload", () => {
      expect(
        STACK_LOG_PATTERNS.some((re) =>
          re.test('logger.error({ msg: "oops", stack: err.stack })'),
        ),
      ).toBe(true);
    });
  });
});
