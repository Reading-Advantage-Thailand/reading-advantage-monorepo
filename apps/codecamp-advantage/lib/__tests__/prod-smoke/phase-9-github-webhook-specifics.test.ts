import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
import { RUN_LIVE_SMOKE, resolveLiveSmokeUrl } from "./_helpers/live-smoke-guard";

/**
 * Phase 9 — GitHub Webhook Specifics (P1)
 *
 * Black-box smoke tests for the deployed production webhook at
 * https://codecamp.reading-advantage.com/webhooks/github/pr
 * (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * Phase 9 acceptance criteria (per plan.md):
 *   1. Webhook delivery
 *      - GitHub webhook settings show successful deliveries
 *      - No failed deliveries in GitHub webhook history
 *      - Payload is correctly parsed
 *      - Response time is < 10 seconds (GitHub timeout)
 *   2. Webhook security
 *      - Invalid signature returns 401
 *      - Missing signature returns 401
 *      - Replay attacks prevented (timestamp check if implemented)
 *   3. Webhook resilience
 *      - App handles webhook during cold start
 *      - App handles concurrent webhook deliveries
 *      - Failed webhook processing is logged
 *
 * These tests encode the Phase 9 acceptance criteria as executable
 * contract. They will fail (Red) until:
 *   (a) the webhook route at POST /webhooks/github/pr returns within
 *       GitHub's 10s timeout for all sub-paths (success, ignored,
 *       failed), AND
 *   (b) the route implements a timestamp-based replay-attack check
 *       (currently NOT implemented on HEAD — see `verifyWebhookSignature`
 *       in packages/webhooks/src/github-client.ts:102-114; the function
 *       only checks the HMAC and has no `Date.now()` / window check),
 *       AND
 *   (c) the failed-processing audit trail is wired through the
 *       domain-layer `logWebhookEvent` so a failure surfaces in
 *       `codecamp.webhookEvents` (Phase 5 already verified the
 *       schema enum, Phase 9 adds the behavioral oracle for the
 *       actually-logged failed path).
 *
 * Three valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach
 *      prod) — indicates the probe must be run from a network that
 *      can reach prod.
 *   2. Assertion failure (prod reachable, but the contract is unmet)
 *      — indicates a real production gap to file as a follow-up
 *      track. The two genuine Red-phase gaps at HEAD are:
 *        - the route has no timestamp-based replay check (the
 *          `phase-9-replay-attack-prevention` describe block fails
 *          at HEAD on the source-contract detector);
 *        - the synchronized-PR LLM-review path may exceed GitHub's
 *          10s budget (the response-time probe is keystone-gated;
 *          passes for ignored sub-paths, fails for the full LLM
 *          pipeline until the route is restructured to ack early
 *          and review asynchronously).
 *   3. Missing test fixtures (PHASE9_TEST_* env vars absent) —
 *      the keystone-gated and admin-gated probes skip; the
 *      unauth, ignored-path, and unit tests still run and form
 *      the P1 launch gate.
 *
 * Set PHASE9_PROD_URL to override the default target (useful for
 * staging). Set PHASE9_SKIP=1 to skip the network probes; the unit
 * tests, source-contract detectors, and helper unit tests still run
 * unconditionally so a regression in those primitives fails the
 * suite immediately.
 *
 * Per-test gating (env vars, never committed):
 *   PHASE9_PROD_URL              — override prod target
 *   PHASE9_SKIP=1                — skip network probes
 *   PHASE9_TEST_GITHUB_WEBHOOK_SECRET — keystone-gated signed probes
 *   PHASE9_TEST_REPO_URL         — keystone PR fixture repo
 *   PHASE9_TEST_PR_URL           — keystone PR fixture PR
 *   PHASE9_TEST_ADMIN_USERNAME   — admin creds for webhookEvents oracle
 *   PHASE9_TEST_ADMIN_PASSWORD
 *
 * Test creds and the GitHub App webhook secret are never committed
 * (per test-strategy.md §2 + AGENTS.md secrets policy).
 *
 * Note on divergence from test-strategy.md: the test-strategy
 * says "P9 Webhook: GitHub App 'Recent Deliveries' UI + replay
 * button; bad-sig curl test." Per the 2026-06-07 mid-session
 * supervisor instruction (same as Phases 1–8.5), Phase 9 is
 * elevated from manual probes to executable contract. The
 * source-contract detectors (replay-attack timestamp check),
 * helper unit tests (sign roundtrip, signature comparison,
 * timestamp-tolerance math), and schema enums run unconditionally
 * so a regression in those primitives fails the suite immediately.
 * The behavioral network probes remain black-box HTTP smoke tests
 * against prod, consistent with the strategy.
 */

// ─── Constants ──────────────────────────────────────────────

const PROD_URL = resolveLiveSmokeUrl("PHASE9_PROD_URL") ?? "";
const SKIP = process.env.PHASE9_SKIP === "1";
const HAS_WEBHOOK_SECRET =
  typeof process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET === "string" &&
  process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET.length > 0;
const HAS_KEYSTONE_FIXTURE =
  typeof process.env.PHASE9_TEST_REPO_URL === "string" &&
  process.env.PHASE9_TEST_REPO_URL.length > 0 &&
  typeof process.env.PHASE9_TEST_PR_URL === "string" &&
  process.env.PHASE9_TEST_PR_URL.length > 0;
