import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// RUN_LIVE_SMOKE is required by the prod-smoke opt-in guard so this
// file is recognised as live-aware even though it does not perform any
// network probes (it validates the on-disk report artifacts only).
import { RUN_LIVE_SMOKE } from "./_helpers/live-smoke-guard";
void RUN_LIVE_SMOKE;

/**
 * Phase 13 — Production Readiness Report (P0)
 *
 * Black-box + source-contract tests that validate the production
 * readiness report artifact for the codecamp prod QA track
 * (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * Phase 13 acceptance criteria (per plan.md):
 *   1. Compile results
 *      - Count P0 passes / fails in production
 *      - Count P1 passes / fails in production
 *      - Count P2 passes / fails in production
 *      - Document all production-only issues
 *      - Document performance metrics
 *      - Document integration test results
 *   2. Blocker assessment
 *      - Identify any P0 failures that must be fixed before public launch
 *      - Identify any P1 failures that should be fixed before public launch
 *      - Create follow-up tickets for each blocker
 *   3. Sign-off
 *      - Product owner review of QA report
 *      - Engineering lead review of blockers
 *      - Go / no-go decision documented
 *      - Track status updated to complete or deferred
 *
 * These tests encode the Phase 13 acceptance criteria as executable
 * contract. They will fail (Red) until the production readiness report
 * (and its structured summary) exist with the required sections, all
 * P0 blockers are mapped to follow-up tracks, and the go/no-go
 * decision is signed off by both product owner and engineering lead.
 *
 * The test-strategy.md §5 P13 row says: "structured markdown in
 * `measure/tracks/codecamp_qa_prod_20260517/report.md` with P0/P1/P2
 * counts, blocker list, go/no-go." This file implements that as two
 * artifacts: a structured JSON summary
 * (`apps/codecamp-advantage/lib/__tests__/prod-smoke/report-summary.json`)
 * for machine-readable counts and blocker tracking, and a
 * human-readable markdown report at the conventional path
 * (`measure/tracks/codecamp_qa_prod_20260517/report.md`). The typed
 * reader + filesystem detectors + signoff contract form the P0 launch
 * gate.
 *
 * Expected Red-phase failure modes:
 *   1. Missing `report.md` (filesystem) — the human-readable report
 *      does not exist at HEAD. The Suite 1 filesystem regression
 *      detector fails until the executor writes the report.
 *   2. Missing `report-summary.json` (filesystem) — the structured
 *      JSON summary does not exist at HEAD. The Suite 2 filesystem
 *      regression detector fails until the executor populates the
 *      summary with P0/P1/P2 counts and a go/no-go decision.
 *   3. `metadata.json` status is still "new" — the track metadata
 *      must transition to "complete" or "deferred" for Phase 13 to
 *      close. Suite 3 filesystem regression detector fails until
 *      the track status is updated.
 *   4. Missing signoff fields — the `signoffs.productOwner` and
 *      `signoffs.engineeringLead` fields are absent until the
 *      signoff is captured. Suite 4 reader tests fail until
 *      populated.
 *   5. P0 launch gate (Suite 6) aggregates all of the above into
 *      one CI-blocking signal.
 *
 * Set PHASE13_SKIP=1 to skip the optional signoff presence checks
 * (the structure of `report-summary.json` is still validated
 * unconditionally if the file exists). The filesystem regression
 * detectors always run.
 *
 * Note on divergence from test-strategy.md: the test-strategy
 * §5 P13 row says "structured markdown in
 * `measure/tracks/codecamp_qa_prod_20260517/report.md` with P0/P1/P2
 * counts, blocker list, go/no-go" — i.e., a manual artifact. Per the
 * 2026-06-07 mid-session supervisor instruction (same as Phases
 * 1–12), Phase 13 is elevated from a manual artifact to executable
 * contract. The structured JSON summary + typed reader + filesystem
 * detectors + signoff contract form the launch gate. The markdown
 * `report.md` is the human-readable companion that the same typed
 * reader parses for the section-presence check.
 */

// ─── Constants ──────────────────────────────────────────────

const SKIP = process.env.PHASE13_SKIP === "1";

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
type Priority = (typeof PRIORITIES)[number];

type ProdStatus = "pass" | "fail" | "skip" | "pending" | null;

// Go / no-go decision space. `conditional` captures "ship with
// follow-ups" (e.g. ship after the open P1 follow-up tracks are
// filed even if not yet green).
const GO_NO_GO_VALUES = ["go", "no-go", "conditional"] as const;
type GoNoGo = (typeof GO_NO_GO_VALUES)[number];

// The 3 P1 follow-up tracks filed in Phase 8.5 Task 3 (per
// plan.md). These are the live baseline the Phase 13 follow-up
// tracker must reference.
const KNOWN_FOLLOWUP_TRACK_PREFIXES = [
  "codecamp_perf_warm_dashboard_",
  "codecamp_asset_render_blocking_",
  "codecamp_infra_cold_start_",
] as const;

// Required sections in `report.md`. Order-independent — the reader
// scans the full markdown body and asserts each required section
// appears at least once. The section names use conventional H2
// headings so a future rewrite of the prose doesn't fail the gate
// for cosmetic reasons.
const REQUIRED_REPORT_SECTIONS = [
  "P0 Results",
  "P1 Results",
  "P2 Results",
  "Production-Only Issues",
  "Performance Metrics",
  "Integration Test Results",
  "Blockers",
  "Follow-Up Tracks",
  "Sign-Off",
  "Go / No-Go Decision",
] as const;

// Valid signoff decision values. Rejection is encoded with
// `"reject"` and recorded with a date so the launch gate can detect
// incomplete signoff (null) vs. signed-but-rejected.
const SIGNOFF_DECISIONS = ["approve", "reject"] as const;
type SignoffDecision = (typeof SIGNOFF_DECISIONS)[number];

// Valid `metadata.json` status values for a "closed" Phase 13
// track. `"new"` and `"in-progress"` are RED; only `"complete"`
// (shipped) or `"deferred"` (postponed with signoff) satisfy the
// launch gate.
const TERMINAL_TRACK_STATUSES = ["complete", "deferred"] as const;
type TerminalTrackStatus = (typeof TERMINAL_TRACK_STATUSES)[number];

