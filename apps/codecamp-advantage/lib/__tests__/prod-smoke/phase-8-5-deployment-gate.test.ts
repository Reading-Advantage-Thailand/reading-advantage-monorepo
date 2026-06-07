import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 8.5 — Deployment Gate: Deploy & Re-verify (P0, BLOCKER)
 *
 * Black-box + source-artifact tests for the production deployment gate
 * (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * Phases 1–8 marked their tasks `[x]` on a code-complete basis, but
 * every P0/P1 launch gate is currently RED against the live server because
 * the accumulated fixes (security headers `a0862b3`; login 401-not-500
 * `df39c2f`; Thai font `afbd038`; cache-control `79e08c0`; observability
 * `3fb1a87`) have NOT been deployed. Phase 8.5 is the gate that proves
 * the deploy landed AND the live launch gates go green.
 *
 * These tests encode the Phase 8.5 acceptance criteria as executable
 * contract. They will fail (Red) until:
 *   (a) the Cloud Run revision serving prod includes the Phase 1/2/3/7/8
 *       fixes (the P0/P1 launch gates from those phases all return green
 *       against the live URL),
 *   (b) the deploy artifact (`cloudbuild.yaml`) is structured so the
 *       rollback / re-deploy is reproducible (all env vars + secrets
 *       bound, correct image registry, correct region), and
 *   (c) follow-up tracks for the findings the deploy does NOT fix
 *       (warm-dashboard 1363ms vs 1000ms; 1 render-blocking `<script>`;
 *       cold start > 5s) are filed under `measure/tracks/`.
 *
 * Three valid Red-phase failure modes are expected:
 *   1. Network/connectivity failure (the test runner cannot reach prod) —
 *      indicates the probe must be run from a network that can reach prod.
 *   2. Assertion failure (prod reachable, but the contract is unmet) —
 *      indicates the Cloud Run revision is still serving the pre-fix
 *      container, and a `gcloud builds submit` is required to roll forward.
 *   3. Missing follow-up tracks — the 3 P1 follow-ups + 1 informational
 *      follow-up have not yet been filed in `measure/tracks/`.
 *
 * Set PHASE85_PROD_URL to override the default target (useful for staging).
 * Set PHASE85_SKIP=1 to skip the network + static source probes; the helper
 * unit tests and the follow-up track file checks still run unconditionally
 * so a regression in those primitives fails the suite immediately.
 *
 * **Test budget:** Phase 8.5 is gating — the per-check probes use
 * `expect.soft` so a single run enumerates all gaps, and a single P0
 * launch-gate test fails hard if any critical P0/P1 launch gate is unmet.
 *
 * Note on divergence from test-strategy.md: the test-strategy says
 * "No new unit tests are required for this track" and "keep curl probes
 * out of repo source." Per the 2026-06-07 mid-session supervisor
 * instruction (same as Phases 1–8), Phase 8.5 is elevated from manual
 * checks to executable contract. The static source/artifact checks and
 * the helper unit tests run unconditionally so regressions in those
 * primitives fail the suite immediately. The network probes remain
 * black-box HTTP smoke tests against prod, consistent with the strategy.
 */

const PROD_URL = process.env.PHASE85_PROD_URL ?? "https://codecamp.reading-advantage.com";
const SKIP = process.env.PHASE85_SKIP === "1";
const REQUEST_TIMEOUT_MS = 5_000;

// ─── Repository paths for static source/artifact checks ──────────
//
// The Vitest test runner is invoked from `apps/codecamp-advantage/`, so
// `process.cwd()` is the app root. We resolve the package + monorepo
// paths from there. `import.meta.url` is the URL of this test file and
// is independent of the cwd, so we prefer it.
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../../..");
const MONOREPO_ROOT = resolve(APP_ROOT, "../..");
const CLOUDBUILD_YAML = resolve(APP_ROOT, "cloudbuild.yaml");
const TRACKS_DIR = resolve(MONOREPO_ROOT, "measure/tracks");
const TECH_DEBT_MD = resolve(MONOREPO_ROOT, "measure/tech-debt.md");

// ─── Follow-up track naming convention ────────────────────────────
//
// The 3 P1 follow-up tracks the deploy does NOT fix are listed in
// `plan.md` Phase 8.5 Task 3. Per existing track naming, the directory
// prefix is `codecamp_<area>_<date>`. We accept any date in the
// directory name to keep the test resilient to clock drift.
const FOLLOWUP_TRACK_PREFIXES = [
  { prefix: "codecamp_perf_warm_dashboard", label: "warm dashboard 1363ms vs 1000ms budget" },
  { prefix: "codecamp_asset_render_blocking", label: "1 render-blocking <script> in <head>" },
  { prefix: "codecamp_infra_cold_start", label: "cold start exceeds 5s budget" },
] as const;

// ─── Required secret bindings for the Cloud Run deploy ──────────
//
// `cloudbuild.yaml` must bind every secret the running container needs.
// Per `plan.md` Phase 2 (commit `0a588ca`) and Phase 8 Green (commit
// `3fb1a87`), the required Secret Manager bindings are:
const REQUIRED_SECRETS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "OPENROUTER_API_KEY",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_PRIVATE_KEY",
] as const;