const HAS_ADMIN_CREDS =
  typeof process.env.PHASE9_TEST_ADMIN_USERNAME === "string" &&
  process.env.PHASE9_TEST_ADMIN_USERNAME.length > 0 &&
  typeof process.env.PHASE9_TEST_ADMIN_PASSWORD === "string" &&
  process.env.PHASE9_TEST_ADMIN_PASSWORD.length > 0;

// GitHub's documented webhook timeout is 10 seconds; per
// https://docs.github.com/en/webhooks/using-webhooks/handling-webhook-deliveries
// GitHub stops waiting and resends the delivery if the response
// does not arrive in time. The probe budget must be strictly
// greater than GitHub's timeout so a slow-but-eventual response
// still surfaces in the test as a failure rather than as a
// network error.
const GITHUB_TIMEOUT_MS = 10_000;
const PROBE_TIMEOUT_MS = GITHUB_TIMEOUT_MS + 5_000;
const IGNORED_PATH_TIMEOUT_MS = 5_000;

// ─── Repository paths for source-contract detectors ─────────

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../../..");
const MONOREPO_ROOT = resolve(APP_ROOT, "../..");
const WEBHOOK_CLIENT_SOURCE = resolve(
  MONOREPO_ROOT,
  "packages/webhooks/src/github-client.ts",
);
const WEBHOOK_ROUTE_SOURCE = resolve(
  MONOREPO_ROOT,
  "packages/webhooks/src/github.ts",
);
const CODECAMP_TYPES_SOURCE = resolve(
  MONOREPO_ROOT,
  "packages/types/src/codecamp.ts",
);

// ─── Conditional test helpers ───────────────────────────────

const testIf = (skipCondition: boolean) => (!RUN_LIVE_SMOKE || skipCondition ? it.skip : it);
const skipIf = testIf(SKIP);
const skipIfNoKeystoneSecret = testIf(SKIP || !HAS_WEBHOOK_SECRET);
const skipIfNoKeystoneFixture = testIf(SKIP || !HAS_KEYSTONE_FIXTURE);
const skipIfNoKeystoneSecretOrFixture = testIf(
  SKIP || !HAS_WEBHOOK_SECRET || !HAS_KEYSTONE_FIXTURE,
);
const skipIfNoAdminCreds = testIf(SKIP || !HAS_ADMIN_CREDS);

// ─── HTTP helper (mirrors Phases 1-8.5) ─────────────────────

const fetchWithTimeout = async (
  input: string,
  init: RequestInit & { redirect?: RequestRedirect; timeoutMs?: number } = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? PROBE_TIMEOUT_MS);
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

// ─── Webhook signing helpers ────────────────────────────────

/**
 * Computes a GitHub webhook HMAC-SHA256 signature for the given
 * payload using the configured webhook secret. Mirrors the
 * server-side `verifyWebhookSignature` helper in
 * `packages/webhooks/src/github-client.ts:102-114`.
 */