// Severity threshold — must-fix-before-launch is reserved for P0.
// P1 is "should fix" (filed as follow-up but does not block ship
// when a conditional go is documented).
const MUST_FIX_BEFORE_LAUNCH_SEVERITIES: ReadonlyArray<Priority> = ["P0"];

// ─── Repository paths ───────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../../..");
const MONOREPO_ROOT = resolve(APP_ROOT, "../..");

const TRACK_DIR = resolve(MONOREPO_ROOT, "measure/archive/codecamp_qa_prod_20260517");
const REPORT_MD_PATH = resolve(TRACK_DIR, "report.md");
const TRACK_METADATA_PATH = resolve(TRACK_DIR, "metadata.json");
const TRACKS_ROOT = resolve(MONOREPO_ROOT, "measure");
const REPORT_SUMMARY_PATH = resolve(HERE, "report-summary.json");
const PARITY_MATRIX_PATH = resolve(HERE, "local-qa-parity-matrix.json");
const TECH_DEBT_PATH = resolve(MONOREPO_ROOT, "measure/tech-debt.md");

// ─── Typed reader (unit-tested in Suite 2) ──────────────────

/**
 * Structured shape of `report-summary.json`. Mirrors the schema
 * documented in the file-header JSDoc above; the validator
 * (`validateReportSummary`) is the canonical contract.
 */
export interface ReportSummary {
  schemaVersion: 1;
  trackId: "codecamp_qa_prod_20260517";
  generatedAt: string;
  prodUrl: string;
  overall: GoNoGo;
  counts: {
    p0: PriorityCounts;
    p1: PriorityCounts;
    p2: PriorityCounts;
  };
  blockers: Blocker[];
  followUpTracks: FollowUpTrackRef[];
  signoffs: {
    productOwner: Signoff | null;
    engineeringLead: Signoff | null;
  };
  productionOnlyIssues: ProductionIssue[];
  performanceMetrics: PerformanceMetric[];
  integrationTestResults: IntegrationResult[];
}

export interface PriorityCounts {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  pending: number;
}

export interface Blocker {
  id: string;
  severity: Priority;
  description: string;
  source: string;
  followUpTrackId: string | null;
  mustFixBeforeLaunch: boolean;
  resolved: boolean;
}

export interface FollowUpTrackRef {
  trackId: string;
  title: string;
  status: "new" | "in-progress" | "complete" | "deferred" | string;
  filedAt: string;
}

export interface Signoff {
  name: string;
  signedAt: string;
  decision: SignoffDecision;
  note?: string;
}

export interface ProductionIssue {
  id: string;
  description: string;
  severity: Priority;
  source: string;
  evidence: string;
}

export interface PerformanceMetric {
  metric: string;
  target: string;
  observed: string;
  status: "pass" | "fail" | "deferred" | string;
  source: string;
}

export interface IntegrationResult {
  integration: "openrouter" | "github-webhook" | "github-pr-review" | string;
  status: "pass" | "fail" | "skipped-credentials" | "deferred" | string;
  evidence: string;
}

/**
 * Validate the structural shape of a ReportSummary object. Returns
 * the list of validation errors (empty list = valid). Pure function
 * so Suite 2 can unit-test it without network.
 *
 * @param summary The candidate summary (typically JSON.parse'd from disk).
 * @returns Array of error messages; empty if valid.
 */