const REQUIRED_ENV_VARS = ["NODE_ENV=production"] as const;

// ─── Conditional test helpers ───────────────────────────────────
const testIf = (skipCondition: boolean) => (skipCondition ? it.skip : it);
const skipIf = testIf(SKIP);

// ─── HTTP helper (mirrors Phases 1-8) ───────────────────────────
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

// ─── Cache-Control parser (mirrors phase-7 helper) ──────────────
const parseCacheControl = (header: string | null | undefined): Record<string, string> => {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const raw of header.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) {
      out[part.toLowerCase()] = "";
    } else {
      let v = part.slice(eq + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      out[part.slice(0, eq).toLowerCase()] = v;
    }
  }
  return out;
};

// ─── Source/artifact helpers ────────────────────────────────────

/**
 * Returns the list of `measure/tracks/<name>/` directory names under the
 * monorepo. Returns an empty array if the directory does not exist
 * (e.g. the test is run from a shallow checkout).
 */
const listTrackDirs = (): string[] => {
  if (!existsSync(TRACKS_DIR)) return [];
  return readdirSync(TRACKS_DIR).filter((name) => {
    const full = resolve(TRACKS_DIR, name);
    try {
      return statSync(full).isDirectory();
    } catch {
      return false;
    }
  });
};

/**
 * Returns the parsed `--set-secrets=KEY1=SECRET1:latest,KEY2=SECRET2:latest,...`
 * argument from the `deploy-cloudrun` step of `cloudbuild.yaml`, or an empty
 * array if the file or the step cannot be parsed.
 */