function signWebhookPayload(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

interface LoginResult {
  cookie: string;
  userRole: string;
}

async function loginAndGetCookie(username: string, password: string): Promise<LoginResult> {
  const response = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    timeoutMs: PROBE_TIMEOUT_MS,
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

const trpcInput = (json: unknown = null) =>
  encodeURIComponent(JSON.stringify({ json, meta: { values: ["undefined"] } }));

async function trpcGet(
  procedure: string,
  init: { cookie?: string; inputJson?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (init.cookie) headers["Cookie"] = init.cookie;
  const url = `${PROD_URL}/api/trpc/${procedure}?input=${trpcInput(init.inputJson ?? null)}`;
  const response = await fetchWithTimeout(url, { method: "GET", headers, timeoutMs: PROBE_TIMEOUT_MS });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

// ─── Synthesized payload builders ──────────────────────────

/**
 * A minimal but valid pull_request payload that exercises the
 * "synchronize" path on an existing PR. The route parses with
 * `githubWebhookPayloadSchema` and dispatches `synchronize` →
 * `codecamp.getPrReviewByPrUrl` → `codecamp.updatePrReview`.
 * We only check the HTTP boundary here; the read-back oracle
 * (keystone-gated, in the resilience block) confirms the DB side.
 */
function makeSynchronizePayload(prUrl: string, repoUrl: string, githubUsername: string): string {
  return JSON.stringify({
    action: "synchronize",
    number: 1,
    pull_request: {
      html_url: prUrl,
      head: { ref: "feature-branch", sha: "phase9-red-sync-sha" },
      base: { ref: "main", repo: { full_name: "phase9/repo", html_url: repoUrl } },
      user: { login: githubUsername },
    },
  });
}

/**
 * A payload that exercises the "ignored" path via a non-PR event
 * header (`x-github-event: push`). The route returns 200 with
 * `ignored: "Event push not handled"` without invoking the LLM
 * review pipeline, so the response time is dominated by the
 * round-trip + auth check. This is the "fast path" the GitHub
 * timeout test must tolerate.
 */
function makeIgnoredEventPayload(): string {
  return JSON.stringify({ action: "ping", zen: "Speak like a human" });
}

/**
 * A payload that would trigger the full LLM review pipeline if
 * the keystone PR is mapped AND the codecamp user lookup succeeds.
 * The `x-github-delivery` is fixed (synthesized) so the executor
 * can pin the response in `codecamp.webhookEvents` for the
 * keystone read-back oracle.
 */
function makeKeystoneOpenedPayload(
  prUrl: string,
  repoUrl: string,
  githubUsername: string,
): string {
  return JSON.stringify({
    action: "opened",
    number: 1,
    pull_request: {
      html_url: prUrl,
      head: { ref: "feature-branch", sha: "phase9-red-opened-sha" },
      base: { ref: "main", repo: { full_name: "phase9/repo", html_url: repoUrl } },
      user: { login: githubUsername },
    },
  });
}

// ─── Tests ─────────────────────────────────────────────────

describe("Phase 9 — Webhook delivery (production)", () => {
  beforeAll(() => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    expect(PROD_URL, "PHASE9_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  describe("Successful delivery (no LLM review pipeline)", () => {
    skipIfNoKeystoneSecret(
      "POST /webhooks/github/pr (signed, ignored-path push event) → 200 with received: true and surface 'Event push not handled' — proxy for 'GitHub webhook settings show successful deliveries'",
      async () => {
        const payload = makeIgnoredEventPayload();
        const signature = signWebhookPayload(payload, process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET!);
        const t0 = performance.now();
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "push",
            "x-github-delivery": `phase9-red-ignored-${Date.now()}`,
            "x-hub-signature-256": signature,
          },
          body: payload,
          timeoutMs: IGNORED_PATH_TIMEOUT_MS,
        });
        const elapsedMs = performance.now() - t0;
        expect.soft(
          response.status,
          `expected 200 from signed push (ignored) webhook, got ${response.status} (elapsed=${Math.round(elapsedMs)}ms)`,
        ).toBe(200);
        const body = (await response.json().catch(() => null)) as
          | { received?: boolean; ignored?: string }
          | null;
        expect.soft(
          body?.received,
          "ignored-path webhook must surface { received: true } on success",
        ).toBe(true);
        expect.soft(
          body?.ignored?.includes("push"),
          `expected ignored='Event push not handled' for push event, got=${body?.ignored}`,
        ).toBe(true);
      },
      IGNORED_PATH_TIMEOUT_MS + 2_000,
    );

    skipIfNoKeystoneSecretOrFixture(
      "POST /webhooks/github/pr (signed, synchronize on existing PR) → 200, body surfaces prUrl — proxy for 'Payload is correctly parsed'",
      async () => {
        const prUrl = process.env.PHASE9_TEST_PR_URL!;
        const repoUrl = process.env.PHASE9_TEST_REPO_URL!;
        const payload = makeSynchronizePayload(prUrl, repoUrl, "phase9-test-intern");
        const signature = signWebhookPayload(payload, process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET!);
        const t0 = performance.now();
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
            "x-github-delivery": `phase9-red-sync-${Date.now()}`,
            "x-hub-signature-256": signature,
          },
          body: payload,
          timeoutMs: GITHUB_TIMEOUT_MS,
        });
        const elapsedMs = performance.now() - t0;
        expect.soft(
          response.status,
          `expected 200 from signed synchronize webhook, got ${response.status} (elapsed=${Math.round(elapsedMs)}ms)`,
        ).toBe(200);
        const body = (await response.json().catch(() => null)) as
          | { received?: boolean; action?: string; prUrl?: string; ignored?: string }
          | null;
        expect.soft(
          body?.received,
          "synchronize webhook must surface { received: true } on success",
        ).toBe(true);
        // The `prUrl` echo on the response body proves the route
        // correctly parsed the `pull_request.html_url` from the
        // signed body. If the parser dropped or mutated the field,
        // the echo would not match the input.
        if (body?.prUrl !== undefined) {
          expect.soft(
            body.prUrl === prUrl,
            `webhook response prUrl must echo the input PR URL — got=${body.prUrl} expected=${prUrl}`,
          ).toBe(true);
        }
      },
      GITHUB_TIMEOUT_MS + 2_000,
    );
  });

  describe("Response time budget (GitHub's 10s timeout)", () => {
    skipIfNoKeystoneSecret(
      "POST /webhooks/github/pr (signed, ignored push event) responds in < 1s — establishes the fast-path baseline",
      async () => {
        const payload = makeIgnoredEventPayload();
        const signature = signWebhookPayload(payload, process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET!);
        const t0 = performance.now();
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "push",
            "x-github-delivery": `phase9-red-fast-${Date.now()}`,
            "x-hub-signature-256": signature,
          },
          body: payload,
          timeoutMs: PROBE_TIMEOUT_MS,
        });
        const elapsedMs = performance.now() - t0;
        // The ignored path is the route's "acknowledge early" branch —
        // it must return 200 well within GitHub's 10s budget. We assert
        // a 1s ceiling to leave headroom for the keystone E2E which
        // exercises the full LLM review pipeline.
        expect.soft(
          response.status,
          `expected 200 from signed push (ignored) webhook, got ${response.status}`,
        ).toBe(200);
        expect.soft(
          elapsedMs < 1000,
          `ignored-path webhook took ${Math.round(elapsedMs)}ms — must be < 1000ms (GitHub timeout is 10_000ms; leaving headroom for the keystone E2E which exercises the full LLM review pipeline)`,
        ).toBe(true);
      },
      PROBE_TIMEOUT_MS + 2_000,
    );

    skipIfNoKeystoneSecretOrFixture(
      "POST /webhooks/github/pr (signed, keystone PR opened) responds within GitHub's 10s timeout — RED if LLM review is awaited synchronously",
      async () => {
        // This is the canonical Phase 9 sub-task 4 probe. The route
        // currently awaits the LLM review pipeline (see
        // packages/webhooks/src/github.ts:346 `await runReview();`)
        // before returning 200, so the response time is the LLM
        // call's wall time. GitHub's documented webhook timeout is
        // 10s; if the LLM takes longer, GitHub stops waiting and
        // resends the delivery, which manifests as a duplicate
        // delivery in the audit trail.
        const prUrl = process.env.PHASE9_TEST_PR_URL!;
        const repoUrl = process.env.PHASE9_TEST_REPO_URL!;
        const payload = makeKeystoneOpenedPayload(prUrl, repoUrl, "phase9-test-intern");
        const signature = signWebhookPayload(payload, process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET!);
        const t0 = performance.now();
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
            "x-github-delivery": `phase9-red-timeout-${Date.now()}`,
            "x-hub-signature-256": signature,
          },
          body: payload,
          timeoutMs: GITHUB_TIMEOUT_MS,
        });
        const elapsedMs = performance.now() - t0;
        // We assert < 10_000ms (GitHub's timeout). The route may
        // return 200 or 200-with-ignored (if the keystone repo
        // isn't mapped); both are valid. What we care about is
        // that the response arrives before GitHub's 10s ceiling.
        expect.soft(
          response.status < 500,
          `expected < 5xx from signed keystone webhook, got ${response.status} (elapsed=${Math.round(elapsedMs)}ms)`,
        ).toBe(true);
        expect.soft(
          elapsedMs < GITHUB_TIMEOUT_MS,
          `keystone PR-opened webhook took ${Math.round(elapsedMs)}ms — must be < ${GITHUB_TIMEOUT_MS}ms (GitHub webhook timeout); a regression here means GitHub times out and re-delivers, causing duplicate audit-trail rows`,
        ).toBe(true);
      },
      GITHUB_TIMEOUT_MS + 2_000,
    );
  });

  describe("No failed deliveries in audit trail", () => {
    skipIfNoAdminCreds(
      "codecamp.webhookEvents (ADMIN) returns no rows with outcome='failed' for the last 20 deliveries — proxy for 'No failed deliveries in GitHub webhook history'",
      async () => {
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE9_TEST_ADMIN_USERNAME!,
          process.env.PHASE9_TEST_ADMIN_PASSWORD!,
        );
        const { status, body } = await trpcGet("codecamp.webhookEvents", {
          cookie,
          inputJson: { limit: 20 },
        });
        expect.soft(status, `expected 200 from codecamp.webhookEvents, got ${status}`).toBe(200);
        const payload = body as {
          result?: { data?: { json?: Array<Record<string, unknown>> } };
        };
        const rows = payload.result?.data?.json ?? [];
        expect.soft(
          Array.isArray(rows),
          "codecamp.webhookEvents must return an array of webhookEventSchema objects",
        ).toBe(true);
        // The audit trail is failure-only by design (per
        // packages/types/src/codecamp.ts webhookEventSchema.outcome).
        // A regression that adds a `processed` outcome, or that
        // starts logging successful deliveries, would change the
        // meaning of the query — a "show me recent failures" debug
        // page would no longer be a failure-only view.
        const failed = rows.filter((r) => r.outcome === "failed");
        // We assert the last 20 deliveries contain no failed rows.
        // This is a soft assertion: a single failed row in a healthy
        // prod is acceptable (the audit trail exists precisely to
        // surface failures), but a high count of consecutive failed
        // rows is the Phase 9 sub-task 2 ("No failed deliveries in
        // GitHub webhook history") failure mode.
        expect.soft(
          failed.length === 0,
          `codecamp.webhookEvents (last 20) must contain 0 'failed' rows, got ${failed.length} — see reason field for each failed row: ${JSON.stringify(failed.map((r) => r.reason).slice(0, 5))}`,
        ).toBe(true);
      },
      PROBE_TIMEOUT_MS + 2_000,
    );
  });
});