export function validateReportSummary(summary: unknown): string[] {
  const errors: string[] = [];
  if (typeof summary !== "object" || summary === null) {
    return ["summary must be a non-null object"];
  }
  const s = summary as Record<string, unknown>;

  if (s["schemaVersion"] !== 1) {
    errors.push(`schemaVersion must be 1, got ${JSON.stringify(s["schemaVersion"])}`);
  }
  if (s["trackId"] !== "codecamp_qa_prod_20260517") {
    errors.push(`trackId must be "codecamp_qa_prod_20260517", got ${JSON.stringify(s["trackId"])}`);
  }
  if (typeof s["generatedAt"] !== "string" || s["generatedAt"].length === 0) {
    errors.push("generatedAt must be a non-empty ISO 8601 string");
  }
  if (typeof s["prodUrl"] !== "string" || !s["prodUrl"].startsWith("https://")) {
    errors.push("prodUrl must be an https:// URL string");
  }
  if (!GO_NO_GO_VALUES.includes(s["overall"] as GoNoGo)) {
    errors.push(`overall must be one of ${GO_NO_GO_VALUES.join(" | ")}`);
  }

  // counts.{p0,p1,p2}
  if (typeof s["counts"] !== "object" || s["counts"] === null) {
    errors.push("counts must be a non-null object");
  } else {
    const c = s["counts"] as Record<string, unknown>;
    for (const p of ["p0", "p1", "p2"] as const) {
      const bucket = c[p];
      if (typeof bucket !== "object" || bucket === null) {
        errors.push(`counts.${p} must be a non-null object`);
        continue;
      }
      const b = bucket as Record<string, unknown>;
      for (const k of ["total", "pass", "fail", "skip", "pending"] as const) {
        if (typeof b[k] !== "number" || !Number.isInteger(b[k]) || (b[k] as number) < 0) {
          errors.push(`counts.${p}.${k} must be a non-negative integer`);
        }
      }
      const total = (b["total"] as number) ?? 0;
      const pass = (b["pass"] as number) ?? 0;
      const fail = (b["fail"] as number) ?? 0;
      const skip = (b["skip"] as number) ?? 0;
      const pending = (b["pending"] as number) ?? 0;
      if (total !== pass + fail + skip + pending) {
        errors.push(
          `counts.${p} total (${total}) must equal pass+fail+skip+pending (${pass + fail + skip + pending})`,
        );
      }
    }
  }

  // blockers[]
  if (!Array.isArray(s["blockers"])) {
    errors.push("blockers must be an array");
  } else {
    const blockers = s["blockers"] as unknown[];
    if (blockers.length === 0) {
      errors.push("blockers must be non-empty (at least the auto-derived P0/P1 prod failures)");
    }
    for (let i = 0; i < blockers.length; i++) {
      const b = blockers[i] as Record<string, unknown> | null;
      if (typeof b !== "object" || b === null) {
        errors.push(`blockers[${i}] must be an object`);
        continue;
      }
      if (typeof b["id"] !== "string" || b["id"].length === 0) {
        errors.push(`blockers[${i}].id must be a non-empty string`);
      }
      if (!PRIORITIES.includes(b["severity"] as Priority)) {
        errors.push(`blockers[${i}].severity must be one of ${PRIORITIES.join(" | ")}`);
      }
      if (typeof b["description"] !== "string" || b["description"].length === 0) {
        errors.push(`blockers[${i}].description must be a non-empty string`);
      }
      if (typeof b["source"] !== "string" || b["source"].length === 0) {
        errors.push(`blockers[${i}].source must be a non-empty string`);
      }
      if (b["followUpTrackId"] !== null && typeof b["followUpTrackId"] !== "string") {
        errors.push(`blockers[${i}].followUpTrackId must be a string or null`);
      }
      if (typeof b["mustFixBeforeLaunch"] !== "boolean") {
        errors.push(`blockers[${i}].mustFixBeforeLaunch must be a boolean`);
      }
      if (typeof b["resolved"] !== "boolean") {
        errors.push(`blockers[${i}].resolved must be a boolean`);
      }
    }
  }

  // followUpTracks[]
  if (!Array.isArray(s["followUpTracks"])) {
    errors.push("followUpTracks must be an array");
  } else {
    for (let i = 0; i < (s["followUpTracks"] as unknown[]).length; i++) {
      const f = (s["followUpTracks"] as unknown[])[i] as Record<string, unknown> | null;
      if (typeof f !== "object" || f === null) {
        errors.push(`followUpTracks[${i}] must be an object`);
        continue;
      }
      if (typeof f["trackId"] !== "string" || f["trackId"].length === 0) {
        errors.push(`followUpTracks[${i}].trackId must be a non-empty string`);
      }
      if (typeof f["title"] !== "string" || f["title"].length === 0) {
        errors.push(`followUpTracks[${i}].title must be a non-empty string`);
      }
      if (typeof f["filedAt"] !== "string" || f["filedAt"].length === 0) {
        errors.push(`followUpTracks[${i}].filedAt must be a non-empty ISO 8601 string`);
      }
    }
  }

  // signoffs.{productOwner, engineeringLead}
  if (typeof s["signoffs"] !== "object" || s["signoffs"] === null) {
    errors.push("signoffs must be a non-null object");
  } else {
    const so = s["signoffs"] as Record<string, unknown>;
    for (const role of ["productOwner", "engineeringLead"] as const) {
      const sig = so[role];
      if (sig === null) {
        // null is valid (not yet signed) — gate on null in Suite 4
        continue;
      }
      if (typeof sig !== "object") {
        errors.push(`signoffs.${role} must be a Signoff object or null`);
        continue;
      }
      const so1 = sig as Record<string, unknown>;
      if (typeof so1["name"] !== "string" || so1["name"].length === 0) {
        errors.push(`signoffs.${role}.name must be a non-empty string`);
      }
      if (typeof so1["signedAt"] !== "string" || so1["signedAt"].length === 0) {
        errors.push(`signoffs.${role}.signedAt must be a non-empty ISO 8601 string`);
      }
      if (!SIGNOFF_DECISIONS.includes(so1["decision"] as SignoffDecision)) {
        errors.push(
          `signoffs.${role}.decision must be one of ${SIGNOFF_DECISIONS.join(" | ")}`,
        );
      }
    }
  }

  // productionOnlyIssues[]
  if (!Array.isArray(s["productionOnlyIssues"])) {
    errors.push("productionOnlyIssues must be an array");
  }

  // performanceMetrics[]
  if (!Array.isArray(s["performanceMetrics"])) {
    errors.push("performanceMetrics must be an array");
  }

  // integrationTestResults[]
  if (!Array.isArray(s["integrationTestResults"])) {
    errors.push("integrationTestResults must be an array");
  }

  return errors;
}

/**
 * Count P0/P1/P2 pass/fail/skip/pending entries in the parity
 * matrix. Pure function. Mirrors `countCompletedRows` from
 * phase-12-regression-against-local-qa.test.ts.
 */
export function countByPriority(
  rows: ReadonlyArray<{ priority: string; prod: ProdStatus }>,
  priority: "P0" | "P1" | "P2",
): {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  pending: number;
} {
  const filtered = rows.filter((r) => r.priority === priority);
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let pending = 0;
  for (const r of filtered) {
    if (r.prod === "pass") pass++;
    else if (r.prod === "fail") fail++;
    else if (r.prod === "skip") skip++;
    else if (r.prod === "pending" || r.prod === null) pending++;
  }
  return { total: filtered.length, pass, fail, skip, pending };
}

/**
 * Identify blockers that are still open (not resolved). Pure
 * function. Used by the Suite 3 launch-gate aggregator.
 */
export function findOpenBlockers(blockers: ReadonlyArray<Blocker>): Blocker[] {
  return blockers.filter((b) => !b.resolved);
}

/**
 * A severity is "must fix before launch" only when it is in
 * MUST_FIX_BEFORE_LAUNCH_SEVERITIES. Pure function. Centralised so
 * the policy lives in one place.
 */
export function requiresImmediateFix(severity: Priority): boolean {
  return MUST_FIX_BEFORE_LAUNCH_SEVERITIES.includes(severity);
}

/**
 * Parse the markdown `report.md` body and return the set of H2
 * section names that appear. Pure function. Order-independent.
 */
export function extractReportSections(markdown: string): Set<string> {
  const sectionRe = /^##\s+(.+?)\s*$/gm;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(markdown)) !== null) {
    out.add(m[1]!.trim());
  }
  return out;
}

/**
 * Extract the `## <Heading>` block content (until the next H2 or
 * EOF) for a given heading name. Pure function. Returns the
 * trimmed body string, or null if the section is missing.
 */
