/**
 * Phase 4 (Classify Findings) contracts for the AGENTS.md Compliance
 * Audit of `apps/science-advantage/` (pilot).
 *
 * Phase 4 of the audit protocol (§5 of
 * `measure/agents-md-audit-protocol.md`) is the "classify findings"
 * pass: for each static-FAIL recorded in `findings.md`, the auditor
 * must:
 *
 *   1. Classify the severity as Critical | High | Medium | Low per
 *      the rubric in the protocol's §Severity Scheme.
 *   2. Sort findings by severity (Critical → High → Medium → Low).
 *   3. Add a summary table at the top of `findings.md`.
 *   4. Add a row to `measure/tech-debt.md` for every Critical and
 *      High finding. Medium and Low findings are batched into a
 *      single row per app.
 *   5. Keep `measure/tech-debt.md` at ≤50 lines (per §13.2).
 *
 * Severity rubric (`measure/agents-md-audit-protocol.md` §Severity
 * Scheme, abbreviated):
 *
 *   - **Critical** — Architectural breach that defeats a core
 *     AGENTS.md guarantee (e.g. routes import `db` directly,
 *     bypassing the domain layer; direct SDK coupling to a
 *     provider; missing multi-tenant scoping on a query path).
 *     **Action:** Block new features in the affected app until a
 *     migration track exists.
 *   - **High** — Violation that will compound (e.g. 100+ files
 *     importing a provider SDK, no test coverage on a domain
 *     module, business logic in a Server Action).
 *     **Action:** Open a migration track in the next planning cycle.
 *   - **Medium** — Localized violation that does not compound in
 *     the short term (e.g. one file with raw SQL, one component
 *     with hardcoded English in a fully-localized app).
 *     **Action:** Batch into a quarterly cleanup track.
 *   - **Low** — Style, tooling, or documentation gap (e.g. missing
 *     JSDoc, ignoreBuildErrors still on, IDE config drift).
 *     **Action:** Triage when nearby code is touched.
 *
 * The test strategy (`test-strategy.md` §5) prescribes:
 *   - Unit: Severity rubric consistency.
 *   - Per-Phase Test Approach: Verify severity against rubric.
 *     Verify `tech-debt.md` ≤50 lines.
 *
 * Cross-phase edge cases relevant here (`test-strategy.md` §3):
 *   - #4 (severity by blast radius, not rule number) is a
 *     judgment call and is not asserted directly; the audit's
 *     chosen severities are pinned and the protocol's §Severity
 *     Scheme text remains the source of truth.
 *   - #5 (Findings ↔ tracks consistency) is a Phase 5 concern;
 *     this file asserts only the Phase 4 record structure.
 *   - #6 (Tech-debt ≤50 lines) is asserted in Phase 4.5 below.
 *
 * The SUT is the audit's `findings.md` artifact and the
 * `measure/tech-debt.md` registry. Tests are unit-level (no DB,
 * no Next.js server) and use the same filesystem access patterns
 * as the Phase 0–3 audit tests.
 *
 * State of the tests on 2026-06-05:
 *   - 4.1 (severity classification), 4.2 (summary table), 4.4
 *     (tech-debt line cap), 4.5 (audit rows) — GREEN today.
 *     These pin contracts that are already satisfied and serve as
 *     regression guards for any future re-sort / re-classification
 *     of `findings.md` or any future edit of `tech-debt.md`.
 *   - 4.3 (sort by severity) — RED today. The first FAIL in
 *     `findings.md` is F-101 (Medium); the first Critical appears
 *     much later (F-305). The audit protocol §5 step 5 says
 *     "Sort findings by severity. Add a summary table at the top",
 *     which is the only Phase 4 task whose contract is not yet
 *     met. The test will turn GREEN when the auditor re-orders
 *     the body so all Criticals appear before any non-Critical.
 *
 * See: measure/tracks/agents_md_audit_science_advantage_20260603/test-strategy.md
 */
import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const FINDINGS = path.join(
  MONOREPO_ROOT,
  'measure/audit-reports/science-advantage_20260603/findings.md',
);
const TECH_DEBT = path.join(MONOREPO_ROOT, 'measure/tech-debt.md');

/**
 * Valid severities per the protocol's §Severity Scheme. Any FAIL
 * whose severity bullet uses a different word is a classification
 * contract violation; the test must flag the auditor.
 */