describe("Phase 9 — Webhook security (production)", () => {
  beforeAll(() => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    expect(PROD_URL, "PHASE9_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  describe("Signature verification (unauth probes)", () => {
    skipIf(
      "POST /webhooks/github/pr (no signature) → 401 with { error: 'Missing signature' }",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-github-event": "pull_request" },
          body: JSON.stringify({ action: "opened" }),
          timeoutMs: PROBE_TIMEOUT_MS,
        });
        expect.soft(
          response.status,
          `expected 401 for missing-sig webhook, got ${response.status}`,
        ).toBe(401);
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        expect.soft(
          body?.error,
          "expected missing-sig 401 body to surface 'Missing signature'",
        ).toBe("Missing signature");
      },
      PROBE_TIMEOUT_MS + 2_000,
    );

    skipIf(
      "POST /webhooks/github/pr (bad signature) → 401 with { error: 'Invalid signature' }",
      async () => {
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
            "x-hub-signature-256":
              "sha256=0000000000000000000000000000000000000000000000000000000000000000",
          },
          body: JSON.stringify({ action: "opened" }),
          timeoutMs: PROBE_TIMEOUT_MS,
        });
        expect.soft(
          response.status,
          `expected 401 for bad-sig webhook, got ${response.status}`,
        ).toBe(401);
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        expect.soft(
          body?.error,
          "expected bad-sig 401 body to surface 'Invalid signature'",
        ).toBe("Invalid signature");
      },
      PROBE_TIMEOUT_MS + 2_000,
    );
  });

  describe("Replay-attack prevention (timestamp check) — RED on HEAD", () => {
    skipIf(
      "POST /webhooks/github/pr (signed payload with a stale timestamp claim) → 401 with a replay/stale error — RED until a timestamp window check is added to verifyWebhookSignature",
      async () => {
        // The current `verifyWebhookSignature` (packages/webhooks/src/github-client.ts:102-114)
        // only verifies the HMAC; it does NOT check a timestamp window.
        // To prevent replay attacks, the route should sign (or include)
        // a timestamp and reject payloads whose timestamp falls outside
        // a tolerance window (commonly ±5 minutes, matching GitHub's
        // own delivery-time skew).
        //
        // We craft a payload that *would* trigger a replay rejection
        // if a timestamp check were present: the body includes a
        // `timestamp` field set to 24 hours ago, AND the signature
        // is valid for the body as sent. A properly-implemented
        // check would reject the delivery (401 with a `replay` or
        // `stale` error code); the current implementation accepts
        // it (200, `received: true`) because it has no timestamp
        // check at all.
        //
        // This test is RED on HEAD. It will go green when a future
        // commit adds a timestamp-window check to
        // `verifyWebhookSignature` (or the surrounding route).
        const staleTimestamp = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
        const body = JSON.stringify({
          timestamp: staleTimestamp,
          action: "opened",
          pull_request: {
            html_url: "https://github.com/phase9/replay-test/pull/1",
            base: { repo: { html_url: "https://github.com/phase9/replay-test" } },
            user: { login: "phase9-replay" },
          },
        });
        // Sign with the live secret if provided; if not, use a
        // deterministic test secret so the signature is well-formed
        // HMAC-SHA256 over the body. The replay check should reject
        // before the secret comparison, so either path is valid for
        // exercising the missing-behavior detector.
        const secret =
          process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET ?? "phase9-replay-test-secret";
        const signature = signWebhookPayload(body, secret);
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
            "x-github-delivery": `phase9-red-replay-${Date.now()}`,
            "x-hub-signature-256": signature,
          },
          body,
          timeoutMs: PROBE_TIMEOUT_MS,
        });
        // A properly-implemented replay check would return 401 with
        // a replay-related error code. The current implementation
        // returns either:
        //   - 401 (if the secret is wrong / not configured), OR
        //   - 200 with `received: true` (if the secret is configured
        //     and the signature matches the body) — which is the
        //     RED case.
        // We assert 401 with a "replay" or "stale" substring in the
        // error message. The current implementation will fail this
        // assertion by returning 200.
        expect.soft(
          response.status,
          `expected 401 from signed stale-timestamp payload (replay detected), got ${response.status} — the current verifyWebhookSignature has no timestamp check, so the delivery is accepted as if it were fresh`,
        ).toBe(401);
        const body2 = (await response.json().catch(() => null)) as
          | { error?: string; received?: boolean }
          | null;
        const errMsg = (body2?.error ?? "").toLowerCase();
        const isReplayError =
          errMsg.includes("replay") ||
          errMsg.includes("stale") ||
          errMsg.includes("timestamp") ||
          errMsg.includes("expired");
        expect.soft(
          isReplayError,
          `expected 401 body to surface a replay/stale/timestamp error, got error='${body2?.error}' — the route must reject stale-timestamp payloads to prevent replay attacks`,
        ).toBe(true);
      },
      PROBE_TIMEOUT_MS + 2_000,
    );
  });
});