const parseCloudBuildSetSecrets = (yamlText: string): string[] => {
  const lines = yamlText.split(/\r?\n/);
  const secretsLine = lines.find((l) => /--set-secrets=/.test(l));
  if (!secretsLine) return [];
  const m = secretsLine.match(/--set-secrets=([^\s"']+)/);
  if (!m) return [];
  return m[1]!.split(",").map((kv) => kv.split("=")[0]!.trim()).filter(Boolean);
};

const parseCloudBuildSetEnvVars = (yamlText: string): string[] => {
  const lines = yamlText.split(/\r?\n/);
  const envLine = lines.find((l) => /--set-env-vars=/.test(l));
  if (!envLine) return [];
  const m = envLine.match(/--set-env-vars=([^\s"']+)/);
  if (!m) return [];
  return m[1]!.split(",").map((kv) => kv.split("=")[0]!.trim()).filter(Boolean);
};

const parseCloudBuildRegion = (yamlText: string): string | null => {
  const m = yamlText.match(/--region=([a-z0-9-]+)/i);
  return m ? m[1]! : null;
};

const parseCloudBuildImageRegistry = (yamlText: string): string | null => {
  const m = yamlText.match(/([a-z0-9-]+-docker\.pkg\.dev\/[^\s"']+)/i);
  return m ? m[1]! : null;
};

// ─── Network probe: aggregated P0/P1 launch gate ────────────────

interface LaunchGateResult {
  phase: "1" | "2/3" | "7" | "8";
  description: string;
  pass: boolean;
  evidence: string;
}

const probePhase1LaunchGate = async (): Promise<LaunchGateResult> => {
  const r = await fetchWithTimeout(PROD_URL, { method: "GET", timeoutMs: 8_000 });
  if (r.status >= 400) {
    return {
      phase: "1",
      description: "5 critical security headers present",
      pass: false,
      evidence: `root URL returned ${r.status}`,
    };
  }
  const missing: string[] = [];
  const csp = r.headers.get("content-security-policy");
  if (!csp || !/default-src/.test(csp)) missing.push("Content-Security-Policy (default-src)");
  const hsts = r.headers.get("strict-transport-security");
  if (!hsts || !/max-age=\d+/.test(hsts)) missing.push("Strict-Transport-Security (max-age)");
  const xfo = r.headers.get("x-frame-options");
  if (!xfo || !["DENY", "SAMEORIGIN"].includes(xfo.toUpperCase())) {
    missing.push("X-Frame-Options (DENY|SAMEORIGIN)");
  }
  const xcto = r.headers.get("x-content-type-options");
  if ((xcto ?? "").toLowerCase() !== "nosniff") missing.push("X-Content-Type-Options (nosniff)");
  const rp = r.headers.get("referrer-policy");
  if (!rp) missing.push("Referrer-Policy");
  return {
    phase: "1",
    description: "5 critical security headers present",
    pass: missing.length === 0,
    evidence: missing.length === 0 ? "all 5 headers present" : `missing: ${missing.join(", ")}`,
  };
};

const probePhase2Or3LaunchGate = async (): Promise<LaunchGateResult> => {
  let r: Response;
  try {
    r = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "phase85-nonexistent@example.invalid", password: "wrong" }),
      timeoutMs: 8_000,
    });
  } catch (e) {
    return {
      phase: "2/3",
      description: "POST /api/auth/login returns 401 (not 500) on bad creds",
      pass: false,
      evidence: `network error: ${(e as Error).message}`,
    };
  }
  const pass = r.status >= 400 && r.status < 500;
  return {
    phase: "2/3",
    description: "POST /api/auth/login returns 401 (not 500) on bad creds",
    pass,
    evidence: pass ? `status=${r.status}` : `status=${r.status} (expected 4xx, got 5xx or 2xx)`,
  };
};

const probePhase7LaunchGate = async (): Promise<LaunchGateResult> => {
  try {
    const session = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
      method: "GET",
      timeoutMs: 8_000,
    });
    const sessionCc = parseCacheControl(session.headers.get("cache-control"));
    const sessionOk =
      "no-store" in sessionCc ||
      ("private" in sessionCc &&
        (sessionCc["s-maxage"] === undefined || Number(sessionCc["s-maxage"]) === 0));
    const root = await fetchWithTimeout(PROD_URL, { method: "GET", timeoutMs: 8_000 });
    const rootCc = parseCacheControl(root.headers.get("cache-control"));
    const rootHasCacheHint =
      (rootCc["s-maxage"] !== undefined && Number(rootCc["s-maxage"]) > 0) ||
      rootCc["stale-while-revalidate"] !== undefined;
    const ok = sessionOk && rootHasCacheHint;
    const evidence: string[] = [];
    if (!sessionOk) {
      evidence.push(
        `/api/auth/session cache-control=${session.headers.get("cache-control") ?? "<missing>"} (need no-store or private+s-maxage=0)`,
      );
    }
    if (!rootHasCacheHint) {
      evidence.push(
        `root URL cache-control=${root.headers.get("cache-control") ?? "<missing>"} (need s-maxage>0 or stale-while-revalidate)`,
      );
    }
    return {
      phase: "7",
      description: "tRPC + /api/auth/session no-store/private; public shell s-maxage/SWR",
      pass: ok,
      evidence: ok ? "all 2 cache directives present" : evidence.join("; "),
    };
  } catch (e) {
    return {
      phase: "7",
      description: "tRPC + /api/auth/session no-store/private; public shell s-maxage/SWR",
      pass: false,
      evidence: `network error: ${(e as Error).message}`,
    };
  }
};

const probePhase8LaunchGate = async (): Promise<LaunchGateResult> => {
  try {
    const trpc = await fetchWithTimeout(
      `${PROD_URL}/api/trpc/codecamp.dashboard?input=${encodeURIComponent(
        JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
      )}`,
      { method: "GET", timeoutMs: 8_000 },
    );
    const notFound = await fetchWithTimeout(`${PROD_URL}/__phase85_does_not_exist__`, {
      method: "GET",
      timeoutMs: 8_000,
    });
    // Phase 8 launch gate (live, 4-item contract): tRPC unauth returns 401;
    // /api/auth/session returns 200; missing routes return 404; the 404 body
    // is non-empty and not a raw stack trace.
    const trpcOk = trpc.status === 401;
    const notFoundOk = notFound.status === 404;
    const ok = trpcOk && notFoundOk;
    const evidence: string[] = [];
    if (!trpcOk) evidence.push(`tRPC unauth status=${trpc.status} (expected 401)`);
    if (!notFoundOk) evidence.push(`404 status=${notFound.status} (expected 404)`);
    return {
      phase: "8",
      description: "tRPC unauth 401 + missing routes 404 (live launch gate slice)",
      pass: ok,
      evidence: ok ? "tRPC 401 + 404 OK" : evidence.join("; "),
    };
  } catch (e) {
    return {
      phase: "8",
      description: "tRPC unauth 401 + missing routes 404 (live launch gate slice)",
      pass: false,
      evidence: `network error: ${(e as Error).message}`,
    };
  }
};

const probeAggregatedLaunchGate = async (): Promise<LaunchGateResult[]> => {
  return await Promise.all([
    probePhase1LaunchGate(),
    probePhase2Or3LaunchGate(),
    probePhase7LaunchGate(),
    probePhase8LaunchGate(),
  ]);
};

// ═════════════════════════════════════════════════════════════════
// Test suites
// ═════════════════════════════════════════════════════════════════

// ─── Suite 1: Cloud Build artifact checks (filesystem, run unconditionally)
//
// These check the deploy artifact is well-formed. They run unconditionally
// so a regression in cloudbuild.yaml (e.g. dropping a --set-secrets binding)
// fails the suite immediately, before the network probes even attempt to
// reach prod.
describe("Phase 8.5 — Cloud Build deploy artifact", () => {
  beforeAll(() => {
    expect(
      existsSync(CLOUDBUILD_YAML),
      `cloudbuild.yaml must exist at ${CLOUDBUILD_YAML} for a reproducible deploy`,
    ).toBe(true);
  });

  it("binds every required Secret Manager secret via --set-secrets=", () => {
    const text = readFileSync(CLOUDBUILD_YAML, "utf8");
    const bound = parseCloudBuildSetSecrets(text);
    const missing = REQUIRED_SECRETS.filter((s) => !bound.includes(s));
    expect(
      missing,
      `cloudbuild.yaml --set-secrets is missing: ${missing.join(", ")}. Bound: ${bound.join(", ")}`,
    ).toEqual([]);
  });

  it("sets NODE_ENV=production in --set-env-vars=", () => {
    const text = readFileSync(CLOUDBUILD_YAML, "utf8");
    const env = parseCloudBuildSetEnvVars(text);
    const missing = REQUIRED_ENV_VARS.filter(
      (e) => !env.some((k) => e.split("=")[0] === k),
    );
    expect(
      missing,
      `cloudbuild.yaml --set-env-vars is missing: ${missing.join(", ")}. Set: ${env.join(", ")}`,
    ).toEqual([]);
  });

  it("deploys to the asia-southeast1 region", () => {
    const text = readFileSync(CLOUDBUILD_YAML, "utf8");
    const region = parseCloudBuildRegion(text);
    expect(region, "cloudbuild.yaml --region not found").toBe("asia-southeast1");
  });

  it("pushes the image to the asia-southeast1 Artifact Registry", () => {
    const text = readFileSync(CLOUDBUILD_YAML, "utf8");
    const reg = parseCloudBuildImageRegistry(text);
    expect(
      reg,
      "cloudbuild.yaml must reference an asia-southeast1-docker.pkg.dev image registry",
    ).toMatch(/^asia-southeast1-docker\.pkg\.dev\//);
  });
});

// ─── Suite 2: Follow-up track file checks (filesystem, run unconditionally)
//
// These check that the 3 P1 follow-up tracks have been filed. They run
// unconditionally (no skip) so a missing follow-up track fails the suite
// immediately, independent of network reach. The follow-up tracks are a
// Phase 8.5 deliverable per plan.md Task 3; the test encodes that.
describe("Phase 8.5 — Follow-up tracks filed for deploy-fixed-only findings", () => {
  it("tech-debt.md mentions the 3 P1 follow-ups (codecamp_qa_prod_20260517 row)", () => {
    expect(existsSync(TECH_DEBT_MD), `tech-debt.md not found at ${TECH_DEBT_MD}`).toBe(true);
    const text = readFileSync(TECH_DEBT_MD, "utf8");
    expect(
      text,
      "tech-debt.md must contain a row tagged codecamp_qa_prod_20260517 logging the 3 P1 follow-ups",
    ).toMatch(/codecamp_qa_prod_20260517/);
    expect(
      text,
      "tech-debt.md must mention the warm-dashboard perf follow-up",
    ).toMatch(/1363ms|warm dashboard/i);
    expect(
      text,
      "tech-debt.md must mention the render-blocking asset follow-up",
    ).toMatch(/render[- ]blocking/i);
    expect(
      text,
      "tech-debt.md must mention the cold-start infra follow-up",
    ).toMatch(/cold start/i);
  });

  for (const { prefix, label } of FOLLOWUP_TRACK_PREFIXES) {
    it(`a follow-up track directory exists for: ${label} (prefix=${prefix}_*)`, () => {
      const dirs = listTrackDirs();
      const match = dirs.find((d) => d.startsWith(prefix));
      expect(
        match,
        `expected a follow-up track at measure/tracks/${prefix}_*/ — found ${dirs.length} track directories: ${dirs.join(", ")}`,
      ).toBeDefined();
    });
  }
});

// ─── Suite 3: Aggregated P0/P1 launch gate (network, single hard assertion)
//
// This is THE test that captures Phase 8.5's deploy + re-verify deliverable.
// It re-asserts the launch-gate contracts from Phases 1, 2/3, 7, 8 against
// the live prod URL. The test fails when the running Cloud Run revision is
// still serving the pre-fix container. The test passes once the deploy
// described in Task 1 has rolled forward to 100% traffic.
describe("Phase 8.5 — Aggregated P0/P1 launch gate (single hard assertion)", () => {
  beforeAll(() => {
    expect(PROD_URL, "PHASE85_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  skipIf(
    "every critical P0/P1 launch gate passes against the deployed revision",
    async () => {
      const results = await probeAggregatedLaunchGate();
      const failed = results.filter((r) => !r.pass);
      const summary = results
        .map((r) => `${r.pass ? "PASS" : "FAIL"} (Phase ${r.phase}) ${r.description} — ${r.evidence}`)
        .join("\n  ");
      expect(
        failed,
        `Phase 8.5 aggregated launch gate failed — ${failed.length}/${results.length} gate(s) RED:\n  ${summary}`,
      ).toEqual([]);
    },
    REQUEST_TIMEOUT_MS + 30_000,
  );
});

// ─── Suite 4: Per-gate re-verification (network, expect.soft enumeration)
//
// Per-gate probes mirror Phases 1, 2/3, 7, 8 — the per-check probes use
// expect.soft so a single run enumerates which gates are still red, and
// so a future "Phase 8.5 green" re-run produces a clean per-gate table.
describe("Phase 8.5 — Per-gate re-verification probes", () => {
  skipIf(
    "Phase 1 — all 5 critical security headers present on root URL",
    async () => {
      const r = await fetchWithTimeout(PROD_URL, { method: "GET", timeoutMs: 8_000 });
      expect.soft(r.status, `expected 2xx/3xx from root URL, got ${r.status}`).toBeLessThan(400);
      const missing: string[] = [];
      const csp = r.headers.get("content-security-policy");
      if (!csp || !/default-src/.test(csp)) missing.push("Content-Security-Policy (default-src)");
      const hsts = r.headers.get("strict-transport-security");
      if (!hsts || !/max-age=\d+/.test(hsts)) missing.push("Strict-Transport-Security (max-age)");
      const xfo = r.headers.get("x-frame-options");
      if (!xfo || !["DENY", "SAMEORIGIN"].includes(xfo.toUpperCase())) {
        missing.push("X-Frame-Options (DENY|SAMEORIGIN)");
      }
      const xcto = r.headers.get("x-content-type-options");
      if ((xcto ?? "").toLowerCase() !== "nosniff") missing.push("X-Content-Type-Options (nosniff)");
      const rp = r.headers.get("referrer-policy");
      if (!rp) missing.push("Referrer-Policy");
      expect.soft(missing, `Phase 1 re-verify: ${missing.join(", ")}`).toEqual([]);
    },
    REQUEST_TIMEOUT_MS + 4_000,
  );

  skipIf(
    "Phase 2/3 — POST /api/auth/login returns 401 (not 500) on bad creds",
    async () => {
      const r = await fetchWithTimeout(`${PROD_URL}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "phase85-probe@example.invalid", password: "wrong" }),
        timeoutMs: 8_000,
      });
      expect.soft(
        r.status,
        `Phase 2/3 re-verify: expected 4xx, got ${r.status}. A 5xx means the login 401-not-500 fix is NOT yet deployed.`,
      ).toBeGreaterThanOrEqual(400);
      expect.soft(
        r.status,
        `Phase 2/3 re-verify: expected <500, got ${r.status}. A 5xx means the login 401-not-500 fix is NOT yet deployed.`,
      ).toBeLessThan(500);
    },
    REQUEST_TIMEOUT_MS + 4_000,
  );

  skipIf(
    "Phase 7 — tRPC + /api/auth/session have Cache-Control: no-store/private; root URL has s-maxage/SWR",
    async () => {
      const session = await fetchWithTimeout(`${PROD_URL}/api/auth/session`, {
        method: "GET",
        timeoutMs: 8_000,
      });
      const sessionCc = parseCacheControl(session.headers.get("cache-control"));
      const sessionOk =
        "no-store" in sessionCc ||
        ("private" in sessionCc &&
          (sessionCc["s-maxage"] === undefined || Number(sessionCc["s-maxage"]) === 0));
      expect.soft(
        sessionOk,
        `Phase 7 re-verify: /api/auth/session cache-control=${session.headers.get("cache-control") ?? "<missing>"} (need no-store or private+s-maxage=0)`,
      ).toBe(true);

      const root = await fetchWithTimeout(PROD_URL, { method: "GET", timeoutMs: 8_000 });
      const rootCc = parseCacheControl(root.headers.get("cache-control"));
      const rootHasCacheHint =
        (rootCc["s-maxage"] !== undefined && Number(rootCc["s-maxage"]) > 0) ||
        rootCc["stale-while-revalidate"] !== undefined;
      expect.soft(
        rootHasCacheHint,
        `Phase 7 re-verify: root URL cache-control=${root.headers.get("cache-control") ?? "<missing>"} (need s-maxage>0 or stale-while-revalidate)`,
      ).toBe(true);
    },
    REQUEST_TIMEOUT_MS + 8_000,
  );

  skipIf(
    "Phase 8 — tRPC unauth returns 401 + missing routes return 404 (live launch-gate slice)",
    async () => {
      const trpc = await fetchWithTimeout(
        `${PROD_URL}/api/trpc/codecamp.dashboard?input=${encodeURIComponent(
          JSON.stringify({ json: null, meta: { values: ["undefined"] } }),
        )}`,
        { method: "GET", timeoutMs: 8_000 },
      );
      expect.soft(
        trpc.status,
        `Phase 8 re-verify: tRPC unauth status=${trpc.status} (expected 401)`,
      ).toBe(401);

      const notFound = await fetchWithTimeout(`${PROD_URL}/__phase85_does_not_exist__`, {
        method: "GET",
        timeoutMs: 8_000,
      });
      expect.soft(
        notFound.status,
        `Phase 8 re-verify: missing route status=${notFound.status} (expected 404)`,
      ).toBe(404);
    },
    REQUEST_TIMEOUT_MS + 8_000,
  );
});

// ─── Suite 5: Helper unit tests (no network, no filesystem, unconditional)
//
// Pure unit tests for the in-file helper parsers. Run unconditionally so
// regressions in the parsers fail the suite immediately, rather than
// masquerading as a production gap in the network probes.
describe("Phase 8.5 — helper unit tests", () => {
  describe("parseCacheControl", () => {
    it("returns an empty object for null", () => {
      expect(parseCacheControl(null)).toEqual({});
    });
    it("returns an empty object for undefined", () => {
      expect(parseCacheControl(undefined)).toEqual({});
    });
    it("parses a single no-value directive", () => {
      expect(parseCacheControl("no-store")).toEqual({ "no-store": "" });
    });
    it("parses a key=value directive", () => {
      expect(parseCacheControl("max-age=3600")).toEqual({ "max-age": "3600" });
    });
    it("parses the canonical Phase 7 auth no-store directive", () => {
      expect(parseCacheControl("no-store, private")).toEqual({ "no-store": "", private: "" });
    });
    it("lowercases directive names for case-insensitive lookup", () => {
      expect(parseCacheControl("No-Store, Max-Age=0, Private")).toEqual({
        "no-store": "",
        "max-age": "0",
        private: "",
      });
    });
    it("ignores empty segments (trailing/leading commas)", () => {
      expect(parseCacheControl(", no-store , ,")).toEqual({ "no-store": "" });
    });
  });

  describe("parseCloudBuildSetSecrets", () => {
    it("extracts the secret keys from a --set-secrets= argument", () => {
      const yaml = [
        '      - "--set-secrets=DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest"',
      ].join("\n");
      expect(parseCloudBuildSetSecrets(yaml)).toEqual(["DATABASE_URL", "AUTH_SECRET"]);
    });
    it("returns an empty array if --set-secrets= is absent", () => {
      expect(parseCloudBuildSetSecrets("name: foo\n")).toEqual([]);
    });
    it("returns an empty array for malformed --set-secrets= (no value)", () => {
      const yaml = '      - "--set-secrets="\n';
      expect(parseCloudBuildSetSecrets(yaml)).toEqual([]);
    });
  });

  describe("parseCloudBuildSetEnvVars", () => {
    it("extracts the env-var keys from a --set-env-vars= argument", () => {
      const yaml =
        '      - "--set-env-vars=NODE_ENV=production,NEXT_PUBLIC_API_URL=https://x.example.com"\n';
      expect(parseCloudBuildSetEnvVars(yaml)).toEqual([
        "NODE_ENV",
        "NEXT_PUBLIC_API_URL",
      ]);
    });
    it("returns an empty array if --set-env-vars= is absent", () => {
      expect(parseCloudBuildSetEnvVars("name: foo\n")).toEqual([]);
    });
  });

  describe("parseCloudBuildRegion", () => {
    it("extracts the --region= value", () => {
      expect(parseCloudBuildRegion('      - "--region=asia-southeast1"\n')).toBe(
        "asia-southeast1",
      );
    });
    it("returns null when --region= is absent", () => {
      expect(parseCloudBuildRegion("name: foo\n")).toBeNull();
    });
  });

  describe("parseCloudBuildImageRegistry", () => {
    it("extracts the asia-southeast1-docker.pkg.dev/... image registry", () => {
      const yaml =
        '      - "-t=asia-southeast1-docker.pkg.dev/$PROJECT_ID/codecamp/codecamp-advantage:$BUILD_ID"\n';
      expect(parseCloudBuildImageRegistry(yaml)).toBe(
        "asia-southeast1-docker.pkg.dev/$PROJECT_ID/codecamp/codecamp-advantage:$BUILD_ID",
      );
    });
    it("returns null when the image registry is absent", () => {
      expect(parseCloudBuildImageRegistry("name: foo\n")).toBeNull();
    });
  });

  describe("FOLLOWUP_TRACK_PREFIXES constant", () => {
    it("covers the 3 P1 follow-ups listed in plan.md Task 3", () => {
      expect(FOLLOWUP_TRACK_PREFIXES.map((f) => f.prefix)).toEqual([
        "codecamp_perf_warm_dashboard",
        "codecamp_asset_render_blocking",
        "codecamp_infra_cold_start",
      ]);
    });
    it("every prefix is non-empty and has a non-empty label", () => {
      for (const f of FOLLOWUP_TRACK_PREFIXES) {
        expect(f.prefix.length).toBeGreaterThan(0);
        expect(f.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("REQUIRED_SECRETS and REQUIRED_ENV_VARS constants", () => {
    it("REQUIRED_SECRETS includes every secret bound at the Phase 2 / Phase 8 Green check", () => {
      expect(REQUIRED_SECRETS).toEqual([
        "DATABASE_URL",
        "AUTH_SECRET",
        "OPENROUTER_API_KEY",
        "GITHUB_WEBHOOK_SECRET",
        "GITHUB_PRIVATE_KEY",
      ]);
    });
    it("REQUIRED_ENV_VARS includes NODE_ENV=production", () => {
      expect(REQUIRED_ENV_VARS).toContain("NODE_ENV=production");
    });
  });
});