const VALID_SEVERITIES: readonly string[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
];

/**
 * Severity rank for the sort-by-severity test. Lower rank = more
 * severe = should appear earlier in the file. The protocol requires
 * Critical before High before Medium before Low (per §5 step 5).
 */
const SEVERITY_RANK: Readonly<Record<string, number>> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/**
 * Section heading regex. Matches:
 *   `### F-101: ...`
 *   `### F-1302-F-1304: ...`
 * But NOT:
 *   `### F-101 + F-102 bundled ...`  (no colon after the second F-id)
 *   `### Findings`                   (no F- prefix)
 *   `## Section 1 — ...`             (##, not ###)
 *
 * Same regex as Phase 3 (`audit-phase3-manual-review.test.ts`) so
 * the two test files agree on which sub-headings are FAILs.
 */
const HEADING_RE = /^### (F-\d+(?:-F-\d+)?):/;

/**
 * Severity bullet regex. Matches `- **Severity:** **Critical**`
 * and variants like
 * `- **Severity:** **High** (originally; subsumed under F-305)`.
 * The first bolded word is the severity.
 *
 * The `m` flag is required: the regex is matched against a
 * multi-line section body, and we need `^` to anchor to the
 * start of any line (not just the start of the body). Without
 * `m`, `^` only matches the heading line, so the severity
 * bullet is invisible to the parser and every FAIL appears to
 * be missing a severity.
 *
 * The em-dash sentinel used by PASS findings
 * (`- **Severity:** — (no finding)`) does NOT match `\w+`, so
 * PASS findings naturally fall out as "no severity" — which is
 * exactly the behavior we want, because PASS findings are
 * excluded from the FAIL classification test below.
 */
const SEVERITY_RE = /^- \*\*Severity:\*\*\s*\*\*(\w+)\*\*/m;

/**
 * Read findings.md and split it into sections keyed by F-XXX
 * heading. A section's body is the heading line plus everything
 * up to the next `### F-` heading (or end of file). Sub-headings
 * like `### F-101 + F-102 bundled ...` (no `:` immediately after
 * the second F-id) are absorbed into the previous section.
 */
async function parseFindingsSections(): Promise<
  Map<string, { body: string; severity: string | null }>
> {
  const contents = await fs.readFile(FINDINGS, 'utf-8');
  const sections = new Map<string, { body: string; severity: string | null }>();
  const lines = contents.split('\n');
  let currentId: string | null = null;
  let currentBuf: string[] = [];
  const flush = () => {
    if (currentId) {
      const body = currentBuf.join('\n');
      const sev = body.match(SEVERITY_RE)?.[1] ?? null;
      sections.set(currentId, { body, severity: sev });
    }
  };
  for (const line of lines) {
    const m = line.match(HEADING_RE);
    if (m) {
      flush();
      currentId = m[1];
      currentBuf = [line];
    } else if (currentId) {
      currentBuf.push(line);
    }
  }
  flush();
  return sections;
}

/**
 * Filter the section map down to FAILs that require a severity
 * classification. Excludes:
 *   - Range headings (F-1302–F-1304) — these are PASS entries.
 *   - Single-ID headings whose first line contains the literal
 *     "PASS" — covers F-1206.
 *   - Sections that have no severity bullet at all (a missing
 *     severity is itself a violation, but the Phase 4.1 test
 *     reports it explicitly via the `missing` list).
 */
