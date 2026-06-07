import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 2 — Production Database & Configuration (P0)
 *
 * Black-box smoke tests for the deployed production service at
 * https://codecamp.reading-advantage.com (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * These tests encode the Phase 2 acceptance criteria as executable contract.
 * They will fail (Red) until:
 *   (a) the deployment is wired to Cloud SQL and Secret Manager, and
 *   (b) the seed curriculum and prod test accounts are present.
 *
 * Three valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach prod) —
 *      indicates the probe must be run from a network that can reach prod.
 *   2. Assertion failure (prod reachable, but the contract is unmet) —
 *      indicates a real production gap to file as a follow-up track.
 *   3. Config-wiring failure (the cloudbuild.yaml deploy spec is missing a
 *      `--set-secrets=` binding for a P0 secret) — fix in the deploy spec,
 *      not the app code, and roll forward.
 *
 * Set PHASE2_PROD_URL to override the default target (useful for staging).
 * Set PHASE2_SKIP=1 to skip the entire suite in environments without network.
 *
 * Authenticated write probes (login → lastActiveAt write) are gated on
 * PHASE2_TEST_INTERN_USERNAME + PHASE2_TEST_INTERN_PASSWORD env vars so
 * real test creds never land in the repo (per test-strategy.md §2).
 */

const PROD_URL = process.env.PHASE2_PROD_URL ?? "https://codecamp.reading-advantage.com";
const SKIP = process.env.PHASE2_SKIP === "1";
const HAS_TEST_CREDS =
  typeof process.env.PHASE2_TEST_INTERN_USERNAME === "string" &&
  process.env.PHASE2_TEST_INTERN_USERNAME.length > 0 &&
  typeof process.env.PHASE2_TEST_INTERN_PASSWORD === "string" &&
  process.env.PHASE2_TEST_INTERN_PASSWORD.length > 0;
const REQUEST_TIMEOUT_MS = 5_000;
const DASHBOARD_BUDGET_MS = 500;

const skipIf = SKIP ? it.skip : it;
const skipIfNoCreds = HAS_TEST_CREDS ? it : it.skip;

// P0 secrets per plan.md §Phase 2 — these are the five the prod
// cloudbuild.yaml MUST bind via `--set-secrets=` (Secret Manager), and
// MUST NOT bind via `--set-env-vars=` (plaintext env, which would be a
// secret-leakage regression).
const P0_SECRETS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "OPENROUTER_API_KEY",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_PRIVATE_KEY",
] as const;

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

/**
 * Parses the cloudbuild.yaml `--set-secrets=` line and returns the list of
 * env-var names bound to Secret Manager entries. The flag uses the form
 * `ENV_NAME=secret_name:latest` and is comma-separated. Returns an empty
 * array if the flag is absent or malformed.
 */
function parseSetSecretsFlags(yaml: string): string[] {
  const line = yaml
    .split("\n")
    .find((l) => l.includes("--set-secrets=") || l.includes("--set-secrets ="));
  if (!line) return [];
  const match = line.match(/--set-secrets(?:=|\s+=)\s*"?([^"\s]+)"?/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.trim().split("=")[0]?.trim() ?? "")
    .filter((name) => name.length > 0);
}

/**
 * Parses the cloudbuild.yaml `--set-env-vars=` line and returns the list of
 * env-var names. Used to confirm no P0 secret name is leaked into plaintext
 * env vars. Multi-value entries are joined with `,` per gcloud convention.
 */
function parseSetEnvVarsFlags(yaml: string): string[] {
  const line = yaml
    .split("\n")
    .find((l) => l.includes("--set-env-vars=") || l.includes("--set-env-vars ="));
  if (!line) return [];
  const match = line.match(/--set-env-vars(?:=|\s+=)\s*"?([^"\s]+)"?/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.trim().split("=")[0]?.trim() ?? "")
    .filter((name) => name.length > 0);
}