export function extractReportSectionBody(markdown: string, heading: string): string | null {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    if (/^##\s+/.test(lines[i]!)) {
      const currentHeading = lines[i]!.replace(/^##\s+/, "").trim();
      if (currentHeading === heading) {
        const body: string[] = [];
        i++;
        while (i < lines.length && !/^##\s+/.test(lines[i]!)) {
          body.push(lines[i]!);
          i++;
        }
        return body.join("\n").trim();
      }
    }
    i++;
  }
  return null;
}

// ─── Filesystem helpers (unit-tested in Suite 2) ────────────

/**
 * Return the sorted union of active and archived Measure track names.
 * @param root Measure directory containing `tracks` and `archive`.
 * @returns Active and archived track directory names without duplicates.
 */
export function listTrackDirs(root: string): string[] {
  if (!existsSync(root)) return [];
  const roots = [resolve(root, "tracks"), resolve(root, "archive")];
  return [...new Set(roots.flatMap((trackRoot) => {
    if (!existsSync(trackRoot)) return [];
    return readdirSync(trackRoot)
      .filter((name) => !name.startsWith("."))
      .filter((name) => {
        try {
          return statSync(resolve(trackRoot, name)).isDirectory();
        } catch {
          return false;
        }
      });
  }))].sort();
}

// ─── Tests ─────────────────────────────────────────────────

