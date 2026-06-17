/**
 * Phase 4 — Red contract: closure-gate assertions for the
 * Drizzle 0.45 era.
 *
 * Spec: measure/tracks/drizzle045_major_migration/spec.md §AC 7, §AC 8
 *       ("pnpm outdated -r shows Drizzle at the target version" +
 *        "Documentation updated in measure/tech-stack.md").
 * Strategy: measure/tracks/drizzle045_major_migration/test-strategy.md §5
 *           ("Phase 4: Validate & Close — Aggregate gate:
 *            pnpm turbo run lint|test|check-types|build. Smoke tests:
 *            pnpm --filter @reading-advantage/db migrate against fresh
 *            DB; pnpm outdated -r shows drizzle-orm 0.45.x, drizzle-kit
 *            0.32+; pnpm audit clean. Documentation: Update
 *            measure/tech-stack.md with Drizzle 0.45 version.").
 *
 * Per test-strategy.md §5/§7, the Phase 4 deliverables are:
 *   1. Aggregate gate `pnpm turbo run lint test check-types build`
 *      runs GREEN across the whole monorepo (Task 1).
 *   2. `pnpm outdated -r` and `pnpm audit` are run; results are
 *      documented in a per-track closure record (Task 2).
 *   3. `measure/tech-stack.md` is updated with the Drizzle 0.45
 *      version in the "Selected Shared Versions" table (Task 3 / AC 8).
 *
 * This Red contract pins the closure deliverables that the
 * JR/Implement role must land before the track is closed:
 *
 *   - Task 3 (tech-stack.md row) is a direct artifact assertion —
 *     the deliverable IS the artifact, paired with the plan note
 *     that JR owns the documentation edit (the file is read-only
 *     for Mid role boundary reasons).
 *   - Tasks 1 and 2 are paired artifact + live-run deliverables.
 *     The live runs of `pnpm turbo run`, `pnpm outdated`, and
 *     `pnpm audit` require network + Docker Postgres + every
 *     workspace's lint/test/build config and cannot be executed
 *     in the Mid role's sandbox (see Phase 3 attempt-2 audit
 *     `db4f0334` for the analogous pattern). The JR role owns
 *     those live runs; the per-track closure records
 *     (phase4-aggregate-gate.md, phase4-outdated-audit.md) are
 *     the evidence files the JR role writes to document the
 *     live-run outputs. This is the same pattern Phase 1 Red used
 *     to pin the three audit artifacts (phase1-breaking-changes.md
 *     etc.) before Phase 1 Green authored them.
 *
 * Per agent rules ("Artifact or markdown assertions are allowed
 * only when the phase deliverable is that artifact, and they must
 * be paired with a live-behavior proof or an explicit plan note
 * saying which later role owns the live gate"), the plan note
 * above establishes JR's ownership of the live runs for Tasks 1
 * and 2; the artifact assertions below pin that the evidence
 * files land.
 *
 * Per agent rules ("If testing a shell runner or fake harness,
 * prove the fake mode intercepts the exact command path or test
 * the command string directly; do not create a 'smoke' test that
 * can accidentally run the real full suite"), this file does NOT
 * shell out to `pnpm turbo run`, `pnpm outdated`, or `pnpm
 * audit`. The aggregate-gate + outdated/audit evidence is pinned
 * by asserting the closure record markdown files exist and
 * cross-reference the exact command strings + version ranges;
 * the live-run ownership is documented in plan.md.
 *
 * Targeted Red command (Phase 4 Mid, bounded):
 *   cd packages/db && ./node_modules/.bin/vitest run \
 *     src/__tests__/drizzle045-phase4-closure-gates.test.ts
 *
 * Red rationale (per describe block):
 *
 *   1. "tech-stack.md Drizzle version (Task 3 / AC 8)" — 4 tests.
 *      The "Selected Shared Versions (post dependency_upgrade_hardening_20260607)"
 *      table in `measure/tech-stack.md` must include a Drizzle row
 *      at a 0.45.x version in positive-target context (not
 *      "we will not adopt 0.45"). Currently the table has rows
 *      for Next.js / React / Vitest only — no Drizzle row. Phase 4
 *      must add the row.
 *
 *   2. "Task 1 — aggregate-gate closure record" — 4 tests. A
 *      closure artifact must exist at
 *      `measure/tracks/drizzle045_major_migration/phase4-aggregate-gate.md`,
 *      must document the `pnpm turbo run lint test check-types build`
 *      invocation, must reference all four turbo tasks in
 *      positive-pass context, and must cross-reference the track
 *      ID. The actual live run of the aggregate gate is owned by
 *      the JR role per the plan note above.
 *
 *   3. "Task 2 — pnpm outdated / audit closure record" — 4 tests.
 *      A closure artifact must exist at
 *      `measure/tracks/drizzle045_major_migration/phase4-outdated-audit.md`,
 *      must record `pnpm outdated -r drizzle-orm` showing a 0.45.x
 *      version in positive-pass context, and must record `pnpm
 *      audit` clean. The actual live runs of `pnpm outdated` and
 *      `pnpm audit` are owned by the JR role per the plan note
 *      above.
 *
 * Intentionally excluded from this Red command:
 *
 *   - The full `packages/db` suite — out of scope for the targeted
 *     Red gate per test-strategy §7.
 *   - All other `drizzle045-*.test.ts` files — owned by their
 *     respective phases and GREEN at HEAD.
 *   - Live shell invocations of `pnpm turbo run`, `pnpm outdated`,
 *     `pnpm audit` — owned by JR per the plan note above; the Mid
 *     role asserts only the closure-record evidence files.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");
const TECH_STACK_PATH = join(REPO_ROOT, "measure/tech-stack.md");
const TRACK_DIR = join(
  REPO_ROOT,
  "measure/tracks/drizzle045_major_migration",
);
const AGGREGATE_GATE_CLOSURE_PATH = join(
  TRACK_DIR,
  "phase4-aggregate-gate.md",
);
const OUTDATED_AUDIT_CLOSURE_PATH = join(
  TRACK_DIR,
  "phase4-outdated-audit.md",
);
const LOCKFILE_PATH = join(REPO_ROOT, "pnpm-lock.yaml");

// ---------------------------------------------------------------------------
// Helpers — positive-context keyword matcher that rejects negated
// references like "we will not adopt 0.45" or "0.45 is the bug".
// Mirrors the pattern used in
// packages/db/src/__tests__/drizzle045-phase1-contracts-adversarial.test.ts.
// ---------------------------------------------------------------------------

function appearsInPositiveContext(
  text: string,
  keyword: string,
): boolean {
  // Look for the keyword in at least one line that does NOT contain
  // a negation cue within a 60-char window before the keyword.
  const lines = text.split(/\r?\n/);
  const negationCues = [
    "not adopt",
    "will not",
    "won't",
    "rejected",
    "reject",
    "is the bug",
    "is broken",
    "broken in",
    "vulnerability",
    "vulnerable",
    "CVE-",
    "downgrade",
    "roll back",
    "rollback",
    "pre-0.45",
    "pre-0.44",
    "old version",
    "older version",
    "before 0.45",
    "before 0.44",
    "stale",
    "obsolete",
  ];
  for (const line of lines) {
    const idx = line.indexOf(keyword);
    if (idx === -1) continue;
    const window = line.slice(Math.max(0, idx - 80), idx).toLowerCase();
    const isNegated = negationCues.some((cue) => window.includes(cue));
    if (!isNegated) return true;
  }
  return false;
}

function extractTableRows(markdown: string): string[][] {
  // Minimal Markdown table parser: rows of `| col | col | col |` lines.
  // Returns only rows that have at least 2 cells and look like data
  // rows (no separator `|---|---|`).
  const rows: string[][] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""));
    if (cells.length < 2) continue;
    rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Task 3 (AC 8) — measure/tech-stack.md must add a Drizzle row to the
// "Selected Shared Versions" table at 0.45.x. RED at HEAD: the table
// has Next.js / React / Vitest but no Drizzle row.
// ---------------------------------------------------------------------------

describe("drizzle045-phase4-closure-gates — tech-stack.md Drizzle version (Task 3 / AC 8)", () => {
  let techStack: string;

  beforeAll(() => {
    techStack = readFileSync(TECH_STACK_PATH, "utf8");
  });

  it("measure/tech-stack.md exists and exposes the Selected Shared Versions table", () => {
    expect(
      existsSync(TECH_STACK_PATH),
      "measure/tech-stack.md must exist at the repo root.",
    ).toBe(true);
    expect(
      techStack,
      'tech-stack.md must contain a "Selected Shared Versions" table.',
    ).toMatch(/Selected Shared Versions/);
  });

  it('the "Selected Shared Versions" table contains a Drizzle row at 0.45.x', () => {
    const rows = extractTableRows(techStack);
    const headerIdx = rows.findIndex((r) =>
      r.some((c) => /Selected Shared Versions/i.test(c)) ||
      (r[0] === "Package" && r.some((c) => /Selected Version/i.test(c))),
    );
    // Fallback: locate the table by header row containing "Package"
    // + "Selected Version".
    const headerRowIdx =
      headerIdx !== -1
        ? headerIdx
        : rows.findIndex(
            (r) =>
              r.length >= 3 &&
              r[0] === "Package" &&
              r[1] === "Selected Version",
          );
    expect(
      headerRowIdx,
      'tech-stack.md must contain a Markdown table with columns ' +
        '"Package" / "Selected Version" / "Source" (the ' +
        '"Selected Shared Versions" table).',
    ).toBeGreaterThanOrEqual(0);

    const dataRows = rows.slice(headerRowIdx + 1).filter((r) => {
      // Stop at the next header row or H2 boundary.
      if (r.length < 3) return false;
      if (r[0] === "Package") return false;
      return true;
    });

    const drizzleRow = dataRows.find((r) =>
      /drizzle|drizzle-orm|drizzle045/i.test(r[0]),
    );
    expect(
      drizzleRow,
      'the "Selected Shared Versions" table must include a Drizzle row. ' +
        'Current rows: ' +
        JSON.stringify(dataRows.map((r) => r[0])),
    ).toBeDefined();

    const versionCell = drizzleRow![1];
    expect(
      versionCell,
      "the Drizzle row's Selected Version cell must be present.",
    ).toBeDefined();
    expect(
      versionCell,
      `the Drizzle row's Selected Version cell must reference 0.45.x; ` +
        `got "${versionCell}".`,
    ).toMatch(/0\.45/);
    // Reject stale 0.44.x references in the version cell.
    expect(
      versionCell,
      `the Drizzle row's Selected Version cell must not be a 0.44.x ` +
        `reference (we are on 0.45.x per Phase 2/3 Green); got ` +
        `"${versionCell}".`,
    ).not.toMatch(/0\.44/);
  });

  it('the Drizzle row is referenced in positive-target context (not negated)', () => {
    // Pull the first Drizzle row from the Selected Shared Versions
    // table and assert the version string appears in positive
    // context — defends against "we will not adopt 0.45" stubs.
    const rows = extractTableRows(techStack);
    const drizzleRow = rows.find(
      (r) =>
        r.length >= 3 &&
        /drizzle|drizzle-orm|drizzle045/i.test(r[0]),
    );
    expect(
      drizzleRow,
      'a Drizzle row must exist in the "Selected Shared Versions" table.',
    ).toBeDefined();
    const versionCell = drizzleRow![1];
    expect(
      appearsInPositiveContext(techStack, versionCell),
      `the Drizzle version "${versionCell}" must appear in positive ` +
        `context (not negated by "not adopt", "rejected", "CVE-", ` +
        `"vulnerable", "rollback", etc.).`,
    ).toBe(true);
  });

  it('the Drizzle row source cell cross-references the drizzle045_major_migration track', () => {
    const rows = extractTableRows(techStack);
    const drizzleRow = rows.find(
      (r) =>
        r.length >= 3 &&
        /drizzle|drizzle-orm|drizzle045/i.test(r[0]),
    );
    expect(
      drizzleRow,
      'a Drizzle row must exist in the "Selected Shared Versions" table.',
    ).toBeDefined();
    const sourceCell = drizzleRow![2];
    expect(
      sourceCell,
      "the Drizzle row's Source cell must cross-reference the " +
        "drizzle045_major_migration track (or its spec AC 8).",
    ).toMatch(/drizzle045_major_migration|AC 8|0\.45 migration/i);
  });
});

// ---------------------------------------------------------------------------
// Task 1 — aggregate-gate closure record. The live run of
// `pnpm turbo run lint test check-types build` is owned by the
// JR role (see plan note); the Mid role pins that the evidence file
// lands with the right shape.
// ---------------------------------------------------------------------------

describe("drizzle045-phase4-closure-gates — aggregate-gate closure record (Task 1)", () => {
  let closure: string;

  beforeAll(() => {
    closure = existsSync(AGGREGATE_GATE_CLOSURE_PATH)
      ? readFileSync(AGGREGATE_GATE_CLOSURE_PATH, "utf8")
      : "";
  });

  it("phase4-aggregate-gate.md exists at the track directory", () => {
    expect(
      existsSync(AGGREGATE_GATE_CLOSURE_PATH),
      `Task 1 closure record must exist at ` +
        `${AGGREGATE_GATE_CLOSURE_PATH}.`,
    ).toBe(true);
  });

  it("phase4-aggregate-gate.md documents the aggregate-gate command", () => {
    expect(closure, "closure record must be non-empty").not.toBe("");
    // Must reference the exact turbo run command from test-strategy §7.
    expect(
      closure,
      "closure record must reference `pnpm turbo run lint test check-types build`.",
    ).toMatch(/pnpm\s+turbo\s+run\s+lint\s+test\s+check-types\s+build/);
  });

  it("phase4-aggregate-gate.md references all four turbo tasks in positive-pass context", () => {
    expect(closure, "closure record must be non-empty").not.toBe("");
    for (const task of ["lint", "test", "check-types", "build"]) {
      expect(
        closure,
        `closure record must reference the "${task}" turbo task.`,
      ).toMatch(new RegExp(`\\b${task}\\b`));
      // Defend against a single-line "lint failed, test failed, ..."
      // stub: the keyword must appear in positive-pass context
      // somewhere in the document (PASS / GREEN / exit 0 / 0
      // errors, etc.).
      const positivePass =
        new RegExp(
          `\\b${task}\\b[^\\n]*\\b(PASS|GREEN|exit 0|exit code 0|0 errors|0 failures|\\bOK\\b)`,
          "i",
        );
      const reverse = new RegExp(
        `(PASS|GREEN|exit 0|exit code 0|0 errors|0 failures|\\bOK\\b)[^\\n]*\\b${task}\\b`,
        "i",
      );
      const hasPositivePass =
        positivePass.test(closure) || reverse.test(closure);
      expect(
        hasPositivePass,
        `closure record must reference the "${task}" turbo task in ` +
          `positive-pass context (PASS / GREEN / exit 0 / 0 errors).`,
      ).toBe(true);
    }
  });

  it("phase4-aggregate-gate.md cross-references the drizzle045_major_migration track", () => {
    expect(closure, "closure record must be non-empty").not.toBe("");
    expect(
      closure,
      "closure record must cross-reference the track id " +
        "drizzle045_major_migration.",
    ).toMatch(/drizzle045_major_migration/);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — pnpm outdated + pnpm audit closure record. The live runs
// of `pnpm outdated -r` and `pnpm audit` are owned by the JR role
// (see plan note); the Mid role pins that the evidence file lands
// with the right shape.
// ---------------------------------------------------------------------------

describe("drizzle045-phase4-closure-gates — pnpm outdated / audit closure record (Task 2)", () => {
  let closure: string;

  beforeAll(() => {
    closure = existsSync(OUTDATED_AUDIT_CLOSURE_PATH)
      ? readFileSync(OUTDATED_AUDIT_CLOSURE_PATH, "utf8")
      : "";
  });

  it("phase4-outdated-audit.md exists at the track directory", () => {
    expect(
      existsSync(OUTDATED_AUDIT_CLOSURE_PATH),
      `Task 2 closure record must exist at ` +
        `${OUTDATED_AUDIT_CLOSURE_PATH}.`,
    ).toBe(true);
  });

  it("phase4-outdated-audit.md records pnpm outdated -r showing drizzle-orm 0.45.x", () => {
    expect(closure, "closure record must be non-empty").not.toBe("");
    expect(
      closure,
      "closure record must reference `pnpm outdated -r drizzle-orm` " +
        "or the equivalent `pnpm outdated -r` invocation.",
    ).toMatch(/pnpm\s+outdated[^]*?drizzle-orm/);
    // The drizzle-orm version reported by `pnpm outdated` must be
    // 0.45.x (matches the installed/lockfile state — see also
    // Phase 3 integration-gates regression-guard tests).
    const versionMatch = closure.match(/drizzle-orm[@\s]+v?(\d+\.\d+\.\d+)/);
    expect(
      versionMatch,
      "closure record must include a drizzle-orm version number " +
        "(e.g., drizzle-orm 0.45.2).",
    ).not.toBeNull();
    const [, version] = versionMatch!;
    expect(
      version.startsWith("0.45."),
      `closure record must show drizzle-orm at a 0.45.x version; ` +
        `got ${version}.`,
    ).toBe(true);
    expect(
      appearsInPositiveContext(closure, version),
      `drizzle-orm version "${version}" must appear in positive ` +
        `context (not negated by "not adopt", "rejected", "downgrade", ` +
        `"vulnerable", "CVE-", etc.).`,
    ).toBe(true);
  });

  it("phase4-outdated-audit.md records pnpm outdated -r showing drizzle-kit >=0.31.7", () => {
    expect(closure, "closure record must be non-empty").not.toBe("");
    // The closure record must also capture the companion drizzle-kit
    // version from `pnpm outdated -r`.  Per Phase 3 audit
    // (test-strategy §7 note), no stable drizzle-kit 0.32.x exists on
    // npm (latest stable is 0.31.10); the Phase 3 integration-gates
    // test was adjusted from >=0.32 to >=0.31.7.  This assertion
    // follows the same >=0.31.7 floor.
    expect(
      closure,
      "closure record must reference drizzle-kit in the `pnpm outdated` report.",
    ).toMatch(/drizzle-kit\b/);
    const kitVersionMatch = closure.match(
      /drizzle-kit[@\s]+v?(\d+\.\d+\.\d+)/,
    );
    expect(
      kitVersionMatch,
      "closure record must include a drizzle-kit version number " +
        "(e.g., drizzle-kit 0.31.10).",
    ).not.toBeNull();
    const [, kitVersion] = kitVersionMatch!;
    const [kitMajor, kitMinor] = kitVersion.split(".").map(Number);
    expect(
      kitMajor === 0 && kitMinor >= 31,
      `closure record must show drizzle-kit at >=0.31.7; ` +
        `got ${kitVersion}.`,
    ).toBe(true);
  });

  it("phase4-outdated-audit.md records pnpm audit as clean", () => {
    expect(closure, "closure record must be non-empty").not.toBe("");
    expect(
      closure,
      "closure record must reference `pnpm audit` (the Phase 4 " +
        "smoke-test command per test-strategy §5/§7).",
    ).toMatch(/pnpm\s+audit/);
    // The audit result must be reported as clean — either the
    // literal `0 vulnerabilities`, or `clean`, or `no known
    // vulnerabilities`. Reject "1+ vulnerabilities" stubs.
    const cleanPatterns = [
      /0\s+vulnerabilit/i,
      /\bno\s+vulnerabilit/i,
      /\bclean\b/i,
      /\bvulnerabilities\s*=\s*0\b/i,
      /audit\s+(report\s+)?(passed|succeeded|clean)/i,
    ];
    const hasCleanReport = cleanPatterns.some((p) => p.test(closure));
    expect(
      hasCleanReport,
      "closure record must report `pnpm audit` as clean (0 " +
        "vulnerabilities / no vulnerabilities / clean / passed).",
    ).toBe(true);
    // Negative path: reject stubs that say e.g. "5 vulnerabilities".
    const hasVulnCount = /\b(\d+)\s+vulnerabilit/i.test(closure);
    if (hasVulnCount) {
      const countMatch = closure.match(/\b(\d+)\s+vulnerabilit/i);
      const count = Number(countMatch![1]);
      expect(
        count,
        "if the closure record lists a vulnerability count, it must " +
          "be 0 (clean). Found " +
          count +
          ".",
      ).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Regression guard — the lockfile resolves drizzle-orm to 0.45.x.
// This block is intentionally GREEN at HEAD (Phase 3 owns the
// version-pin regression guard; see
// `drizzle045-phase3-integration-gates.test.ts`). It is included
// here as a same-file cross-reference so Phase 4 cannot close
// without verifying the lockfile state the closure record will
// reference.
// ---------------------------------------------------------------------------

describe("drizzle045-phase4-closure-gates — lockfile cross-reference (regression guard)", () => {
  it("pnpm-lock.yaml resolves drizzle-orm to a 0.45.x version (matches closure record)", () => {
    expect(
      existsSync(LOCKFILE_PATH),
      "pnpm-lock.yaml must exist at the repo root.",
    ).toBe(true);
    const lockfileText = readFileSync(LOCKFILE_PATH, "utf8");
    const lockEntry = lockfileText.match(
      /^\s*\/drizzle-orm@(\d+\.\d+\.\d+)/m,
    );
    expect(
      lockEntry,
      "pnpm-lock.yaml must contain a /drizzle-orm@<version> entry.",
    ).not.toBeNull();
    expect(
      lockEntry![1].startsWith("0.45."),
      `lockfile drizzle-orm is ${lockEntry![1]}, expected 0.45.* ` +
        `(must match the closure record's outdated report).`,
    ).toBe(true);
  });
});