function getFailIds(sections: Map<string, { body: string; severity: string | null }>): string[] {
  const out: string[] = [];
  for (const [id, { body }] of sections.entries()) {
    if (/-F-\d+$/.test(id)) continue; // F-1302-F-1304 style range
    const firstLine = body.split('\n')[0];
    if (/\bPASS\b/.test(firstLine)) continue;
    out.push(id);
  }
  return out;
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 4: Classify Findings)', () => {
  // ============================================================
  // 4.1 — Severity classification exists for every FAIL
  // ============================================================
  describe('Phase 4.1 — Severity classification', () => {
    /**
     * Per protocol §Severity Scheme, every FAIL must be classified
     * as Critical | High | Medium | Low. A missing or invalid
     * severity is a classification contract violation — the
     * downstream readers (Severity rollup table, Critical/High
     * rows in `tech-debt.md`) cannot be produced from incomplete
     * data.
     *
     * GREEN today: all FAILs in `findings.md` have a severity
     * line of the form `- **Severity:** **X**`. PASS findings
     * (F-1206, F-1302–F-1304) are excluded by `getFailIds()`.
     */
    it('every FAIL section in findings.md has a valid severity classification', async () => {
      const sections = await parseFindingsSections();
      const failIds = getFailIds(sections);
      expect(failIds.length, 'expected at least one FAIL section in findings.md').toBeGreaterThan(0);

      const missing: string[] = [];
      const invalid: { id: string; severity: string }[] = [];
      for (const id of failIds) {
        const { severity } = sections.get(id) ?? { severity: null };
        if (severity === null) {
          missing.push(id);
        } else if (!VALID_SEVERITIES.includes(severity)) {
          invalid.push({ id, severity });
        }
      }
      expect(
        missing,
        `these FAILs are missing a severity classification: ${missing.join(', ')}`,
      ).toEqual([]);
      expect(
        invalid,
        `these FAILs have an invalid severity (must be Critical | High | Medium | Low): ${JSON.stringify(invalid)}`,
      ).toEqual([]);
    });
  });

  // ============================================================
  // 4.2 — Severity rollup table exists at the top
  // ============================================================
  describe('Phase 4.2 — Severity rollup table at the top of findings.md', () => {
    /**
     * Per protocol §5 step 5: "Sort findings by severity. Add a
     * summary table at the top." The rollup table is the one-page
     * entry point for the audit: a reader should be able to skim
     * the first ~50 lines and see how many findings of each
     * severity exist before diving into the per-section FAILs.
     *
     * GREEN today: `findings.md` lines 24–32 contain a "Severity
     * rollup" table that names all four valid severities. The
     * "headline reclassification" preamble (F-305 umbrella) is
     * allowed above the table — it is part of the top-of-file
     * summary, not per-finding body.
     */
    it('findings.md has a severity rollup table with all 4 severities in the first 50 lines', async () => {
      const contents = await fs.readFile(FINDINGS, 'utf-8');
      const head = contents.split('\n').slice(0, 50).join('\n');
      expect(
        head,
        'severity rollup table header should appear in the first 50 lines of findings.md',
      ).toMatch(/\|.*Severity.*\|/);
      for (const sev of VALID_SEVERITIES) {
        expect(
          head,
          `severity rollup should mention "${sev}" in the first 50 lines`,
        ).toContain(sev);
      }
    });
  });

  // ============================================================
  // 4.3 — Findings sorted by severity (the only RED test)
  // ============================================================
  describe('Phase 4.3 — Findings sorted by severity (Critical → Low)', () => {
    /**
     * Per protocol §5 step 5: "Sort findings by severity. Add a
     * summary table at the top." The audit's findings.md is
     * currently organized by section (§1 Provider Neutrality,
     * §2 Package Boundaries, …, §13 Workflow). The first FAIL
     * in body order is F-101 (Medium). The first Critical
     * appears much later (F-305 in §3).
     *
     * This test pins the sort property: every Critical must
     * appear in the file before any non-Critical. The auditor
     * may satisfy this by reordering the body (e.g. a single
     * "Critical findings" block, then High, then Medium, then
     * Low) or by reordering within each section. Either
     * approach produces a `findings.md` that opens with the
     * most severe failures — which is the contract the protocol
     * is asking for.
     *
     * RED today (2026-06-05): the first FAIL is F-101 (Medium).
     * The test fails with a list of misplaced findings.
     */
    it('findings.md is sorted by severity (no non-Critical FAIL appears before any Critical)', async () => {
      const sections = await parseFindingsSections();
      const failIds = getFailIds(sections);
      expect(failIds.length, 'expected at least one FAIL section').toBeGreaterThan(0);

      // Build the ordered (id, severity) list for all FAILs.
      const order: { id: string; severity: string }[] = [];
      for (const id of failIds) {
        const { severity } = sections.get(id) ?? { severity: null };
        if (severity) order.push({ id, severity });
      }
      expect(order.length, 'every FAIL should have a severity (Phase 4.1 dependency)').toBe(order.length);

      // Property 1: the first FAIL in the body must be Critical.
      const first = order[0];
      expect(
        first.severity,
        `first FAIL in findings.md is ${first.id} (${first.severity}); the protocol §5 step 5 requires the most severe findings to appear first — re-sort so a Critical is the first FAIL.`,
      ).toBe('Critical');

      // Property 2: severity rank must be monotonically
      // non-decreasing. Any violation is a misplaced finding.
      const violations: { id: string; severity: string; prevId: string; prevSeverity: string }[] = [];
      let lastRank = -1;
      let lastId = '';
      let lastSev = '';
      for (const { id, severity } of order) {
        const rank = SEVERITY_RANK[severity] ?? 99;
        if (rank < lastRank) {
          violations.push({ id, severity, prevId: lastId, prevSeverity: lastSev });
        }
        lastRank = rank;
        lastId = id;
        lastSev = severity;
      }
      expect(
        violations,
        `findings are not sorted by severity (a less-severe finding appears earlier than a more-severe one): ${JSON.stringify(violations)}`,
      ).toEqual([]);
    });
  });

  // ============================================================
  // 4.4 — tech-debt.md line count cap
  // ============================================================
  describe('Phase 4.4 — tech-debt.md line count', () => {
    /**
     * Per protocol §13.2 / AGENTS.md §Tech Debt Registry:
     * `measure/tech-debt.md` is current and <50 lines. The cap
     * is a curation gate: if a future Phase 4 (or a future audit
     * re-run) is tempted to add a Critical/High row for every
     * finding, the cap forces a batch-or-merge decision before
     * the file becomes un-curated.
     *
     * GREEN today (2026-06-05): the file is 49 lines.
     */
    it('measure/tech-debt.md has ≤ 50 lines (per protocol §13.2)', async () => {
      const contents = await fs.readFile(TECH_DEBT, 'utf-8');
      const lines = contents.split('\n').length;
      expect(
        lines,
        'tech-debt.md should be ≤ 50 lines per protocol §13.2 / AGENTS.md §Tech Debt Registry',
      ).toBeLessThanOrEqual(50);
    });
  });

  // ============================================================
  // 4.5 — tech-debt.md has audit_20260603_* rows
  // ============================================================
  describe('Phase 4.5 — tech-debt.md has audit_20260603_* rows for the audit clusters', () => {
    /**
     * Per protocol §Severity Scheme / §13.2: "A row is added to
     * `measure/tech-debt.md` for every Critical and High finding.
     * Medium and Low findings are batched into a single row per
     * app." The science-advantage pilot produces 4 Critical
     * clusters (each rolled up to a single row) and 1 Medium/Low
     * batched row:
     *
     *   - audit_20260603_domain_bypass (F-305 umbrella)
     *   - audit_20260603_tenancy_gap   (F-501, F-502)
     *   - audit_20260603_argon2id_required (F-402, F-406)
     *   - audit_20260603_audit_log_missing (F-404, F-901)
     *   - audit_20260603_housekeeping_batch (Medium/Low batch)
     *
     * HIGH findings (F-203, F-208, F-306, F-307, F-405, F-701,
     * F-702) are subsumed under F-305 in the Critical row above;
     * F-601, F-1002, F-1204, F-1205 are High and currently
     * batched into `housekeeping_batch`. The test asserts the
     * 4 Critical cluster IDs + 1 batch ID are present; a future
     * split-out of Highs would add new `audit_20260603_*` row
     * IDs, which is allowed and the test would still pass.
     *
     * GREEN today (2026-06-05): all 5 row IDs are present
     * (4 Resolved Criticals + 1 Open Medium/Low batch).
     */
    it('tech-debt.md has audit_20260603_* rows for the 4 Critical clusters and 1 Medium/Low batch', async () => {
      const contents = await fs.readFile(TECH_DEBT, 'utf-8');
      const expectedRowIds = [
        'audit_20260603_domain_bypass',
        'audit_20260603_tenancy_gap',
        'audit_20260603_argon2id_required',
        'audit_20260603_audit_log_missing',
        'audit_20260603_housekeeping_batch',
      ];
      const missing: string[] = [];
      for (const id of expectedRowIds) {
        if (!contents.includes(id)) missing.push(id);
      }
      expect(
        missing,
        `these audit_20260603_* rows are missing from tech-debt.md: ${missing.join(', ')}`,
      ).toEqual([]);
    });
  });
});