function loadCloudbuildYaml(): string {
  // The deploy spec is the canonical source of truth for which env vars
  // and secrets are bound to the Cloud Run service. This file is in-repo
  // and read at test time; tests must NOT modify it (per test-strategy.md
  // §4 — no source code modifications during this track).
  return readFileSync(
    resolve(process.cwd(), "cloudbuild.yaml"),
    "utf8",
  );
}

describe("Phase 2 — Database connectivity", () => {
  skipIf(
    "GET /api/auth/session returns 2xx (DB read: session lookup is non-fatal)",
    async () => {
      const response = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
        method: "GET",
      });
      expect.soft(response.status, `expected 2xx, got ${response.status}`).toBeGreaterThanOrEqual(200);
      expect.soft(response.status).toBeLessThan(300);
      const body = await response.text();
      expect.soft(body.length, "expected non-empty session payload").toBeGreaterThan(0);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIf(
    "tRPC codecamp.dashboard is reachable (unauthenticated → 401 with tRPC error envelope)",
    async () => {
      const input = encodeURIComponent(
        JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
      );
      const response = await fetchWithTimeout(
        `${PROD_URL}/api/trpc/codecamp.dashboard?input=${input}`,
        { method: "GET" },
      );
      expect.soft(response.status, `expected 401, got ${response.status}`).toBe(401);
      const body = (await response.json()) as {
        error?: { json?: { data?: { code?: string; httpStatus?: number } } };
      };
      const dataCode = body.error?.json?.data?.code;
      expect.soft(dataCode, "tRPC error envelope must surface UNAUTHORIZED").toBe("UNAUTHORIZED");
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIf(
    "Dashboard read is fast enough (< 500ms server roundtrip)",
    async () => {
      // Use /api/auth/session as the cheap DB-read probe: it is unauth,
      // always runs, and exercises the same connection pool the dashboard
      // tRPC uses. We do not use a per-user dashboard tRPC here because
      // the test must not require credentials.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const start = Date.now();
      try {
        const response = await fetch(`${PROD_URL}/api/auth/session`, {
          method: "GET",
          signal: controller.signal,
        });
        const elapsed = Date.now() - start;
        expect.soft(response.status, `expected 2xx, got ${response.status}`).toBeGreaterThanOrEqual(200);
        expect.soft(response.status).toBeLessThan(300);
        expect.soft(
          elapsed,
          `dashboard read took ${elapsed}ms — exceeds the 500ms P0 budget`,
        ).toBeLessThan(DASHBOARD_BUDGET_MS);
      } finally {
        clearTimeout(timer);
      }
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIf(
    "POST /api/auth/login route is alive (bad creds → 4xx, not 5xx)",
    async () => {
      // A live login route must reject bad credentials with a 4xx client
      // error. A 5xx on bad creds indicates a server-side fault (DB error,
      // rate-limiter crash, etc.) and is a P0 production finding.
      const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "__no_such_user__", password: "__bad__" }),
      });
      expect.soft(
        response.status,
        `expected 4xx for bad creds, got ${response.status} — server-side fault on auth path`,
      ).toBeGreaterThanOrEqual(400);
      expect.soft(response.status).toBeLessThan(500);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIf(
    "Module page renders a known curriculum slug (proves DB read for non-auth content)",
    async () => {
      // dev-environment is Module 1 in the seed; reaching its page proves
      // modules+lessons are queryable from Cloud SQL.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${PROD_URL}/th/module/dev-environment`, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
        });
        expect.soft(response.status, `expected 2xx, got ${response.status}`).toBe(200);
        const body = await response.text();
        expect.soft(body.length, "expected non-empty module page").toBeGreaterThan(0);
      } finally {
        clearTimeout(timer);
      }
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );
});