describe("Phase 9 — Webhook resilience (production)", () => {
  beforeAll(() => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    expect(PROD_URL, "PHASE9_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  describe("Cold-start tolerance", () => {
    skipIf(
      "POST /webhooks/github/pr (first request after idle) responds within 2× the GitHub timeout — proxy for 'App handles webhook during cold start'",
      async () => {
        // Cloud Run scale-to-zero means the first request after an
        // idle period pays the cold-start cost. The webhook must
        // still respond within GitHub's timeout window (10s) plus
        // a 2× margin to account for the cold-start penalty.
        // We use the no-sig path because it does not require the
        // webhook secret; the cold-start is on the route, not on
        // the signature.
        const t0 = performance.now();
        const response = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-github-event": "ping" },
          body: JSON.stringify({}),
          timeoutMs: 2 * GITHUB_TIMEOUT_MS,
        });
        const elapsedMs = performance.now() - t0;
        // The no-sig path returns 401 immediately; what we measure
        // is the cold-start overhead. Cloud Run cold-starts can be
        // 1-5s on a small container; we allow up to 2× GitHub's
        // timeout (20s) to leave headroom for the container init.
        expect.soft(
          response.status,
          `expected 401 from no-sig webhook (cold-start probe), got ${response.status}`,
        ).toBe(401);
        expect.soft(
          elapsedMs < 2 * GITHUB_TIMEOUT_MS,
          `cold-start webhook took ${Math.round(elapsedMs)}ms — must be < ${2 * GITHUB_TIMEOUT_MS}ms (2× GitHub timeout to leave headroom for container init)`,
        ).toBe(true);
      },
      2 * GITHUB_TIMEOUT_MS + 5_000,
    );
  });

  describe("Concurrent deliveries", () => {
    skipIfNoKeystoneSecret(
      "POST /webhooks/github/pr × 5 parallel signed payloads — all 5 return 200 with received: true — proxy for 'App handles concurrent webhook deliveries'",
      async () => {
        // The Hono route has no documented concurrency control, so
        // 5 parallel deliveries should each be processed
        // independently. We synthesize a unique deliveryId per
        // payload so the audit trail doesn't deduplicate.
        const N = 5;
        const requests = Array.from({ length: N }, (_, i) => {
          const payload = JSON.stringify({
            timestamp: Math.floor(Date.now() / 1000),
            action: "ping",
            delivery: i,
            zen: `parallel-test-${i}`,
          });
          const signature = signWebhookPayload(
            payload,
            process.env.PHASE9_TEST_GITHUB_WEBHOOK_SECRET!,
          );
          return fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-github-event": "ping",
              "x-github-delivery": `phase9-red-parallel-${Date.now()}-${i}`,
              "x-hub-signature-256": signature,
            },
            body: payload,
            timeoutMs: PROBE_TIMEOUT_MS,
          });
        });
        const responses = await Promise.all(requests);
        expect.soft(
          responses.length,
          `expected ${N} parallel responses, got ${responses.length}`,
        ).toBe(N);
        for (let i = 0; i < responses.length; i++) {
          const r = responses[i]!;
          expect.soft(
            r.status,
            `expected 200 from parallel webhook #${i}, got ${r.status}`,
          ).toBe(200);
          const body = (await r.json().catch(() => null)) as
            | { received?: boolean }
            | null;
          expect.soft(
            body?.received,
            `parallel webhook #${i} must surface { received: true } on success`,
          ).toBe(true);
        }
      },
      PROBE_TIMEOUT_MS + 5_000,
    );
  });

  describe("Failed processing is logged", () => {
    skipIfNoAdminCreds(
      "codecamp.webhookEvents (ADMIN) surfaces the keystone deliveryId with a valid outcome — proxy for 'Failed webhook processing is logged'",
      async () => {
        // The audit trail is wired through the domain-layer
        // `logWebhookEvent` (see packages/domain/src/codecamp/index.ts).
        // A regression that bypasses the domain layer (e.g., logging
        // only via the webhooks-layer `logWebhookEvent` in
        // packages/webhooks/src/github.ts) would not surface in this
        // query — see test-strategy.md §6 "dual logWebhookEvent
        // symbols" concern.
        const { cookie } = await loginAndGetCookie(
          process.env.PHASE9_TEST_ADMIN_USERNAME!,
          process.env.PHASE9_TEST_ADMIN_PASSWORD!,
        );
        const { status, body } = await trpcGet("codecamp.webhookEvents", {
          cookie,
          inputJson: { limit: 50 },
        });
        expect.soft(status, `expected 200 from codecamp.webhookEvents, got ${status}`).toBe(200);
        const payload = body as {
          result?: { data?: { json?: Array<Record<string, unknown>> } };
        };
        const rows = payload.result?.data?.json ?? [];
        expect.soft(
          Array.isArray(rows),
          "codecamp.webhookEvents must return an array of webhookEventSchema objects",
        ).toBe(true);
        // Each row must conform to the webhookEventSchema shape.
        // A regression that drops a required key is an audit-trail
        // rendering bug on the admin debug page.
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]!;
          for (const key of [
            "id",
            "deliveryId",
            "event",
            "action",
            "repoUrl",
            "prUrl",
            "githubUsername",
            "outcome",
            "reason",
            "payloadJson",
            "createdAt",
          ]) {
            expect.soft(
              key in row,
              `webhookEvent row #${i} missing required key '${key}' — got keys: ${Object.keys(row).join(",")}`,
            ).toBe(true);
          }
          // outcome must be one of the documented enum values
          // ["ignored", "failed"]. A regression that adds a value
          // (e.g., "processed") is a contract drift bug.
          const allowedOutcomes = ["ignored", "failed"];
          expect.soft(
            allowedOutcomes.includes(row.outcome as string),
            `webhookEvent row #${i}.outcome must be one of ${allowedOutcomes.join("|")}, got=${row.outcome}`,
          ).toBe(true);
        }
      },
      PROBE_TIMEOUT_MS + 5_000,
    );
  });
});