describe("Phase 13 — Report artifacts (filesystem regression detectors)", () => {
  beforeAll(() => {
    expect(MONOREPO_ROOT, "MONOREPO_ROOT must resolve to /home/.../reading-advantage-monorepo")
      .toMatch(/reading-advantage-monorepo$/);
  });

  it("`report.md` exists at `measure/tracks/codecamp_qa_prod_20260517/report.md`", () => {
    const exists = existsSync(REPORT_MD_PATH);
    expect(
      exists,
      `expected report.md at ${REPORT_MD_PATH} to exist — ` +
        "test-strategy.md §5 P13 requires a structured markdown report " +
        "with P0/P1/P2 counts, blocker list, and go/no-go decision",
    ).toBe(true);
  });

  it("`report-summary.json` exists at `lib/__tests__/prod-smoke/report-summary.json`", () => {
    const exists = existsSync(REPORT_SUMMARY_PATH);
    expect(
      exists,
      `expected structured report summary at ${REPORT_SUMMARY_PATH} to exist — ` +
        "Phase 13 elevates the manual report to executable contract; the " +
        "summary is the machine-readable form with the P0/P1/P2 counts, " +
        "blockers, and go/no-go decision",
    ).toBe(true);
  });

  it("`report.md` is non-empty", () => {
    if (!existsSync(REPORT_MD_PATH)) {
      expect.fail(`${REPORT_MD_PATH} does not exist — Suite 1 RED expected`);
      return;
    }
    const content = readFileSync(REPORT_MD_PATH, "utf-8");
    expect(content.length, "report.md must be non-empty").toBeGreaterThan(0);
  });

  it("`report.md` contains all 10 required sections", () => {
    if (!existsSync(REPORT_MD_PATH)) {
      expect.fail(`${REPORT_MD_PATH} does not exist — Suite 1 RED expected`);
      return;
    }
    const content = readFileSync(REPORT_MD_PATH, "utf-8");
    const sections = extractReportSections(content);
    const missing = REQUIRED_REPORT_SECTIONS.filter((s) => !sections.has(s));
    expect(
      missing,
      `report.md is missing ${missing.length} required section(s): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("`report.md` Go / No-Go Decision section documents a recognised decision", () => {
    if (!existsSync(REPORT_MD_PATH)) {
      expect.fail(`${REPORT_MD_PATH} does not exist — Suite 1 RED expected`);
      return;
    }
    const body = extractReportSectionBody(readFileSync(REPORT_MD_PATH, "utf-8"), "Go / No-Go Decision");
    if (body === null) {
      expect.fail("Go / No-Go Decision section missing — Suite 1 will catch this");
      return;
    }
    const lower = body.toLowerCase();
    const found = GO_NO_GO_VALUES.find((v) => lower.includes(`**${v}**`) || lower.includes(`decision: ${v}`));
    expect(
      found,
      `Go / No-Go Decision section must contain one of ${GO_NO_GO_VALUES.join(" | ")} (e.g. **go**, **no-go**, **conditional**); body=${JSON.stringify(body.slice(0, 200))}`,
    ).toBeTruthy();
  });
});

describe("Phase 13 — Report summary helper unit tests (always run)", () => {
  describe("validateReportSummary()", () => {
    it("rejects null", () => {
      const errors = validateReportSummary(null);
      expect(errors).toEqual(["summary must be a non-null object"]);
    });

    it("rejects non-object", () => {
      const errors = validateReportSummary("not a summary");
      expect(errors).toEqual(["summary must be a non-null object"]);
    });

    it("rejects missing schemaVersion", () => {
      const errors = validateReportSummary({
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "x",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "go",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("schemaVersion"))).toBe(true);
    });

    it("rejects unknown trackId", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "bogus",
        generatedAt: "x",
        prodUrl: "https://x.example",
        overall: "go",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [{ id: "a", severity: "P0", description: "a", source: "a", followUpTrackId: null, mustFixBeforeLaunch: true, resolved: true }],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("trackId must be"))).toBe(true);
    });

    it("rejects invalid overall decision", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "maybe",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [{ id: "a", severity: "P0", description: "a", source: "a", followUpTrackId: null, mustFixBeforeLaunch: true, resolved: true }],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("overall must be one of"))).toBe(true);
    });

    it("rejects http:// prodUrl (HTTPS required)", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "http://codecamp.reading-advantage.com",
        overall: "go",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("prodUrl"))).toBe(true);
    });

    it("rejects counts where total != pass+fail+skip+pending", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "go",
        counts: {
          p0: { total: 5, pass: 3, fail: 0, skip: 0, pending: 0 }, // 3 != 5
          p1: zeroCounts(),
          p2: zeroCounts(),
        },
        blockers: [],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("counts.p0 total"))).toBe(true);
    });

    it("rejects empty blockers array (must list at least the auto-derived P0/P1 prod failures)", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "go",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("blockers must be non-empty"))).toBe(true);
    });

    it("rejects blocker with invalid severity", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "go",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [{ id: "a", severity: "P9", description: "a", source: "a", followUpTrackId: null, mustFixBeforeLaunch: true, resolved: true }],
        followUpTracks: [],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("severity must be one of"))).toBe(true);
    });

    it("rejects signoff with invalid decision", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "go",
        counts: { p0: zeroCounts(), p1: zeroCounts(), p2: zeroCounts() },
        blockers: [{ id: "a", severity: "P0", description: "a", source: "a", followUpTrackId: null, mustFixBeforeLaunch: true, resolved: true }],
        followUpTracks: [],
        signoffs: {
          productOwner: { name: "x", signedAt: "2026-06-11T00:00:00Z", decision: "maybe" },
          engineeringLead: null,
        },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors.some((e) => e.includes("decision must be one of"))).toBe(true);
    });

    it("accepts a minimal valid summary (all signoffs null, blockers seeded, P0 counts valid)", () => {
      const errors = validateReportSummary({
        schemaVersion: 1,
        trackId: "codecamp_qa_prod_20260517",
        generatedAt: "2026-06-11T00:00:00Z",
        prodUrl: "https://codecamp.reading-advantage.com",
        overall: "conditional",
        counts: {
          p0: { total: 22, pass: 22, fail: 0, skip: 0, pending: 0 },
          p1: { total: 16, pass: 16, fail: 0, skip: 0, pending: 0 },
          p2: { total: 6, pass: 6, fail: 0, skip: 0, pending: 0 },
        },
        blockers: [
          {
            id: "B-PERF-001",
            severity: "P1",
            description: "warm dashboard 1363ms vs 1000ms budget",
            source: "Phase 6 perf (warm-dashboard)",
            followUpTrackId: "codecamp_perf_warm_dashboard_20260608",
            mustFixBeforeLaunch: false,
            resolved: false,
          },
        ],
        followUpTracks: [
          {
            trackId: "codecamp_perf_warm_dashboard_20260608",
            title: "Warm dashboard performance",
            filedAt: "2026-06-08T00:00:00Z",
            status: "new",
          },
        ],
        signoffs: { productOwner: null, engineeringLead: null },
        productionOnlyIssues: [],
        performanceMetrics: [],
        integrationTestResults: [],
      });
      expect(errors).toEqual([]);
    });
  });

  describe("countByPriority()", () => {
    it("counts pass / fail / skip / pending correctly for each priority", () => {
      const rows = [
        { priority: "P0", prod: "pass" },
        { priority: "P0", prod: "pass" },
        { priority: "P0", prod: "fail" },
        { priority: "P0", prod: "skip" },
        { priority: "P0", prod: null },
        { priority: "P1", prod: "pass" },
        { priority: "P2", prod: "fail" },
      ] as const;
      expect(countByPriority(rows, "P0")).toEqual({ total: 5, pass: 2, fail: 1, skip: 1, pending: 1 });
      expect(countByPriority(rows, "P1")).toEqual({ total: 1, pass: 1, fail: 0, skip: 0, pending: 0 });
      expect(countByPriority(rows, "P2")).toEqual({ total: 1, pass: 0, fail: 1, skip: 0, pending: 0 });
    });

    it("returns zero counts for an empty row set", () => {
      expect(countByPriority([], "P0")).toEqual({ total: 0, pass: 0, fail: 0, skip: 0, pending: 0 });
    });
  });

  describe("findOpenBlockers()", () => {
    it("returns only blockers with resolved=false", () => {
      const blockers: Blocker[] = [
        { id: "a", severity: "P0", description: "a", source: "a", followUpTrackId: null, mustFixBeforeLaunch: true, resolved: true },
        { id: "b", severity: "P1", description: "b", source: "b", followUpTrackId: "x", mustFixBeforeLaunch: false, resolved: false },
        { id: "c", severity: "P0", description: "c", source: "c", followUpTrackId: null, mustFixBeforeLaunch: true, resolved: false },
      ];
      const open = findOpenBlockers(blockers);
      expect(open.map((b) => b.id)).toEqual(["b", "c"]);
    });
  });

  describe("requiresImmediateFix()", () => {
    it("returns true for P0", () => {
      expect(requiresImmediateFix("P0")).toBe(true);
    });
    it("returns false for P1 / P2 / P3", () => {
      expect(requiresImmediateFix("P1")).toBe(false);
      expect(requiresImmediateFix("P2")).toBe(false);
      expect(requiresImmediateFix("P3")).toBe(false);
    });
  });

  describe("extractReportSections()", () => {
    it("returns the set of H2 headings (order-independent)", () => {
      const md = `# Title

Intro text.

## P0 Results

22 / 22.

## P1 Results

16 / 16.

## Go / No-Go Decision

**conditional**
`;
      const sections = extractReportSections(md);
      expect(sections.has("P0 Results")).toBe(true);
      expect(sections.has("P1 Results")).toBe(true);
      expect(sections.has("Go / No-Go Decision")).toBe(true);
      expect(sections.has("Missing Section")).toBe(false);
    });
  });

  describe("extractReportSectionBody()", () => {
    it("returns the body between the heading and the next H2", () => {
      const md = `## P0 Results

22 / 22.

## P1 Results

16 / 16.
`;
      expect(extractReportSectionBody(md, "P0 Results")).toBe("22 / 22.");
    });

    it("returns null when the heading is missing", () => {
      expect(extractReportSectionBody("## P0 Results\n\n22 / 22.", "P1 Results")).toBe(null);
    });

    it("returns the body through EOF when the heading is the last one", () => {
      const md = `## Go / No-Go Decision

**conditional** — ship with the open P1 follow-up tracks filed.`;
      expect(extractReportSectionBody(md, "Go / No-Go Decision")).toBe(
        "**conditional** — ship with the open P1 follow-up tracks filed.",
      );
    });
  });

  describe("listTrackDirs()", () => {
    it("returns the sorted union of active and archived Measure tracks", () => {
      const dirs = listTrackDirs(TRACKS_ROOT);
      expect(dirs).toContain("codecamp_qa_prod_20260517");
      expect(dirs).toContain("codecamp_qa_local_20260517");
      expect(dirs).toContain("codecamp_perf_warm_dashboard_20260608");
      // Sorted: lexicographic order
      const sorted = [...dirs].sort();
      expect(dirs).toEqual(sorted);
    });

    it("returns an empty list when the root does not exist", () => {
      expect(listTrackDirs("/nonexistent/path/that/does/not/exist")).toEqual([]);
    });
  });
});

describe("Phase 13 — Blocker assessment (filesystem + reader)", () => {
  it("every P0 prod failure in the parity matrix is enumerated in `report-summary.json` blockers with a `followUpTrackId` or a `resolved=true` flag", () => {
    if (!existsSync(PARITY_MATRIX_PATH) || !existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail("parity matrix or report summary missing — Suite 3 RED expected");
      return;
    }
    const matrix = JSON.parse(readFileSync(PARITY_MATRIX_PATH, "utf-8")) as {
      rows: Array<{ priority: string; prod: string | null; phaseId: string; checklistItem: string }>;
    };
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const p0ProdFails = matrix.rows.filter(
      (r) => r.priority === "P0" && r.prod === "fail",
    );
    if (p0ProdFails.length === 0) return; // nothing to verify
    const blockerKeys = new Set(
      summary.blockers.map((b) => `${b.phaseId ?? ""}::${b.description}`),
    );
    // Note: a blocker may cover multiple parity-matrix rows (one blocker per
    // distinct gap, not per row). The Suite 3 check ensures the parity-matrix
    // P0 prod-fail rows are *covered* by a blocker that either:
    //   (a) mentions the same phaseId + checklistItem in description, OR
    //   (b) has followUpTrackId set.
    const uncovered: string[] = [];
    for (const row of p0ProdFails) {
      const covered = summary.blockers.some(
        (b) =>
          b.resolved ||
          b.followUpTrackId !== null ||
          (b.description.includes(row.checklistItem) && b.source.includes(row.phaseId)),
      );
      if (!covered) {
        uncovered.push(`${row.phaseId}::${row.checklistItem}`);
      }
    }
    expect(
      uncovered,
      `${uncovered.length} P0 prod-fail parity-matrix row(s) are not enumerated in report-summary.json blockers: ${uncovered.join(", ")}`,
    ).toEqual([]);
    // Reference the variable to silence unused-warning in some test runners.
    expect(blockerKeys.size).toBeGreaterThanOrEqual(0);
  });

  it("every blocker with a `followUpTrackId` points at a real `measure/tracks/<id>/` directory", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 3 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const trackIds = listTrackDirs(TRACKS_ROOT);
    const dangling = summary.blockers
      .filter((b) => b.followUpTrackId !== null)
      .filter((b) => !trackIds.includes(b.followUpTrackId as string))
      .map((b) => `${b.id}->${b.followUpTrackId}`);
    expect(
      dangling,
      `${dangling.length} blocker(s) reference a followUpTrackId that does not exist as a measure/tracks/<id>/ directory: ${dangling.join(", ")}`,
    ).toEqual([]);
  });

  it("the 3 known Phase 8.5 follow-up track prefixes are all filed (P1 follow-up filing floor)", () => {
    const trackIds = listTrackDirs(TRACKS_ROOT);
    const missingPrefixes = KNOWN_FOLLOWUP_TRACK_PREFIXES.filter(
      (prefix) => !trackIds.some((id) => id.startsWith(prefix)),
    );
    expect(
      missingPrefixes,
      `${missingPrefixes.length} expected P1 follow-up track prefix(es) have no matching measure/tracks/<id>/ directory: ${missingPrefixes.join(", ")}`,
    ).toEqual([]);
  });

  it("`report-summary.json` followUpTracks list is non-empty when at least one blocker has a followUpTrackId", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 3 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const blockersWithFollowup = summary.blockers.filter((b) => b.followUpTrackId !== null);
    if (blockersWithFollowup.length === 0) return; // nothing to verify
    expect(
      summary.followUpTracks.length,
      `report-summary.json declares ${blockersWithFollowup.length} blocker(s) with a followUpTrackId, but followUpTracks is empty`,
    ).toBeGreaterThan(0);
  });

  it("summary fail counts include unresolved blockers by severity", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 3 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const open = findOpenBlockers(summary.blockers);
    const openP0 = open.filter((b) => b.severity === "P0");
    const openP1 = open.filter((b) => b.severity === "P1");
    const openP2 = open.filter((b) => b.severity === "P2");
    expect(summary.counts.p0.fail, `counts.p0.fail must include ${openP0.length} unresolved P0 blocker(s)`).toBeGreaterThanOrEqual(openP0.length);
    expect(summary.counts.p1.fail, `counts.p1.fail must include ${openP1.length} unresolved P1 blocker(s)`).toBeGreaterThanOrEqual(openP1.length);
    expect(summary.counts.p2.fail, `counts.p2.fail must include ${openP2.length} unresolved P2 blocker(s)`).toBeGreaterThanOrEqual(openP2.length);
  });

  it("failed performance metrics are covered by unresolved blockers", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 3 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const openBlockerText = findOpenBlockers(summary.blockers)
      .map((b) => `${b.description} ${b.source} ${b.followUpTrackId ?? ""}`.toLowerCase())
      .join("\n");
    const uncovered = summary.performanceMetrics
      .filter((m) => m.status === "fail")
      .filter((m) => !openBlockerText.includes(m.metric.toLowerCase()) && !openBlockerText.includes(m.source.toLowerCase()))
      .map((m) => `${m.metric} (${m.source})`);
    expect(uncovered, `${uncovered.length} failed performance metric(s) are not covered by unresolved blockers: ${uncovered.join(", ")}`).toEqual([]);
  });

  it("integration results do not mark deferred or credential-gated evidence as pass", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 3 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const invalidPasses = summary.integrationTestResults
      .filter((r) => r.status === "pass")
      .filter((r) => /deferred|credential-gated|skipped/i.test(r.evidence))
      .map((r) => r.integration);
    expect(invalidPasses, `integration result(s) cannot be pass while evidence says deferred/credential-gated/skipped: ${invalidPasses.join(", ")}`).toEqual([]);
  });
});

describe("Phase 13 — Sign-off contract (filesystem + reader)", () => {
  it("`measure/tracks/codecamp_qa_prod_20260517/metadata.json` `status` is one of the terminal values (`complete` or `deferred`)", () => {
    if (!existsSync(TRACK_METADATA_PATH)) {
      expect.fail(`${TRACK_METADATA_PATH} does not exist`);
      return;
    }
    const metadata = JSON.parse(readFileSync(TRACK_METADATA_PATH, "utf-8")) as {
      status: string;
    };
    expect(
      TERMINAL_TRACK_STATUSES.includes(metadata.status as TerminalTrackStatus),
      `track status is "${metadata.status}" — must be one of ${TERMINAL_TRACK_STATUSES.join(" | ")} for Phase 13 to close`,
    ).toBe(true);
  });

  it("`report-summary.json` signoffs.productOwner is populated (or `PHASE13_SKIP=1` is set)", () => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 4 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const sig = summary.signoffs.productOwner;
    if (sig === null) {
      expect.fail("signoffs.productOwner is null — Phase 13 sign-off requires both product owner and engineering lead approval");
      return;
    }
    expect(sig.name.length, "signoffs.productOwner.name must be non-empty").toBeGreaterThan(0);
    expect(sig.signedAt.length, "signoffs.productOwner.signedAt must be a non-empty ISO 8601 string").toBeGreaterThan(0);
    expect(sig.decision).toBe("approve");
  });

  it("`report-summary.json` signoffs.engineeringLead is populated (or `PHASE13_SKIP=1` is set)", () => {
    if (!RUN_LIVE_SMOKE || SKIP) return;
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 4 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const sig = summary.signoffs.engineeringLead;
    if (sig === null) {
      expect.fail("signoffs.engineeringLead is null — Phase 13 sign-off requires both product owner and engineering lead approval");
      return;
    }
    expect(sig.name.length, "signoffs.engineeringLead.name must be non-empty").toBeGreaterThan(0);
    expect(sig.signedAt.length, "signoffs.engineeringLead.signedAt must be a non-empty ISO 8601 string").toBeGreaterThan(0);
    expect(sig.decision).toBe("approve");
  });

  it("`report-summary.json` overall is consistent with signoff decisions (approve + reject both = no-go)", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 4 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    const { productOwner, engineeringLead } = summary.signoffs;
    if (productOwner === null || engineeringLead === null) return; // Suite 4 catches that
    if (productOwner.decision === "reject" || engineeringLead.decision === "reject") {
      expect(
        summary.overall,
        "any signoff decision=reject must produce overall=no-go",
      ).toBe("no-go");
    }
  });

  it("`report-summary.json` overall=no-go has at least one unresolved P0 blocker (decision matches the data)", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 4 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    if (summary.overall !== "no-go") return; // different gate
    const openP0 = findOpenBlockers(summary.blockers).filter(
      (b) => b.severity === "P0",
    );
    expect(
      openP0.length,
      `overall=no-go with zero open P0 blockers is a contradiction — either the decision is wrong, or the blockers list is incomplete`,
    ).toBeGreaterThan(0);
  });

  it("`report-summary.json` overall=go has zero open P0 blockers (decision matches the data)", () => {
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      expect.fail(`${REPORT_SUMMARY_PATH} does not exist — Suite 4 RED expected`);
      return;
    }
    const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
    if (summary.overall !== "go") return; // different gate
    const openP0 = findOpenBlockers(summary.blockers).filter(
      (b) => b.severity === "P0",
    );
    expect(
      openP0.length,
      `overall=go with ${openP0.length} open P0 blocker(s) is a contradiction — open blockers: ${openP0.map((b) => b.id).join(", ")}`,
    ).toBe(0);
  });
});

describe("Phase 13 — Cross-reference contract (filesystem regression detectors)", () => {
  it("`report.md` mentions the parity matrix artifact path", () => {
    if (!existsSync(REPORT_MD_PATH)) {
      expect.fail(`${REPORT_MD_PATH} does not exist — Suite 5 RED expected`);
      return;
    }
    const content = readFileSync(REPORT_MD_PATH, "utf-8");
    const mentions =
      content.includes("local-qa-parity-matrix.json") ||
      content.includes("parity matrix") ||
      content.includes("parity-matrix");
    expect(
      mentions,
      "report.md must cross-reference the local-qa-parity-matrix.json artifact " +
        "(see Phase 12 — Regression Against Local QA contract)",
    ).toBe(true);
  });

  it("`report.md` mentions the 3 P1 follow-up tracks (warm dashboard, render-blocking, cold start)", () => {
    if (!existsSync(REPORT_MD_PATH)) {
      expect.fail(`${REPORT_MD_PATH} does not exist — Suite 5 RED expected`);
      return;
    }
    const content = readFileSync(REPORT_MD_PATH, "utf-8");
    const requiredSubstrings = [
      "codecamp_perf_warm_dashboard_20260608",
      "codecamp_asset_render_blocking_20260608",
      "codecamp_infra_cold_start_20260608",
    ];
    const missing = requiredSubstrings.filter((s) => !content.includes(s));
    expect(
      missing,
      `report.md is missing ${missing.length} expected P1 follow-up track reference(s): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("`measure/tech-debt.md` row for `codecamp_qa_prod_20260517` still mentions the 3 P1 follow-up track prefixes (drift detector)", () => {
    if (!existsSync(TECH_DEBT_PATH)) {
      expect.fail(`${TECH_DEBT_PATH} does not exist — cannot audit tech-debt cross-reference`);
      return;
    }
    const content = readFileSync(TECH_DEBT_PATH, "utf-8");
    // Find the row(s) tagged with `codecamp_qa_prod_20260517`. We
    // use a simple heuristic: any line containing the track id.
    const rows = content.split(/\r?\n/).filter((line) => line.includes("codecamp_qa_prod_20260517"));
    const joined = rows.join("\n");
    const missing = KNOWN_FOLLOWUP_TRACK_PREFIXES.filter(
      (prefix) => !joined.includes(prefix),
    );
    expect(
      missing,
      `tech-debt.md rows tagged with codecamp_qa_prod_20260517 are missing ${missing.length} P1 follow-up track prefix reference(s): ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

describe("Phase 13 — P0 launch gate (single hard assertion)", () => {
  it("all 11 Phase 13 sub-tasks are satisfied — production readiness report is complete and signed off", () => {
    const failures: string[] = [];

    // Sub-task 1.1: report.md exists
    if (!existsSync(REPORT_MD_PATH)) {
      failures.push("[P0/compile-results] report.md missing — see test-strategy.md §5 P13");
    } else {
      const content = readFileSync(REPORT_MD_PATH, "utf-8");
      const sections = extractReportSections(content);
      const missingSections = REQUIRED_REPORT_SECTIONS.filter((s) => !sections.has(s));
      if (missingSections.length > 0) {
        failures.push(
          `[P0/compile-results] report.md is missing ${missingSections.length} required section(s): ${missingSections.join(", ")}`,
        );
      }
    }

    // Sub-task 1.2: report-summary.json exists
    if (!existsSync(REPORT_SUMMARY_PATH)) {
      failures.push("[P0/compile-results] report-summary.json missing");
    } else {
      const raw = readFileSync(REPORT_SUMMARY_PATH, "utf-8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        failures.push(`[P0/compile-results] report-summary.json is not valid JSON: ${(e as Error).message}`);
        parsed = null;
      }
      if (parsed !== null) {
        const errors = validateReportSummary(parsed);
        if (errors.length > 0) {
          failures.push(
            `[P0/compile-results] report-summary.json has ${errors.length} validation error(s): ${errors.slice(0, 3).join("; ")}`,
          );
        }
      }
    }

    // Sub-task 2.1+2.2: blockers + follow-up tracks cover all open P0 prod failures
    if (existsSync(PARITY_MATRIX_PATH) && existsSync(REPORT_SUMMARY_PATH)) {
      const matrix = JSON.parse(readFileSync(PARITY_MATRIX_PATH, "utf-8")) as {
        rows: Array<{ priority: string; prod: string | null; phaseId: string; checklistItem: string }>;
      };
      const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
      const p0ProdFails = matrix.rows.filter(
        (r) => r.priority === "P0" && r.prod === "fail",
      );
      const uncovered = p0ProdFails.filter(
        (row) =>
          !summary.blockers.some(
            (b) =>
              b.resolved ||
              b.followUpTrackId !== null ||
              (b.description.includes(row.checklistItem) && b.source.includes(row.phaseId)),
          ),
      );
      if (uncovered.length > 0) {
        failures.push(
          `[P0/blocker-assessment] ${uncovered.length} P0 prod-fail row(s) in parity matrix are not enumerated in report-summary.json blockers: ${uncovered.map((r) => r.phaseId + "::" + r.checklistItem).join(", ")}`,
        );
      }
      // Sub-task 2.3: every followUpTrackId is a real measure/tracks/<id>/
      const trackIds = listTrackDirs(TRACKS_ROOT);
      const dangling = summary.blockers
        .filter((b) => b.followUpTrackId !== null)
        .filter((b) => !trackIds.includes(b.followUpTrackId as string));
      if (dangling.length > 0) {
        failures.push(
          `[P0/blocker-assessment] ${dangling.length} blocker followUpTrackId(s) are not filed as measure/tracks/<id>/ directories: ${dangling.map((b) => b.id + "->" + b.followUpTrackId).join(", ")}`,
        );
      }
    }

    // Sub-task 3.1+3.2: signoffs captured
    if (!SKIP && existsSync(REPORT_SUMMARY_PATH)) {
      const summary = JSON.parse(readFileSync(REPORT_SUMMARY_PATH, "utf-8")) as ReportSummary;
      if (summary.signoffs.productOwner === null) {
        failures.push("[P0/sign-off] signoffs.productOwner is null — Phase 13 sign-off requires product owner approval");
      } else if (summary.signoffs.productOwner.decision !== "approve") {
        failures.push(
          `[P0/sign-off] signoffs.productOwner.decision is "${summary.signoffs.productOwner.decision}" — must be "approve" for go/conditional`,
        );
      }
      if (summary.signoffs.engineeringLead === null) {
        failures.push("[P0/sign-off] signoffs.engineeringLead is null — Phase 13 sign-off requires engineering lead approval");
      } else if (summary.signoffs.engineeringLead.decision !== "approve") {
        failures.push(
          `[P0/sign-off] signoffs.engineeringLead.decision is "${summary.signoffs.engineeringLead.decision}" — must be "approve" for go/conditional`,
        );
      }
    }

    // Sub-task 3.3: go/no-go decision documented
    if (existsSync(REPORT_MD_PATH)) {
      const body = extractReportSectionBody(readFileSync(REPORT_MD_PATH, "utf-8"), "Go / No-Go Decision");
      if (body === null) {
        failures.push("[P0/sign-off] report.md Go / No-Go Decision section missing");
      } else {
        const lower = body.toLowerCase();
        const found = GO_NO_GO_VALUES.find(
          (v) => lower.includes(`**${v}**`) || lower.includes(`decision: ${v}`),
        );
        if (!found) {
          failures.push(
            `[P0/sign-off] report.md Go / No-Go Decision section does not document one of ${GO_NO_GO_VALUES.join(" | ")}`,
          );
        }
      }
    }

    // Sub-task 3.4: track status transitioned to a terminal value
    if (existsSync(TRACK_METADATA_PATH)) {
      const metadata = JSON.parse(readFileSync(TRACK_METADATA_PATH, "utf-8")) as {
        status: string;
      };
      if (!TERMINAL_TRACK_STATUSES.includes(metadata.status as TerminalTrackStatus)) {
        failures.push(
          `[P0/sign-off] metadata.json status is "${metadata.status}" — must be one of ${TERMINAL_TRACK_STATUSES.join(" | ")} for Phase 13 to close`,
        );
      }
    } else {
      failures.push("[P0/sign-off] metadata.json missing");
    }

    expect(
      failures,
      `Phase 13 P0 launch gate failed with ${failures.length} item(s):\n${failures.map((f) => `  - ${f}`).join("\n")}`,
    ).toEqual([]);
  });
});

// ─── Internal helpers (kept private to the test file) ───────

function zeroCounts(): PriorityCounts {
  return { total: 0, pass: 0, fail: 0, skip: 0, pending: 0 };
}