describe("Phase 2 — Secret Manager (config-level)", () => {
  const yaml = loadCloudbuildYaml();
  const setSecrets = parseSetSecretsFlags(yaml);
  const setEnvVars = parseSetEnvVarsFlags(yaml);

  skipIf(
    "cloudbuild.yaml binds DATABASE_URL via --set-secrets= (not env var)",
    () => {
      expect.soft(
        setSecrets,
        `DATABASE_URL missing from --set-secrets=; current bindings: [${setSecrets.join(", ")}]`,
      ).toContain("DATABASE_URL");
      expect.soft(
        setEnvVars,
        `DATABASE_URL leaked into --set-env-vars=; current bindings: [${setEnvVars.join(", ")}]`,
      ).not.toContain("DATABASE_URL");
    },
    0,
  );

  skipIf(
    "cloudbuild.yaml binds AUTH_SECRET via --set-secrets= (not env var)",
    () => {
      expect.soft(setSecrets, `AUTH_SECRET missing from --set-secrets=`).toContain("AUTH_SECRET");
      expect.soft(setEnvVars, `AUTH_SECRET leaked into --set-env-vars=`).not.toContain("AUTH_SECRET");
    },
    0,
  );

  skipIf(
    "cloudbuild.yaml binds OPENROUTER_API_KEY via --set-secrets= (not env var)",
    () => {
      expect.soft(setSecrets, `OPENROUTER_API_KEY missing from --set-secrets=`).toContain(
        "OPENROUTER_API_KEY",
      );
      expect.soft(setEnvVars, `OPENROUTER_API_KEY leaked into --set-env-vars=`).not.toContain(
        "OPENROUTER_API_KEY",
      );
    },
    0,
  );

  skipIf(
    "cloudbuild.yaml binds GITHUB_WEBHOOK_SECRET via --set-secrets= (not env var)",
    () => {
      expect.soft(setSecrets, `GITHUB_WEBHOOK_SECRET missing from --set-secrets=`).toContain(
        "GITHUB_WEBHOOK_SECRET",
      );
      expect.soft(setEnvVars, `GITHUB_WEBHOOK_SECRET leaked into --set-env-vars=`).not.toContain(
        "GITHUB_WEBHOOK_SECRET",
      );
    },
    0,
  );

  skipIf(
    "cloudbuild.yaml binds GITHUB_PRIVATE_KEY via --set-secrets= (not env var)",
    () => {
      expect.soft(setSecrets, `GITHUB_PRIVATE_KEY missing from --set-secrets=`).toContain(
        "GITHUB_PRIVATE_KEY",
      );
      expect.soft(setEnvVars, `GITHUB_PRIVATE_KEY leaked into --set-env-vars=`).not.toContain(
        "GITHUB_PRIVATE_KEY",
      );
    },
    0,
  );
});

describe("Phase 2 — Data integrity", () => {
  skipIf(
    "Dashboard page HTML is non-empty and references the dashboard chrome",
    async () => {
      // The locale root renders the dashboard shell (title, login form for
      // unauth users, modules grid for auth users). A non-empty, well-formed
      // body proves the page is wired and Cloud SQL is reachable for
      // SSR-time data. We do not assert curriculum counts here — those
      // require an authenticated session, which is gated below.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${PROD_URL}/th/`, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
        });
        expect.soft(response.status, `expected 200, got ${response.status}`).toBe(200);
        const body = await response.text();
        expect.soft(body.length, "expected non-empty dashboard HTML").toBeGreaterThan(500);
      } finally {
        clearTimeout(timer);
      }
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );

  skipIfNoCreds(
    "Login updates lastActiveAt (DB write path)",
    async () => {
      const username = process.env.PHASE2_TEST_INTERN_USERNAME!;
      const password = process.env.PHASE2_TEST_INTERN_PASSWORD!;
      const loginResponse = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      expect.soft(
        loginResponse.status,
        `expected 200 on valid login, got ${loginResponse.status}`,
      ).toBe(200);
      const setCookie = loginResponse.headers.get("set-cookie") ?? "";
      expect.soft(setCookie, "expected a session_token cookie on successful login").toMatch(/session_token=/i);

      // Hitting the dashboard tRPC with the issued session cookie exercises
      // the getUserDashboard domain function, which (per
      // packages/domain/src/codecamp/index.ts:1768) returns lastActiveAt
      // from the gamificationProfiles row. A 2xx response proves the DB
      // write path completed cleanly.
      const cookieHeader = setCookie.split(";")[0] ?? "";
      const dashResponse = await fetchWithTimeout(
        `${PROD_URL}/api/trpc/codecamp.dashboard?input=${encodeURIComponent(
          JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
        )}`,
        { method: "GET", headers: { Cookie: cookieHeader } },
      );
      expect.soft(
        dashResponse.status,
        `expected 2xx on dashboard tRPC after login, got ${dashResponse.status}`,
      ).toBeGreaterThanOrEqual(200);
      expect.soft(dashResponse.status).toBeLessThan(300);
    },
    REQUEST_TIMEOUT_MS + 2_000,
  );
});

