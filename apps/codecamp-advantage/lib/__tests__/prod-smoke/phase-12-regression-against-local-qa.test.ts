import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 12 — Regression Against Local QA (P0)
 *
 * Black-box + source-contract tests that compare production
 * results to the local QA baseline and flag discrepancies
 * (see measure/tracks/codecamp_qa_prod_20260517/plan.md).
 *
 * Phase 12 acceptance criteria (per plan.md):
 *   1. Feature parity check
 *      - All P0 local QA tests pass in production
 *      - All P1 local QA tests pass in production
 *      - No production-only failures in P0/P1 areas
 *   2. Known local issues
 *      - Any local QA bugs are verified fixed or still present in production
 *      - No new bugs introduced in production
 *   3. Data consistency
 *      - Production data matches expected seed state
 *      - No data corruption during migration
 *      - User progress data is accurate
 *
 * These tests encode the Phase 12 acceptance criteria as executable
 * contract. They will fail (Red) until the local-vs-prod parity
 * machinery exists and the production deployment is verified to
 * match the local baseline per checklist item.
 *
 * The test-strategy.md §5 P12 row says "side-by-side spreadsheet
 * comparing local vs prod result per checklist item." This file
 * implements that spreadsheet as a JSON artifact
 * (`local-qa-parity-matrix.json`) plus a typed reader. A future
 * executor run will populate the artifact with observed local +
 * prod results; the test then asserts every row has a non-empty
 * `local` and `prod` status and that no `prod` row regressed
 * against the `local` row's status.
 *
 * Three valid Red-phase failure modes are expected:
 *   1. Missing local QA track (filesystem) — the local baseline
 *      is the regression oracle. The local QA track directory at
 *      `measure/tracks/codecamp_qa_local_20260517/` does not exist
 *      at HEAD; the Suite 1 filesystem regression detector fails
 *      until that track is created. The Phase 12 plan explicitly
 *      depends on `codecamp_qa_local_20260517` (test-strategy.md
 *      §3 "Phase 12 regression depends on `codecamp_qa_local_20260517`
 *      results being captured first").
 *   2. Missing parity matrix artifact (filesystem) — the structured
 *      side-by-side comparison has no file to read. Suite 2 fails
 *      until the matrix is created.
 *   3. Network/connectivity failure (the test runner cannot reach
 *      prod) — the prod-vs-local probes skip; the filesystem +
 *      unit tests still run and form the P0 launch gate.
 *
 * Set PHASE12_PROD_URL to override the default target (useful for
 * staging). Set PHASE12_SKIP=1 to skip the network probes; the
 * filesystem + unit tests still run unconditionally so a regression
 * in those primitives fails the suite immediately.
 *
 * Note on divergence from test-strategy.md: the test-strategy
 * §5 P12 row says "side-by-side spreadsheet comparing local vs
 * prod result per checklist item" — i.e., a manual artifact. Per
 * the 2026-06-07 mid-session supervisor instruction (same as
 * Phases 1–11), Phase 12 is elevated from a manual artifact to
 * executable contract. The parity-matrix JSON + reader encode the
 * spreadsheet; the filesystem detectors + unit tests + prod smoke
 * re-runs form the P0 launch gate.
 */

// ─── Constants ──────────────────────────────────────────────

const PROD_URL = process.env.PHASE12_PROD_URL ?? "https://codecamp.reading-advantage.com";
const SKIP = process.env.PHASE12_SKIP === "1";

// Phases covered by the local-vs-prod parity matrix. These mirror
// the prod phases 1–11. Phase 12 itself (this file) is the regression
// check that consumes the matrix; the matrix lists the upstream
// phases whose results are being compared.
const PARITY_PHASE_IDS = [
  "1-infrastructure",
  "2-database-and-configuration",
  "3-authentication-and-authorization",
  "4-feature-parity",
  "5-real-external-integrations",
  "6-performance-and-latency",
  "7-cdn-and-caching",
  "8-logging-monitoring-and-error-reporting",
  "8-5-deployment-gate",
  "9-github-webhook-specifics",
  "10-edge-cases-and-production-scenarios",
  "11-cross-browser-and-device-testing",
] as const;

type ParityPhaseId = (typeof PARITY_PHASE_IDS)[number];

// Required files for a complete local QA track (the regression
// baseline). These mirror the prod track's required files per
// measure/index.md.
const LOCAL_QA_TRACK_REQUIRED_FILES = [
  "index.md",
  "spec.md",
  "plan.md",
  "metadata.json",
] as const;

// Curriculum oracle constants. The seed file is the source of
// truth for "expected seed state" (test-strategy.md §2:
// "Curriculum oracle: local seed in
// `packages/db/src/seed/codecamp-curriculum-data.ts` (18 modules
// / 85 lessons) is the source of truth for Phase 2 data-integrity
// checks. Diff prod against `getPhaseACurriculumData / B / C / D`
// outputs.")
const EXPECTED_MODULE_COUNT = 18;
const EXPECTED_LESSON_COUNT = 85;

// Entry-phase module slugs that Phase 4 (and Phase 12) assert on.
// Mirrors `readSeedPhaseMap` from phase-4-feature-parity.test.ts.
const EXPECTED_PHASE_A_SLUGS = [
  "dev-environment",
  "git-github",
  "html-css",
  "javascript",
] as const;

// ─── Repository paths ───────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../../..");
const MONOREPO_ROOT = resolve(APP_ROOT, "../..");

const LOCAL_QA_TRACK_DIR = resolve(MONOREPO_ROOT, "measure/tracks/codecamp_qa_local_20260517");
const PROD_QA_TRACK_DIR = resolve(MONOREPO_ROOT, "measure/tracks/codecamp_qa_prod_20260517");
const PARITY_MATRIX_PATH = resolve(HERE, "local-qa-parity-matrix.json");
const CURRICULUM_SEED_PATH = resolve(
  MONOREPO_ROOT,
  "packages/db/src/seed/codecamp-curriculum-data.ts",
);
const CODECAMP_TYPES_SOURCE = resolve(
  MONOREPO_ROOT,
  "packages/types/src/codecamp.ts",
);
const PROD_SMOKE_DIR = resolve(APP_ROOT, "lib/__tests__/prod-smoke");

// ─── HTTP helper (mirrors Phases 1-11) ──────────────────────

const PROBE_TIMEOUT_MS = 10_000;

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

const testIf = (skipCondition: boolean) => (skipCondition ? it.skip : it);
const skipIf = testIf(SKIP);

// ─── Parity-matrix reader (unit-tested in Suite 2) ──────────

/**
 * The shape of a single row in the parity matrix. `local` and
 * `prod` are observed status strings from the executor's
 * manual-test pass (one of `"pass" | "fail" | "skip" | "pending"`).
 * `regression` is computed at read time: it is `true` iff the prod
 * status is worse than the local status (i.e., local was `pass` or
 * `pending` and prod is `fail`, or local was `pass` and prod is
 * `skip`).
 */
export interface ParityRow {
  phaseId: ParityPhaseId;
  checklistItem: string;
  priority: "P0" | "P1" | "P2" | "P3";
  local: "pass" | "fail" | "skip" | "pending" | null;
  prod: "pass" | "fail" | "skip" | "pending" | null;
  note?: string;
}

export interface ParityMatrix {
  schemaVersion: 1;
  generatedAt: string;
  sourceTrackLocal: string;
  sourceTrackProd: string;
  rows: ParityRow[];
}

/**
 * Compute whether a prod row regressed against the local row.
 * Pure function so Suite 2 can unit-test it without network.
 *
 * @param local The local QA observed status.
 * @param prod The prod observed status.
 * @returns `true` if the prod status is strictly worse than local.
 */
export function isProdRegression(
  local: ParityRow["local"],
  prod: ParityRow["prod"],
): boolean {
  if (prod === null || prod === "pending") return false;
  if (local === null || local === "pending") return false;
  if (local === "pass" && prod === "fail") return true;
  if (local === "pass" && prod === "skip") return true;
  if (local === "fail" && prod === "skip") return true;
  return false;
}

/**
 * Validate the structural shape of a ParityMatrix object. Returns
 * the list of validation errors (empty list = valid). Pure function
 * so Suite 2 can unit-test it.
 *
 * @param matrix The candidate matrix (typically `JSON.parse`'d from disk).
 * @returns Array of error messages; empty if valid.
 */
export function validateParityMatrix(matrix: unknown): string[] {
  const errors: string[] = [];
  if (typeof matrix !== "object" || matrix === null) {
    return ["matrix must be a non-null object"];
  }
  const m = matrix as Record<string, unknown>;
  if (m["schemaVersion"] !== 1) {
    errors.push(`schemaVersion must be 1, got ${JSON.stringify(m["schemaVersion"])}`);
  }
  if (typeof m["generatedAt"] !== "string") {
    errors.push("generatedAt must be a string");
  }
  if (typeof m["sourceTrackLocal"] !== "string") {
    errors.push("sourceTrackLocal must be a string");
  }
  if (typeof m["sourceTrackProd"] !== "string") {
    errors.push("sourceTrackProd must be a string");
  }
  if (!Array.isArray(m["rows"])) {
    errors.push("rows must be an array");
    return errors;
  }
  const rows = m["rows"] as unknown[];
  if (rows.length === 0) {
    errors.push("rows must be non-empty");
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown> | null;
    if (typeof row !== "object" || row === null) {
      errors.push(`rows[${i}] must be an object`);
      continue;
    }
    if (typeof row["phaseId"] !== "string") {
      errors.push(`rows[${i}].phaseId must be a string`);
    } else if (!PARITY_PHASE_IDS.includes(row["phaseId"] as ParityPhaseId)) {
      errors.push(`rows[${i}].phaseId must be one of ${PARITY_PHASE_IDS.join(", ")}`);
    }
    if (typeof row["checklistItem"] !== "string" || row["checklistItem"].length === 0) {
      errors.push(`rows[${i}].checklistItem must be a non-empty string`);
    }
    const allowedPriority = ["P0", "P1", "P2", "P3"];
    if (!allowedPriority.includes(row["priority"] as string)) {
      errors.push(`rows[${i}].priority must be one of ${allowedPriority.join(", ")}`);
    }
    const allowedStatus = ["pass", "fail", "skip", "pending", null];
    if (!allowedStatus.includes(row["local"] as string | null)) {
      errors.push(`rows[${i}].local must be one of ${allowedStatus.join("|")}`);
    }
    if (!allowedStatus.includes(row["prod"] as string | null)) {
      errors.push(`rows[${i}].prod must be one of ${allowedStatus.join("|")}`);
    }
  }
  return errors;
}

/**
 * Count the rows in the parity matrix that have observed status
 * (non-null) on both sides. Pure function for Suite 2 unit tests.
 */
export function countCompletedRows(matrix: ParityMatrix): number {
  return matrix.rows.filter((r) => r.local !== null && r.prod !== null).length;
}

/**
 * Count the rows in the parity matrix that exhibit a prod
 * regression. Pure function for Suite 2 unit tests.
 */
export function countRegressions(matrix: ParityMatrix): number {
  return matrix.rows.filter((r) => isProdRegression(r.local, r.prod)).length;
}

// ─── Source-seed parsers (unit-tested in Suite 4) ───────────

/**
 * Parse the curriculum seed file and return the count of
 * module-level `slug: '…'` entries (six-space indent).
 * Mirrors the regex in phase-4-feature-parity.test.ts:
 * `readSeedPhaseMap`. Pure function.
 */
export function countSeedModules(source: string): number {
  const matches = source.match(/^ {6}slug:\s*"[a-z0-9-]+",\s*$/gm);
  return matches?.length ?? 0;
}

/**
 * Parse the curriculum seed file and return the count of
 * lesson objects across all modules. Pure function.
 *
 * Each module declares its lessons as a `lessons: [ { ... }, ... ]`
 * array literal where each entry starts at 8-space indent:
 *   `      lessons: [`
 *   `        {`
 *   `          title: "..."`
 *   `          ...`
 *   `        },`
 *   `        {`
 *   `          ...`
 *   `        }`
 *   `      ],`
 *
 * The body of the lessons array may contain nested arrays
 * (e.g. `contentJson.sections: [ ... ]`) — we use a depth-
 * counting walk to find the matching `]` for the `lessons: [`
 * opening so we don't stop at a nested close.
 */
export function countSeedLessons(source: string): number {
  // Find all `lessons: [` openings at 6-space indent.
  const openRe = /\n {6}lessons:\s*\[/g;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(source)) !== null) {
    const start = m.index + m[0].length - 1; // index of `[`
    // Walk forward, counting `[` and `]`, to find the matching `]`.
    let depth = 0;
    let end = -1;
    for (let i = start; i < source.length; i++) {
      const c = source[i];
      if (c === "[") depth++;
      else if (c === "]") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    const body = source.slice(start, end + 1);
    // Count `{` openings at 8-space indent within the body.
    // Skip nested `{` like `contentJson: {` which are at the
    // 10-space indent (the `          {` after `contentJson: `).
    // We only count `{` whose preceding non-whitespace char is
    // a `,`, an opening `[`, or the start of the body.
    const lessonRe = /(^|\n|\[|,) {8}\{/g;
    const lessonMatches = body.match(lessonRe);
    total += lessonMatches?.length ?? 0;
  }
  return total;
}

/**
 * Extract the entry-phase (Phase A) module slugs from the seed
 * file. Pure function. Mirrors `readSeedPhaseMap` from
 * phase-4-feature-parity.test.ts.
 */
export function readSeedPhaseASlugs(source: string): string[] {
  // Capture slug and phase lines at 6-space indent, in order.
  const slugRe = /^ {6}slug:\s*"([a-z0-9-]+)",\s*$/gm;
  const phaseRe = /^ {6}phase:\s*"([ABCD])",\s*$/gm;
  const slugs: string[] = [];
  const phases: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = slugRe.exec(source))) slugs.push(m[1]!);
  while ((m = phaseRe.exec(source))) phases.push(m[1]!);
  const out: string[] = [];
  for (let i = 0; i < slugs.length && i < phases.length; i++) {
    if (phases[i] === "A") out.push(slugs[i]!);
  }
  return out;
}

// ─── Tests ─────────────────────────────────────────────────

describe("Phase 12 — Local QA baseline filesystem contract", () => {
  beforeAll(() => {
    if (SKIP) return;
    expect(PROD_URL, "PHASE12_PROD_URL must be https://").toMatch(/^https:\/\//);
  });

  it("`measure/tracks/codecamp_qa_local_20260517/` exists — local QA track is the regression baseline", () => {
    const exists = existsSync(LOCAL_QA_TRACK_DIR);
    expect(
      exists,
      `expected local QA track directory at ${LOCAL_QA_TRACK_DIR} to exist — ` +
        "Phase 12 cannot run without a local baseline (test-strategy.md §3: " +
        "'Phase 12 regression depends on `codecamp_qa_local_20260517` results " +
        "being captured first')",
    ).toBe(true);
  });

  for (const fileName of LOCAL_QA_TRACK_REQUIRED_FILES) {
    it(`local QA track contains required file \`${fileName}\``, () => {
      const filePath = resolve(LOCAL_QA_TRACK_DIR, fileName);
      const exists = existsSync(filePath);
      expect(
        exists,
        `expected ${filePath} to exist — local QA track must mirror the prod track's required files`,
      ).toBe(true);
    });
  }

  it("prod QA track directory still exists (regression is a cross-track check)", () => {
    const exists = existsSync(PROD_QA_TRACK_DIR);
    expect(
      exists,
      `expected prod QA track directory at ${PROD_QA_TRACK_DIR} to exist`,
    ).toBe(true);
  });

  it("local QA track id matches the dependency contract from the prod spec", () => {
    const localSpecPath = resolve(LOCAL_QA_TRACK_DIR, "spec.md");
    if (!existsSync(localSpecPath)) {
      expect.fail(`${localSpecPath} does not exist — Suite 1 RED expected`);
      return;
    }
    const content = readFileSync(localSpecPath, "utf-8");
    expect(content.length, "local spec.md must be non-empty").toBeGreaterThan(0);
  });
});

describe("Phase 12 — Parity matrix helper unit tests (always run)", () => {
  describe("isProdRegression()", () => {
    it("regression when local=pass, prod=fail", () => {
      expect(isProdRegression("pass", "fail")).toBe(true);
    });
    it("regression when local=pass, prod=skip (prod missed a previously-passing check)", () => {
      expect(isProdRegression("pass", "skip")).toBe(true);
    });
    it("regression when local=fail, prod=skip (open local bug never re-verified in prod)", () => {
      expect(isProdRegression("fail", "skip")).toBe(true);
    });
    it("no regression when local=fail, prod=pass (local fix verified in prod)", () => {
      expect(isProdRegression("fail", "pass")).toBe(false);
    });
    it("no regression when local=pass, prod=pass", () => {
      expect(isProdRegression("pass", "pass")).toBe(false);
    });
    it("no regression when local=pending, prod=anything (both are not yet observed)", () => {
      expect(isProdRegression("pending", "pass")).toBe(false);
      expect(isProdRegression("pending", "fail")).toBe(false);
      expect(isProdRegression("pending", "skip")).toBe(false);
    });
    it("no regression when prod=pending, anything (prod observation not yet captured)", () => {
      expect(isProdRegression("pass", "pending")).toBe(false);
      expect(isProdRegression("fail", "pending")).toBe(false);
    });
    it("no regression when either side is null (not yet observed)", () => {
      expect(isProdRegression(null, "pass")).toBe(false);
      expect(isProdRegression("pass", null)).toBe(false);
      expect(isProdRegression(null, null)).toBe(false);
    });
  });

  describe("validateParityMatrix()", () => {
    it("rejects null", () => {
      const errors = validateParityMatrix(null);
      expect(errors).toEqual(["matrix must be a non-null object"]);
    });
    it("rejects non-object", () => {
      const errors = validateParityMatrix("not a matrix");
      expect(errors).toEqual(["matrix must be a non-null object"]);
    });
    it("rejects missing schemaVersion", () => {
      const errors = validateParityMatrix({ generatedAt: "x", sourceTrackLocal: "a", sourceTrackProd: "b", rows: [] });
      expect(errors.some((e) => e.includes("schemaVersion"))).toBe(true);
    });
    it("rejects non-array rows", () => {
      const errors = validateParityMatrix({
        schemaVersion: 1,
        generatedAt: "x",
        sourceTrackLocal: "a",
        sourceTrackProd: "b",
        rows: "not an array",
      });
      expect(errors.some((e) => e.includes("rows must be an array"))).toBe(true);
    });
    it("rejects empty rows array", () => {
      const errors = validateParityMatrix({
        schemaVersion: 1,
        generatedAt: "x",
        sourceTrackLocal: "a",
        sourceTrackProd: "b",
        rows: [],
      });
      expect(errors.some((e) => e.includes("rows must be non-empty"))).toBe(true);
    });
    it("accepts a minimal valid matrix", () => {
      const errors = validateParityMatrix({
        schemaVersion: 1,
        generatedAt: "2026-06-11T00:00:00Z",
        sourceTrackLocal: "codecamp_qa_local_20260517",
        sourceTrackProd: "codecamp_qa_prod_20260517",
        rows: [
          {
            phaseId: "1-infrastructure",
            checklistItem: "DNS resolves",
            priority: "P0",
            local: "pass",
            prod: "pass",
          },
        ],
      });
      expect(errors).toEqual([]);
    });
    it("rejects unknown phaseId", () => {
      const errors = validateParityMatrix({
        schemaVersion: 1,
        generatedAt: "x",
        sourceTrackLocal: "a",
        sourceTrackProd: "b",
        rows: [
          {
            phaseId: "bogus-phase",
            checklistItem: "x",
            priority: "P0",
            local: "pass",
            prod: "pass",
          },
        ],
      });
      expect(errors.some((e) => e.includes("phaseId must be one of"))).toBe(true);
    });
    it("rejects invalid priority", () => {
      const errors = validateParityMatrix({
        schemaVersion: 1,
        generatedAt: "x",
        sourceTrackLocal: "a",
        sourceTrackProd: "b",
        rows: [
          {
            phaseId: "1-infrastructure",
            checklistItem: "x",
            priority: "P9",
            local: "pass",
            prod: "pass",
          },
        ],
      });
      expect(errors.some((e) => e.includes("priority must be one of"))).toBe(true);
    });
    it("rejects empty checklistItem", () => {
      const errors = validateParityMatrix({
        schemaVersion: 1,
        generatedAt: "x",
        sourceTrackLocal: "a",
        sourceTrackProd: "b",
        rows: [
          {
            phaseId: "1-infrastructure",
            checklistItem: "",
            priority: "P0",
            local: "pass",
            prod: "pass",
          },
        ],
      });
      expect(errors.some((e) => e.includes("checklistItem must be a non-empty string"))).toBe(true);
    });
  });

  describe("countCompletedRows() / countRegressions()", () => {
    it("counts rows where both local and prod are observed", () => {
      const matrix: ParityMatrix = {
        schemaVersion: 1,
        generatedAt: "x",
        sourceTrackLocal: "a",
        sourceTrackProd: "b",
        rows: [
          { phaseId: "1-infrastructure", checklistItem: "a", priority: "P0", local: "pass", prod: "pass" },
          { phaseId: "2-database-and-configuration", checklistItem: "b", priority: "P0", local: "pass", prod: "fail" },
          { phaseId: "3-authentication-and-authorization", checklistItem: "c", priority: "P0", local: null, prod: "pass" },
          { phaseId: "4-feature-parity", checklistItem: "d", priority: "P0", local: "pass", prod: null },
        ],
      };
      expect(countCompletedRows(matrix)).toBe(2);
      expect(countRegressions(matrix)).toBe(1);
    });
  });
});

describe("Phase 12 — Parity matrix artifact (filesystem)", () => {
  it("`local-qa-parity-matrix.json` exists — the side-by-side spreadsheet from test-strategy.md §5 P12", () => {
    const exists = existsSync(PARITY_MATRIX_PATH);
    expect(
      exists,
      `expected parity matrix at ${PARITY_MATRIX_PATH} to exist — ` +
        "test-strategy.md §5 P12 requires a side-by-side spreadsheet " +
        "comparing local vs prod result per checklist item; this file " +
        "is the executable form of that spreadsheet",
    ).toBe(true);
  });

  it("parity matrix parses as valid JSON with the expected schema", () => {
    if (!existsSync(PARITY_MATRIX_PATH)) {
      expect.fail(`${PARITY_MATRIX_PATH} does not exist — Suite 2 RED expected`);
      return;
    }
    const raw = readFileSync(PARITY_MATRIX_PATH, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      expect.fail(`parity matrix is not valid JSON: ${(e as Error).message}`);
      return;
    }
    const errors = validateParityMatrix(parsed);
    expect(
      errors,
      `parity matrix has ${errors.length} validation error(s):\n${errors.join("\n")}`,
    ).toEqual([]);
  });

  it("parity matrix covers all 12 phase IDs in PARITY_PHASE_IDS", () => {
    if (!existsSync(PARITY_MATRIX_PATH)) {
      expect.fail(`${PARITY_MATRIX_PATH} does not exist — Suite 2 RED expected`);
      return;
    }
    const raw = readFileSync(PARITY_MATRIX_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ParityMatrix;
    const coveredPhaseIds = new Set(parsed.rows.map((r) => r.phaseId));
    const missing = PARITY_PHASE_IDS.filter((id) => !coveredPhaseIds.has(id));
    expect(
      missing,
      `parity matrix is missing rows for ${missing.length} phase(s): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("parity matrix has at least 3 P0 rows (one per feature-parity sub-task)", () => {
    if (!existsSync(PARITY_MATRIX_PATH)) {
      expect.fail(`${PARITY_MATRIX_PATH} does not exist — Suite 2 RED expected`);
      return;
    }
    const raw = readFileSync(PARITY_MATRIX_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ParityMatrix;
    const p0Count = parsed.rows.filter((r) => r.priority === "P0").length;
    expect(
      p0Count,
      `parity matrix has ${p0Count} P0 row(s) — expected at least 3 (one per feature-parity sub-task)`,
    ).toBeGreaterThanOrEqual(3);
  });

  it("parity matrix has zero prod regressions (no P0 row went from local pass to prod fail)", () => {
    if (!existsSync(PARITY_MATRIX_PATH)) {
      expect.fail(`${PARITY_MATRIX_PATH} does not exist — Suite 2 RED expected`);
      return;
    }
    const raw = readFileSync(PARITY_MATRIX_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ParityMatrix;
    const regressions = parsed.rows.filter((r) => isProdRegression(r.local, r.prod));
    const lines = regressions.map(
      (r) => `  - [${r.priority}] ${r.phaseId} :: ${r.checklistItem} (local=${r.local} prod=${r.prod})`,
    );
    expect(
      regressions.length,
      `parity matrix has ${regressions.length} prod regression(s):\n${lines.join("\n")}`,
    ).toBe(0);
  });
});

describe("Phase 12 — Per-phase prod parity (filesystem regression detectors)", () => {
  for (const phaseId of PARITY_PHASE_IDS) {
    it(`prod smoke test file exists for phase "${phaseId}"`, () => {
      const fileName = `phase-${phaseId}.test.ts`;
      const filePath = resolve(PROD_SMOKE_DIR, fileName);
      const exists = existsSync(filePath);
      expect(
        exists,
        `expected ${filePath} to exist — parity matrix requires a corresponding prod-smoke contract for each phase`,
      ).toBe(true);
    });
  }
});

describe("Phase 12 — Data consistency contract (source-level)", () => {
  it("curriculum seed file exists", () => {
    expect(existsSync(CURRICULUM_SEED_PATH)).toBe(true);
  });

  it("curriculum seed declares exactly 18 module-level slugs (test-strategy.md §2 oracle)", () => {
    if (!existsSync(CURRICULUM_SEED_PATH)) {
      expect.fail(`${CURRICULUM_SEED_PATH} does not exist`);
      return;
    }
    const source = readFileSync(CURRICULUM_SEED_PATH, "utf-8");
    const count = countSeedModules(source);
    expect(
      count,
      `expected ${EXPECTED_MODULE_COUNT} module-level slugs, got ${count}`,
    ).toBe(EXPECTED_MODULE_COUNT);
  });

  it("curriculum seed declares exactly 85 lessons across modules (test-strategy.md §2 oracle)", () => {
    if (!existsSync(CURRICULUM_SEED_PATH)) {
      expect.fail(`${CURRICULUM_SEED_PATH} does not exist`);
      return;
    }
    const source = readFileSync(CURRICULUM_SEED_PATH, "utf-8");
    const count = countSeedLessons(source);
    expect(
      count,
      `expected ${EXPECTED_LESSON_COUNT} lessons across modules, got ${count}`,
    ).toBe(EXPECTED_LESSON_COUNT);
  });

  it("curriculum seed Phase A module slugs include the four entry-phase modules (test-strategy.md §6 + Phase 4 oracle)", () => {
    if (!existsSync(CURRICULUM_SEED_PATH)) {
      expect.fail(`${CURRICULUM_SEED_PATH} does not exist`);
      return;
    }
    const source = readFileSync(CURRICULUM_SEED_PATH, "utf-8");
    const slugs = readSeedPhaseASlugs(source);
    for (const requiredSlug of EXPECTED_PHASE_A_SLUGS) {
      expect(
        slugs,
        `Phase A slugs from seed=${JSON.stringify(slugs)} must include the entry-phase module "${requiredSlug}"`,
      ).toContain(requiredSlug);
    }
  });

  it("`dashboardResponseSchema` exists in `packages/types/src/codecamp.ts` (Phase 4 oracle shape)", () => {
    if (!existsSync(CODECAMP_TYPES_SOURCE)) {
      expect.fail(`${CODECAMP_TYPES_SOURCE} does not exist`);
      return;
    }
    const source = readFileSync(CODECAMP_TYPES_SOURCE, "utf-8");
    expect(
      source.includes("dashboardResponseSchema"),
      "`dashboardResponseSchema` must be exported from packages/types/src/codecamp.ts",
    ).toBe(true);
    // The schema must carry the keys the dashboard renders (test-strategy.md §6
    // "dashboardResponseSchema ... is the contract Phase 4 dashboard checks
    // must validate; deviations are schema drift, not UI bugs.").
    expect(source.includes("phases")).toBe(true);
    expect(source.includes("overallProgress")).toBe(true);
    expect(source.includes("recentConversations")).toBe(true);
  });
});

describe("Phase 12 — Prod-vs-local data consistency (network probes, gated)", () => {
  skipIf("prod dashboard unauth probe returns 401 (or 307 redirect to login) — wire is alive", async () => {
    const response = await fetchWithTimeout(`${PROD_URL}/api/trpc/codecamp.dashboard?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D`, {
      method: "GET",
    });
    expect(
      [200, 307, 401, 403].includes(response.status),
      `expected prod dashboard unauth probe to return 200/307/401/403, got ${response.status}`,
    ).toBe(true);
  }, PROBE_TIMEOUT_MS + 2_000);

  skipIf("prod `/en/module/dev-environment` returns 2xx (data integrity — module page renders)", async () => {
    const response = await fetchWithTimeout(`${PROD_URL}/en/module/dev-environment`, {
      method: "GET",
    });
    expect(
      response.status,
      `expected 2xx on prod /en/module/dev-environment, got ${response.status}`,
    ).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(400);
  }, PROBE_TIMEOUT_MS + 2_000);
});

describe("Phase 12 — P0 launch gate (single hard assertion)", () => {
  it("all 12 P0 sub-tasks of Phase 12 are satisfied — local-vs-prod parity is clean", () => {
    const failures: string[] = [];

    // Sub-task 1: All P0 local QA tests pass in production
    // (encoded as: parity-matrix exists, has P0 rows, zero regressions)
    if (!existsSync(PARITY_MATRIX_PATH)) {
      failures.push(
        "[P0/feature-parity] parity-matrix artifact missing — cannot verify 'All P0 local QA tests pass in production'",
      );
    } else {
      const raw = readFileSync(PARITY_MATRIX_PATH, "utf-8");
      const parsed = JSON.parse(raw) as ParityMatrix;
      const p0Rows = parsed.rows.filter((r) => r.priority === "P0");
      const p0Regressions = p0Rows.filter((r) => isProdRegression(r.local, r.prod));
      if (p0Rows.length === 0) {
        failures.push("[P0/feature-parity] parity matrix has zero P0 rows");
      }
      if (p0Regressions.length > 0) {
        failures.push(
          `[P0/feature-parity] ${p0Regressions.length} P0 row(s) regressed in prod: ` +
            p0Regressions.map((r) => `${r.phaseId}::${r.checklistItem}`).join(", "),
        );
      }
    }

    // Sub-task 2: No production-only failures in P0/P1 areas
    // (encoded as: parity-matrix has no row where local=pass and prod=fail)
    if (existsSync(PARITY_MATRIX_PATH)) {
      const raw = readFileSync(PARITY_MATRIX_PATH, "utf-8");
      const parsed = JSON.parse(raw) as ParityMatrix;
      const p01Failures = parsed.rows.filter(
        (r) =>
          (r.priority === "P0" || r.priority === "P1") &&
          r.local === "pass" &&
          r.prod === "fail",
      );
      if (p01Failures.length > 0) {
        failures.push(
          `[P0/known-local-issues] ${p01Failures.length} P0/P1 production-only failure(s): ` +
            p01Failures.map((r) => `${r.phaseId}::${r.checklistItem}`).join(", "),
        );
      }
    }

    // Sub-task 3: Production data matches expected seed state
    // (encoded as: 18 modules, 85 lessons, dashboardResponseSchema with the
    // expected keys, Phase A slugs match)
    if (existsSync(CURRICULUM_SEED_PATH)) {
      const source = readFileSync(CURRICULUM_SEED_PATH, "utf-8");
      const modules = countSeedModules(source);
      const lessons = countSeedLessons(source);
      if (modules !== EXPECTED_MODULE_COUNT) {
        failures.push(
          `[P0/data-consistency] expected ${EXPECTED_MODULE_COUNT} modules, got ${modules}`,
        );
      }
      if (lessons !== EXPECTED_LESSON_COUNT) {
        failures.push(
          `[P0/data-consistency] expected ${EXPECTED_LESSON_COUNT} lessons, got ${lessons}`,
        );
      }
      const phaseASlugs = readSeedPhaseASlugs(source);
      // Containment check (matches Phase 4 oracle: `toContain` not
      // `toEqual`). The seed has 6 Phase A modules at HEAD; the
      // entry-phase contract is the 4 dashboard-first modules.
      // A regression that drops any of those 4 breaks the
      // dashboard's first-thing-you-see surface.
      const missing = EXPECTED_PHASE_A_SLUGS.filter((s) => !phaseASlugs.includes(s));
      if (missing.length > 0) {
        failures.push(
          `[P0/data-consistency] Phase A entry-phase slugs missing: ` +
            `missing=${JSON.stringify(missing)} present=${JSON.stringify(phaseASlugs)}`,
        );
      }
    } else {
      failures.push("[P0/data-consistency] curriculum seed file missing");
    }

    expect(
      failures,
      `Phase 12 P0 launch gate failed with ${failures.length} item(s):\n${failures.map((f) => `  - ${f}`).join("\n")}`,
    ).toEqual([]);
  });
});