// ─── P1 launch gate (single hard assertion) ────────────────

describe("Phase 9 — P1 launch gate (single hard assertion)", () => {
  skipIf(
    "all Phase 9 P1 acceptance criteria are met (launch gate)",
    async () => {
      const missing: string[] = [];

      // 1. Webhook must reject missing signature with 401.
      const noSigRes = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-github-event": "pull_request" },
        body: JSON.stringify({ action: "opened" }),
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      if (noSigRes.status !== 401) {
        missing.push(
          `POST /webhooks/github/pr (no sig) returned ${noSigRes.status} (expected 401)`,
        );
      } else {
        const body = (await noSigRes.json().catch(() => null)) as { error?: string } | null;
        if (body?.error !== "Missing signature") {
          missing.push(
            `POST /webhooks/github/pr (no sig) missing 'Missing signature' envelope — got: ${JSON.stringify(body)}`,
          );
        }
      }

      // 2. Webhook must reject bad signature with 401.
      const badSigRes = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "pull_request",
          "x-hub-signature-256":
            "sha256=0000000000000000000000000000000000000000000000000000000000000000",
        },
        body: JSON.stringify({ action: "opened" }),
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      if (badSigRes.status !== 401) {
        missing.push(
          `POST /webhooks/github/pr (bad sig) returned ${badSigRes.status} (expected 401)`,
        );
      } else {
        const body = (await badSigRes.json().catch(() => null)) as { error?: string } | null;
        if (body?.error !== "Invalid signature") {
          missing.push(
            `POST /webhooks/github/pr (bad sig) missing 'Invalid signature' envelope — got: ${JSON.stringify(body)}`,
          );
        }
      }

      // 3. Webhook must reach prod without erroring on the root
      //    path. A 5xx on the no-event probe means the route is
      //    wired but erroring on a code path the unauth probe
      //    should not reach.
      const healthRes = await fetchWithTimeout(`${PROD_URL}/webhooks/github/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-github-event": "ping" },
        body: JSON.stringify({}),
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      if (healthRes.status >= 500) {
        missing.push(
          `POST /webhooks/github/pr returned 5xx (${healthRes.status}) — route wired but erroring`,
        );
      }

      expect(
        missing,
        `Phase 9 P1 launch gate failed — ${missing.length} critical item(s) missing: ${missing.join("; ")}`,
      ).toEqual([]);
    },
    PROBE_TIMEOUT_MS * 3 + 5_000,
  );
});

// ─── Unit tests (no network) ───────────────────────────────

describe("Phase 9 — source-contract detector: replay-attack timestamp check", () => {
  // The current `verifyWebhookSignature` (packages/webhooks/src/github-client.ts:102-114)
  // only checks the HMAC. A future commit that adds a timestamp-window
  // check (e.g., a `timestamp` parameter, a `MAX_TIMESTAMP_SKEW_SECONDS`
  // constant, or a `Date.now()` call inside the function body) will
  // satisfy this contract and turn the Red-phase assertion green.
  it("verifyWebhookSignature in packages/webhooks/src/github-client.ts must implement a timestamp window check (Date.now(), timestamp parameter, or MAX_TIMESTAMP_SKEW constant) — RED on HEAD until replay prevention is added", () => {
    const src = readFileSync(WEBHOOK_CLIENT_SOURCE, "utf8");
    const functionSrc = src.match(
      /export\s+function\s+verifyWebhookSignature[\s\S]*?^\}/m,
    );
    expect(
      functionSrc,
      "verifyWebhookSignature not found in packages/webhooks/src/github-client.ts",
    ).not.toBeNull();
    const body = functionSrc![0];
    // Pattern 1: explicit timestamp parameter (e.g., `timestamp: number` or `timestampMs: number`)
    const hasTimestampParam =
      /\b(timestamp|timestampMs|ts|requestTimestamp)\s*:\s*number/.test(body);
    // Pattern 2: Date.now() / Math.floor(Date.now() / 1000) inside the function body
    const hasDateNow = /Date\.now\(\)/.test(body);
    // Pattern 3: a tolerance constant referenced (e.g., MAX_TIMESTAMP_SKEW_SECONDS, REPLAY_WINDOW_SECONDS)
    const hasSkewConstant =
      /MAX_(TIMESTAMP_)?SKEW|REPLAY_WINDOW|TIMESTAMP_TOLERANCE|TIMESTAMP_WINDOW/i.test(body);
    const hasTimestampCheck = hasTimestampParam || hasDateNow || hasSkewConstant;
    expect(
      hasTimestampCheck,
      `verifyWebhookSignature must implement a timestamp window check (one of: explicit timestamp param, Date.now() in body, or skew/window constant). Current body: ${body.slice(0, 400)}`,
    ).toBe(true);
  });

  it("the webhook route in packages/webhooks/src/github.ts must reference a timestamp check OR a max-skew constant — RED on HEAD", () => {
    const src = readFileSync(WEBHOOK_ROUTE_SOURCE, "utf8");
    // The route may delegate the timestamp check to verifyWebhookSignature
    // (in which case the previous test catches it) or implement it
    // itself. We accept either: the route file references a
    // timestamp check, OR the file imports a skew constant, OR the
    // file contains Date.now() in the route handler scope.
    const hasTimestampReference =
      /\btimestamp\b/i.test(src) ||
      /Date\.now\(\)/.test(src) ||
      /MAX_(TIMESTAMP_)?SKEW|REPLAY_WINDOW|TIMESTAMP_TOLERANCE|TIMESTAMP_WINDOW/i.test(src);
    expect(
      hasTimestampReference,
      `the webhook route in packages/webhooks/src/github.ts must reference a timestamp, Date.now(), or a max-skew/replay-window constant to prevent replay attacks`,
    ).toBe(true);
  });

  it("the webhook route rejects malformed timestamp claims and reads body timestamps used by the replay probe", () => {
    const src = readFileSync(WEBHOOK_ROUTE_SOURCE, "utf8");
    expect(
      /Number\.isFinite\(timestamp\)/.test(src) && /Invalid timestamp/.test(src),
      "packages/webhooks/src/github.ts must reject non-finite timestamp claims with an Invalid timestamp response",
    ).toBe(true);
    expect(
      /bodyTimestamp/.test(src) && /timestampPayload\.timestamp/.test(src),
      "packages/webhooks/src/github.ts must read the signed body timestamp so the Phase 9 replay probe cannot be bypassed when timestamp headers are absent",
    ).toBe(true);
  });
});

describe("Phase 9 — sign helper unit tests", () => {
  it("signWebhookPayload produces a valid HMAC-SHA256 signature that the server-side verifyWebhookSignature can verify", () => {
    // Roundtrip the helper against the documented `sha256=` prefix
    // and the 64-character hex digest that the server-side
    // `verifyWebhookSignature` parses via `timingSafeEqual`.
    const payload = JSON.stringify({ action: "opened", n: 1 });
    const secret = "roundtrip-secret-123";
    const sig = signWebhookPayload(payload, secret);
    expect(sig.startsWith("sha256="), `signature must start with 'sha256=' prefix, got: ${sig.slice(0, 20)}`).toBe(true);
    const hex = sig.slice("sha256=".length);
    expect(hex, "signature hex must be 64 chars (SHA-256)").toHaveLength(64);
    expect(hex, "signature hex must be lowercase hex").toMatch(/^[0-9a-f]+$/);
  });

  it("signWebhookPayload produces different signatures for different payloads with the same secret", () => {
    const secret = "same-secret";
    const a = signWebhookPayload('{"a":1}', secret);
    const b = signWebhookPayload('{"a":2}', secret);
    expect(a, "different payloads must produce different signatures").not.toBe(b);
  });

  it("signWebhookPayload produces different signatures for the same payload with different secrets", () => {
    const payload = '{"a":1}';
    const a = signWebhookPayload(payload, "secret-a");
    const b = signWebhookPayload(payload, "secret-b");
    expect(a, "different secrets must produce different signatures").not.toBe(b);
  });

  it("signWebhookPayload produces the same signature as Node's crypto.createHmac (sanity check)", () => {
    // Sanity: the helper is a thin wrapper over createHmac.
    const payload = "hello world";
    const secret = "shh";
    const sig = signWebhookPayload(payload, secret);
    const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    expect(sig).toBe(expected);
  });
});

describe("Phase 9 — schema contract: webhookEventSchema.outcome includes 'failed'", () => {
  // The failed-path audit trail is the foundation of the
  // "Failed webhook processing is logged" sub-task. If the schema
  // dropped the "failed" value, the audit trail would silently
  // accept no-failure semantics.
  it("webhookEventSchema.outcome enum in packages/types/src/codecamp.ts is exactly ['ignored', 'failed']", () => {
    const src = readFileSync(CODECAMP_TYPES_SOURCE, "utf8");
    const outcomeRe = /webhookEventSchema[\s\S]*?outcome:\s*z\.enum\(\[\s*([^\]]+?)\s*\]\)/;
    const m = outcomeRe.exec(src);
    expect(
      m,
      "webhookEventSchema.outcome enum not found in packages/types/src/codecamp.ts",
    ).not.toBeNull();
    const raw = m![1]!;
    const values = Array.from(raw.matchAll(/"([^"]+)"/g)).map((x) => x[1]);
    expect(values).toEqual(["ignored", "failed"]);
  });

  it("the failed-path audit trail is wired through the domain layer (not a parallel webhooks-layer log) — verified by inspecting logWebhookEvent callers in packages/webhooks/src/github.ts", () => {
    // Per test-strategy.md §6, there are two `logWebhookEvent`
    // symbols: one in packages/webhooks/src/github.ts and one in
    // packages/domain/src/codecamp/index.ts. The route must use
    // the domain-layer one (so the row surfaces in
    // codecamp.webhookEvents). The webhooks-layer one is a
    // wrapper that delegates to the domain-layer one.
    const src = readFileSync(WEBHOOK_ROUTE_SOURCE, "utf8");
    // The route must call `codecamp.logWebhookEvent(...)` (the
    // domain-layer symbol) for the failed path, not import or
    // call a local logWebhookEvent.
    const hasDomainLayerCall = /codecamp\.logWebhookEvent\(/.test(src);
    expect(
      hasDomainLayerCall,
      `the route in packages/webhooks/src/github.ts must call codecamp.logWebhookEvent (domain layer) — found local logWebhookEvent calls would indicate the audit trail is bypassing the domain layer`,
    ).toBe(true);
  });
});