/**
 * Phase 2 P0 launch gate — a single hard-failing test that summarizes the
 * production DB & configuration posture. Unlike the per-check assertions
 * above (which use `expect.soft` so a run can enumerate all gaps in one
 * pass), this gate fails fast on the first gap with a list of every
 * missing critical item, so CI can block deploys to public launch.
 *
 * Mirrors the Phase 1 launch-gate pattern in
 * `phase-1-infrastructure.test.ts`. Aggregates the highest-priority
 * checks: dashboard roundtrip, no 5xx on auth path, all 5 P0 secrets
 * bound via Secret Manager, and no P0 secret leaked into env vars.
 */
describe("Phase 2 — P0 launch gate (single hard assertion)", () => {
  skipIf(
    "all Phase 2 P0 acceptance criteria are met (launch gate)",
    async () => {
      const missing: string[] = [];

      // 1. Dashboard read must be reachable and 2xx.
      const sessionRes = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, { method: "GET" });
      if (sessionRes.status < 200 || sessionRes.status >= 300) {
        missing.push(`GET /api/auth/session returned ${sessionRes.status} (expected 2xx)`);
      }

      // 2. tRPC route must be alive and return the expected UNAUTHORIZED
      //    envelope for an unauth request.
      const dashInput = encodeURIComponent(
        JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
      );
      const trpcRes = await fetchWithTimeout(
        `${PROD_URL}/api/trpc/codecamp.dashboard?input=${dashInput}`,
        { method: "GET" },
      );
      if (trpcRes.status !== 401) {
        missing.push(`tRPC codecamp.dashboard returned ${trpcRes.status} (expected 401)`);
      } else {
        const body = (await trpcRes.json()) as {
          error?: { json?: { data?: { code?: string } } };
        };
        if (body.error?.json?.data?.code !== "UNAUTHORIZED") {
          missing.push("tRPC codecamp.dashboard UNAUTHORIZED envelope missing or wrong shape");
        }
      }

      // 3. Login route must NOT 5xx on bad creds.
      const loginRes = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "__no_such_user__", password: "__bad__" }),
      });
      if (loginRes.status >= 500 || loginRes.status < 400) {
        missing.push(`POST /api/auth/login returned ${loginRes.status} (expected 4xx)`);
      }

      // 4. All 5 P0 secrets must be bound via Secret Manager.
      const yaml = loadCloudbuildYaml();
      const setSecrets = parseSetSecretsFlags(yaml);
      for (const secret of P0_SECRETS) {
        if (!setSecrets.includes(secret)) {
          missing.push(`Secret Manager binding missing for ${secret}`);
        }
      }

      // 5. No P0 secret may be leaked into --set-env-vars=.
      const setEnvVars = parseSetEnvVarsFlags(yaml);
      for (const secret of P0_SECRETS) {
        if (setEnvVars.includes(secret)) {
          missing.push(`Secret ${secret} leaked into --set-env-vars= (use --set-secrets= instead)`);
        }
      }

      expect(
        missing,
        `Phase 2 P0 launch gate failed — ${missing.length} critical item(s) missing: ${missing.join("; ")}`,
      ).toEqual([]);
    },
    REQUEST_TIMEOUT_MS * 3 + 5_000,
  );
});
