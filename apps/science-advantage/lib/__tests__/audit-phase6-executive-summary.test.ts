/**
 * Phase 6 (Executive Summary) contracts for the AGENTS.md Compliance
 * Audit of `apps/science-advantage/` (pilot).
 *
 * Phase 6 of the audit protocol (`measure/agents-md-audit-protocol.md`
 * §"Audit Procedure" step 4) is the "executive summary" pass: a
 * one-page sign-off artifact that lets a reader skim the audit in
 * under a minute and decide what to fund next. The protocol's
 * required fields are explicit:
 *
 *   > 4. `executive-summary.md` — one-page summary: total rules,
 *   > % pass, top 5 risks, recommended next 3 tracks
 *
 * The Phase 6 plan tasks restate the same contract:
 *
 *   - Write `executive-summary.md`: total rules, % pass, top 5 risks,
 *     recommended next 3 tracks.
 *   - Cross-link from `measure/index.md`.
 *
 * The test strategy (`test-strategy.md` §1 / §5) prescribes:
 *
 *   | 6: Summary | Counts match findings.md | — | — |
 *   > Phase 6–8: Verify summary counts match findings.
 *   > Verify `tracks.md` section exists.
 *
 * This file pins five structural contracts so that any future
 * rewrite of `executive-summary.md` (or a future re-audit of a
 * different app following this protocol) keeps the four protocol
 * fields and the cross-link discoverable:
 *
 *   6.1 — `executive-summary.md` exists and is non-empty.
 *   6.2 — The executive summary names the audit scope (section
 *         count or rule count) and a numeric pass percentage so a
 *         reader can answer "how much was checked?" and "how much
 *         passed?" in one glance.
 *   6.3 — Severity rollup counts in the executive summary match
 *         the actual count of FAIL sections in `findings.md` by
 *         severity. A stale rollup defeats the executive summary's
 *         purpose (a reader cannot trust the headline numbers if
 *         they drift from the underlying findings).
 *   6.4 — "Top 5 risks" section exists and lists exactly 5
 *         risks. The protocol literally says "top 5 risks"; the
 *         current artifact says "Top 3 risks" which is a Phase 6
 *         contract gap.
 *   6.5 — "Recommended next 3 tracks" are explicitly identified
 *         (by track id, track number, or named title), aligning
 *         with `migration-tracks.md` priority order. The protocol
 *         literally says "recommended next 3 tracks".
 *   6.6 — `measure/index.md` cross-links to the audit report
 *         directory or the executive-summary file itself, so a
 *         reader walking the project index can discover the
 *         audit deliverable without scanning `measure/tracks.md`.
 *   6.7 — Cross-check that the executive summary references the
 *         12-track migration plan and that `measure/tracks.md`
 *         retains the "Pending Tracks — Audit Findings" section
 *         from Phase 5 (the executive summary cites tracks by id,
 *         which must remain resolvable).
 *
 * The SUT is the audit's `executive-summary.md` artifact plus the
 * `measure/index.md` registry. Tests are unit-level (no DB, no
 * Next.js server) and use the same filesystem access patterns as
 * the Phase 0–5 audit tests.
 *
 * State of the tests on 2026-06-05 (Red phase):
 *   - 6.1 (existence + non-empty)            — GREEN today.
 *   - 6.2 (scope + % pass mentioned)         — GREEN today (scorecard
 *     header includes "13 sections, 80+ checks" and a 49% Total row).
 *   - 6.3 (severity counts match findings)   — RED today. Executive
 *     summary's severity rollup says 6 Critical / 9 High / 11 Medium /
 *     19 Low (45 total). `findings.md` after the Phase 4 re-sort has
 *     10 Critical / 12 High / 17 Medium / 18 Low (57 total). The
 *     rollup was written before the Phase 4 reclassification pass and
 *     has not been refreshed.
 *   - 6.4 (Top 5 risks section)              — RED today. The artifact
 *     uses a `## Top 3 risks` heading and lists 3 risks. The protocol
 *     mandates 5.
 *   - 6.5 (Recommended next 3 tracks)        — RED today. The
 *     `## What to do next` section recommends "Tracks 1–4 (Critical)"
 *     which is 4 tracks. The protocol mandates a 3-track recommendation.
 *   - 6.6 (index.md cross-link)              — RED today. `measure/index.md`
 *     references `agents-md-audit-protocol.md` but not the audit report
 *     directory or `executive-summary.md`. Phase 6 plan task 2 explicitly
 *     calls out the cross-link.
 *   - 6.7 (migration plan cross-reference)   — GREEN today (12 tracks
 *     enumerated; `Pending Tracks — Audit Findings` heading present).
 *
 * The four RED tests turn GREEN once the auditor:
 *   (a) Refreshes the severity rollup counts to match `findings.md`.
 *   (b) Renames `## Top 3 risks` to `## Top 5 risks` and adds 2 more risks
 *       (e.g. domain-layer dead code, no audit log infra, CI tsc skip).
 *   (c) Rewrites "Tracks 1–4" as a clear 3-track recommendation
 *       (`Track 1 + Track 2 + Track 3`) or surfaces Tracks 1–3 in
 *       a distinct "Recommended next 3 tracks" section.
 *   (d) Adds a bullet in `measure/index.md` under "Plans" (or a
 *       new "Audit Reports" section) linking to
 *       `./audit-reports/science-advantage_20260603/executive-summary.md`.
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

const AUDIT_REPORT_DIR = path.join(
  MONOREPO_ROOT,
  'measure/audit-reports/science-advantage_20260603',
);
const EXEC_SUMMARY = path.join(AUDIT_REPORT_DIR, 'executive-summary.md');
const FINDINGS = path.join(AUDIT_REPORT_DIR, 'findings.md');
const MIGRATION_TRACKS = path.join(AUDIT_REPORT_DIR, 'migration-tracks.md');
const TRACKS_REGISTRY = path.join(MONOREPO_ROOT, 'measure/tracks.md');
const INDEX_MD = path.join(MONOREPO_ROOT, 'measure/index.md');

/**
 * Valid severities for the rollup-match test. Identical to the set
 * used by `audit-phase4-classify-findings.test.ts`; keep these
 * lists in sync if the protocol ever extends the severity scheme.
 */
const VALID_SEVERITIES: readonly ('Critical' | 'High' | 'Medium' | 'Low')[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
];

/**
 * Heading regex for a FAIL finding section in `findings.md`. Same
 * regex as `audit-phase3-manual-review.test.ts` and
 * `audit-phase4-classify-findings.test.ts` — the three Phase 3 /
 * 4 / 6 contracts must agree on which sub-headings count as FAILs.
 */
const HEADING_RE = /^### (F-\d+(?:-F-\d+)?):/;

/**
 * Severity bullet regex (multi-line). Matches
 * `- **Severity:** **Critical**` and the variants that append
 * parenthesized notes such as
 * `- **Severity:** **High** (originally; subsumed under F-305)`.
 * The first bolded word after the colon is the severity.
 */
const SEVERITY_RE = /^- \*\*Severity:\*\*\s*\*\*(\w+)\*\*/m;

/**
 * Count the actual FAIL sections in `findings.md` by severity. PASS
 * findings (e.g. F-1206, F-1302–F-1304) are excluded because they
 * carry no severity bullet — they use the em-dash sentinel
 * `- **Severity:** — (no finding)` which `SEVERITY_RE` rejects.
 *
 * Returns a record keyed by severity name with the count of FAIL
 * sections of that severity. This is the source-of-truth count that
 * the executive summary's rollup table must match.
 */
async function countFailsBySeverity(): Promise<Record<string, number>> {
  const contents = await fs.readFile(FINDINGS, 'utf-8');
  const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const lines = contents.split('\n');
  let currentId: string | null = null;
  let currentBuf: string[] = [];
  const flush = () => {
    if (currentId) {
      const body = currentBuf.join('\n');
      const sev = body.match(SEVERITY_RE)?.[1];
      if (sev && VALID_SEVERITIES.includes(sev as (typeof VALID_SEVERITIES)[number])) {
        counts[sev]++;
      }
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
  return counts;
}

/**
 * Parse the severity rollup table in `executive-summary.md` and
 * return one count per severity. The rollup table is a Markdown
 * table whose rows look like
 *   `| Critical | 6 | F-305 (...) |`
 * with optional leading whitespace and the bolded variant
 *   `| **Critical** | **6** | ... |`.
 *
 * Returns `null` for a severity that does not appear in the table
 * so the assertion can report "missing row" separately from
 * "wrong count".
 */
async function parseExecSummarySeverityCounts(): Promise<
  Record<string, number | null>
> {
  const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
  const out: Record<string, number | null> = {
    Critical: null,
    High: null,
    Medium: null,
    Low: null,
  };
  for (const sev of VALID_SEVERITIES) {
    // Match: `| Critical | 6 | ...` OR `| **Critical** | **6** | ...`.
    // Anchor on the literal severity word at the start of a table
    // cell so the regex does not accidentally pick up a mention
    // in the prose body (e.g. "Critical findings").
    const cellRe = new RegExp(
      `^\\|\\s*\\*{0,2}${sev}\\*{0,2}\\s*\\|\\s*\\*{0,2}(\\d+)\\*{0,2}\\s*\\|`,
      'm',
    );
    const match = contents.match(cellRe);
    if (match) out[sev] = Number(match[1]);
  }
  return out;
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 6: Executive Summary)', () => {
  // ============================================================
  // 6.1 — executive-summary.md exists and is non-empty
  // ============================================================
  describe('Phase 6.1 — executive-summary.md exists', () => {
    /**
     * The executive summary is the headline artifact a reviewer
     * reads before any per-finding detail. If it is missing or
     * empty the entire Phase 6 deliverable is missing.
     *
     * GREEN today: the file exists at the expected path with
     * non-zero size.
     */
    it('executive-summary.md exists at the expected path', async () => {
      const stat = await fs.stat(EXEC_SUMMARY);
      expect(stat.isFile()).toBe(true);
    });

    it('executive-summary.md is non-empty', async () => {
      const stat = await fs.stat(EXEC_SUMMARY);
      expect(
        stat.size,
        'executive-summary.md exists but is empty — Phase 6 task 1 has not produced its deliverable',
      ).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 6.2 — Total rules and % pass are stated
  // ============================================================
  describe('Phase 6.2 — Total rules and % pass headline', () => {
    /**
     * Per protocol §"Audit Procedure" step 4, the executive
     * summary's first two required fields are "total rules" and
     * "% pass". The summary must surface both as scannable
     * headline numbers so a reader can answer "how much was
     * checked" and "how much passed" without reading the
     * scorecard row-by-row.
     *
     * "Total rules" is parsed as any 2+ digit integer near the
     * keywords "rules", "checks", or "sections" — the protocol's
     * wording is loose ("(13 sections, 80+ checks)") so the
     * assertion is intentionally permissive. The "% pass" check
     * accepts any `\d+%` token; the auditor may choose between
     * total %, weighted %, or PASS/(PASS+FAIL) — all are valid.
     *
     * GREEN today: the artifact's preamble says
     * "13 sections, 80+ checks" and the scorecard Total row
     * shows "49%".
     */
    it('executive-summary.md mentions the total rule/section/check count', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Match e.g. "13 sections", "80+ checks", "59 rules" etc.
      expect(
        contents,
        'executive-summary.md should state the total rules / sections / checks audited so a reader knows the scope',
      ).toMatch(/\b\d{2,}\+?\s+(rules?|checks?|sections?)\b/i);
    });

    it('executive-summary.md states an overall pass percentage', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      expect(
        contents,
        'executive-summary.md should state an overall pass percentage (e.g. "49%") so a reader can grade the app at a glance',
      ).toMatch(/\b\d{1,3}%\B|\b\d{1,3}%\s/);
    });
  });

  // ============================================================
  // 6.3 — Severity rollup counts match findings.md (RED today)
  // ============================================================
  describe('Phase 6.3 — Severity rollup counts match findings.md', () => {
    /**
     * Per `test-strategy.md` §1 (Phase 6 row: "Counts match
     * findings.md") and §5 ("Verify summary counts match
     * findings"). The executive summary's severity rollup table
     * is a derivative of `findings.md`; if the two drift, the
     * executive summary is lying to its reader.
     *
     * The "source of truth" is the per-section severity bullet
     * in `findings.md` (parsed by `countFailsBySeverity()`),
     * the same parser used by Phase 4 contracts. After Phase 4's
     * re-sort (2026-06-05 commit `a9c2666`), the counts are:
     *   Critical: 10, High: 12, Medium: 17, Low: 18 (total 57)
     *
     * RED today (2026-06-05): the executive summary's rollup
     * still records the pre-reclassification counts
     * (Critical: 6, High: 9, Medium: 11, Low: 19, total 45).
     * Drift = 5 missing Critical findings + 3 missing High +
     * 6 missing Medium + 1 over-counted Low. The auditor must
     * refresh the rollup to match the canonical `findings.md`.
     */
    it('executive-summary.md severity rollup has a row for each of Critical / High / Medium / Low', async () => {
      const exec = await parseExecSummarySeverityCounts();
      const missing: string[] = [];
      for (const sev of VALID_SEVERITIES) {
        if (exec[sev] === null) missing.push(sev);
      }
      expect(
        missing,
        `executive-summary.md severity rollup is missing rows for: ${missing.join(', ')}. The rollup must have one row per severity (Critical, High, Medium, Low) with a numeric count.`,
      ).toEqual([]);
    });

    it('executive-summary.md severity rollup counts equal the FAIL counts in findings.md', async () => {
      const actual = await countFailsBySeverity();
      const exec = await parseExecSummarySeverityCounts();

      // Sanity: findings.md must have at least one FAIL of each
      // severity for the contract to be meaningful (this audit
      // produces all four).
      for (const sev of VALID_SEVERITIES) {
        expect(
          actual[sev],
          `findings.md should have at least 1 FAIL of severity ${sev} (got ${actual[sev]})`,
        ).toBeGreaterThan(0);
      }

      const mismatches: { severity: string; execSummary: number | null; findings: number }[] = [];
      for (const sev of VALID_SEVERITIES) {
        if (exec[sev] !== actual[sev]) {
          mismatches.push({ severity: sev, execSummary: exec[sev], findings: actual[sev] });
        }
      }
      expect(
        mismatches,
        `executive-summary.md severity rollup is out of sync with findings.md.\n` +
          `Refresh the rollup table to match findings.md by severity:\n` +
          mismatches
            .map(
              (m) =>
                `  ${m.severity}: exec-summary says ${m.execSummary}, findings.md actually has ${m.findings}`,
            )
            .join('\n'),
      ).toEqual([]);
    });
  });

  // ============================================================
  // 6.4 — Top 5 risks section (RED today)
  // ============================================================
  describe('Phase 6.4 — Top 5 risks section', () => {
    /**
     * Per protocol §"Audit Procedure" step 4: "top 5 risks". A
     * 3-risk list (the current artifact) elides 2 risks that
     * leadership needs to see. The fix is mechanical: rename
     * the heading from `## Top 3 risks` to `## Top 5 risks`
     * and add 2 more risks (candidates from the Critical
     * findings: F-305 domain bypass / F-404+F-901 audit log
     * gap / F-1001 ignoreBuildErrors / etc.).
     *
     * RED today (2026-06-05): the artifact's heading is
     * `## Top 3 risks` and lists 3 numbered items. The
     * heading-name assertion catches the naming gap; the
     * item-count assertion catches the still-undercount case
     * where the auditor renames the heading but only adds 4
     * (or fewer) risks.
     */
    it('executive-summary.md has a "Top 5 risks" section heading', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Accept any heading level (`## Top 5 risks`, `### Top 5 risks`)
      // and tolerate minor wording ("Top 5 risks", "Top 5 Risks",
      // "5 top risks") but require the literal digit `5`.
      expect(
        contents,
        'executive-summary.md should have a "Top 5 risks" section (the protocol mandates "top 5 risks", not 3 or 4).',
      ).toMatch(/^#{1,6}\s+Top\s+5\s+risks\b/im);
    });

    it('executive-summary.md "Top 5 risks" section lists exactly 5 risks', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Slice from the "Top 5 risks" heading to the next `##` (or
      // `###`) heading; count enumerated items inside that slice.
      const startMatch = contents.match(/^#{1,6}\s+Top\s+5\s+risks\b.*$/im);
      expect(
        startMatch,
        '"Top 5 risks" heading not found — cannot count items. (Phase 6.4.a should fail first.)',
      ).not.toBeNull();
      const startIdx = startMatch ? contents.indexOf(startMatch[0]) : 0;
      const tail = contents.slice(startIdx + (startMatch?.[0].length ?? 0));
      const endMatch = tail.match(/^#{1,6}\s+/m);
      const section = endMatch ? tail.slice(0, endMatch.index) : tail;

      // Count enumerated items at the start of a line: `1.`, `2.`,
      // `3.`, etc. Bulleted lists (`- ` or `* `) also count.
      const numberedItems = (section.match(/^\s*\d+\.\s+\S/gm) ?? []).length;
      const bulletedItems = (section.match(/^\s*[-*]\s+\S/gm) ?? []).length;
      const itemCount = Math.max(numberedItems, bulletedItems);

      expect(
        itemCount,
        `"Top 5 risks" section should list exactly 5 risks; found ${itemCount}. Add or remove items to match the protocol's "top 5 risks" mandate.`,
      ).toBe(5);
    });
  });

  // ============================================================
  // 6.5 — Recommended next 3 tracks (RED today)
  // ============================================================
  describe('Phase 6.5 — Recommended next 3 tracks', () => {
    /**
     * Per protocol §"Audit Procedure" step 4 ("recommended next
     * 3 tracks") and step 7 ("Share `executive-summary.md` +
     * top 3 proposed tracks"). The artifact must call out
     * exactly 3 tracks as the next-up recommendation so the
     * reader knows what to fund first. A "Tracks 1–4 (Critical)"
     * recommendation (the current artifact) gives the reader 4
     * tracks; "the 12 proposed migration tracks" gives 12 — both
     * fail the 3-track contract.
     *
     * The contract is satisfied by either:
     *   (a) A discrete `Recommended next 3 tracks` section
     *       (heading-anchored, like `## Top 5 risks`), or
     *   (b) Any sentence/bullet that names exactly 3 track ids
     *       (or 3 track numbers) as the recommendation under a
     *       `What to do next` / `Recommendations` / equivalent
     *       heading.
     *
     * RED today (2026-06-05): the `## What to do next` section
     * names "Tracks 1–4 (Critical)" — 4 tracks, not 3. The
     * artifact also lists all 12 migration tracks but never
     * isolates a 3-track recommendation.
     */
    it('executive-summary.md has a "Recommended next 3 tracks" section (or equivalent 3-track heading)', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Accept several wordings: "Recommended next 3 tracks",
      // "Next 3 tracks", "Top 3 tracks", "Top 3 recommended
      // tracks". Anchor on the literal digit `3` to rule out
      // the "4 Critical tracks" wording.
      expect(
        contents,
        'executive-summary.md should have a heading naming "3 tracks" as the recommended next slice (the protocol mandates "recommended next 3 tracks").',
      ).toMatch(/^#{1,6}\s+(?:Recommended\s+next|Next|Top)\s+3\s+(?:proposed\s+|recommended\s+)?tracks?\b/im);
    });

    it('executive-summary.md names 3 distinct track ids in the recommendation section', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Find a heading whose text contains "3 tracks" and walk to
      // the next heading; collect track ids that appear in that
      // slice. Track ids follow the pattern `<word>_..._YYYYMMDD`.
      const startMatch = contents.match(/^#{1,6}\s+.*3\s+(?:proposed\s+|recommended\s+)?tracks?\b.*$/im);
      expect(
        startMatch,
        'No heading matching "3 tracks" found — cannot extract recommended-track ids. (Phase 6.5.a should fail first.)',
      ).not.toBeNull();
      const startIdx = startMatch ? contents.indexOf(startMatch[0]) : 0;
      const tail = contents.slice(startIdx + (startMatch?.[0].length ?? 0));
      const endMatch = tail.match(/^#{1,6}\s+/m);
      const section = endMatch ? tail.slice(0, endMatch.index) : tail;

      // Collect unique track ids of the form `<slug>_20260603`.
      // Restrict to the dated suffix so the regex does not
      // accidentally pick up generic words like
      // `app_domain_migration` without the date.
      const ids = new Set<string>();
      const idRe = /\b([a-z][a-z0-9_]*_20\d{6})\b/g;
      let m: RegExpExecArray | null;
      while ((m = idRe.exec(section)) !== null) {
        ids.add(m[1]);
      }
      expect(
        ids.size,
        `Recommended-next section should name exactly 3 distinct track ids (e.g. app_domain_migration_20260603); found ${ids.size}: ${[...ids].join(', ') || '(none)'}.`,
      ).toBe(3);
    });
  });

  // ============================================================
  // 6.6 — measure/index.md cross-link (RED today)
  // ============================================================
  describe('Phase 6.6 — measure/index.md cross-links to the audit report', () => {
    /**
     * Per Phase 6 plan task 2 ("Cross-link from `measure/index.md`")
     * and the universal File Resolution Protocol (Measure skill
     * §Core Concepts). `measure/index.md` is the canonical entry
     * point; a deliverable that is not linked from the index is
     * effectively invisible to anyone who finds the project via
     * the index rather than via `tracks.md`.
     *
     * Acceptable link forms (any one is sufficient):
     *   - Direct link to `executive-summary.md`.
     *   - Link to the audit report directory
     *     (`./audit-reports/science-advantage_20260603/`).
     *   - Link to a "Audit Reports" registry page that itself
     *     links to the directory.
     *
     * RED today (2026-06-05): `measure/index.md` references
     * `agents-md-audit-protocol.md` (the protocol) but not the
     * pilot's deliverables. The audit's outputs are discoverable
     * only via `measure/tracks.md`, which is not how a fresh
     * reader walks the project.
     */
    it('measure/index.md links to the audit report (directory or executive-summary.md)', async () => {
      const contents = await fs.readFile(INDEX_MD, 'utf-8');
      // Accept either the directory link or a direct file link.
      // Both relative (`./audit-reports/...`) and rooted
      // (`measure/audit-reports/...`) styles are valid.
      const directoryLink = /audit-reports\/science-advantage_20260603\/?/.test(contents);
      const fileLink = /audit-reports\/science-advantage_20260603\/executive-summary\.md/.test(
        contents,
      );
      expect(
        directoryLink || fileLink,
        'measure/index.md should link to ./audit-reports/science-advantage_20260603/ or to executive-summary.md within it. Add a bullet (e.g. under "Plans" or a new "Audit Reports" section).',
      ).toBe(true);
    });
  });

  // ============================================================
  // 6.7 — Cross-references to the 12-track migration plan
  // ============================================================
  describe('Phase 6.7 — Migration plan cross-reference (sanity)', () => {
    /**
     * Per protocol §"Audit Procedure" step 7: "Share
     * `executive-summary.md` + top 3 proposed tracks". The
     * executive summary must point a reader to the full
     * migration plan so the 3-track recommendation can be
     * expanded to the 12-track plan if leadership wants the
     * complete picture.
     *
     * Cross-check that `measure/tracks.md` still has the
     * "Pending Tracks — Audit Findings" section that Phase 5
     * added. The executive summary cites tracks by id; if the
     * registry section is missing those ids become broken
     * references.
     *
     * GREEN today (2026-06-05): the executive summary's
     * "12 proposed migration tracks" table enumerates all 12
     * tracks, and `measure/tracks.md` line 55 has the
     * `#### Pending Tracks — Audit Findings (science-advantage,
     * 2026-06-03)` heading from Phase 5.
     */
    it('executive-summary.md references migration-tracks.md or names ≥12 track ids', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      const referencesMigrationTracks = /migration-tracks\.md/.test(contents);
      const trackIdCount = new Set(contents.match(/\b[a-z][a-z0-9_]*_20\d{6}\b/g) ?? []).size;
      expect(
        referencesMigrationTracks || trackIdCount >= 12,
        `executive-summary.md must either link to migration-tracks.md or name ≥12 distinct track ids (found ${trackIdCount}). The full migration plan is the audit's actionable deliverable; the summary must surface it.`,
      ).toBe(true);
    });

    it('measure/tracks.md retains the "Pending Tracks — Audit Findings" section from Phase 5', async () => {
      const contents = await fs.readFile(TRACKS_REGISTRY, 'utf-8');
      expect(
        contents,
        'measure/tracks.md should still have the "Pending Tracks — Audit Findings (science-advantage, 2026-06-03)" sub-heading from Phase 5. The executive summary cites tracks by id; the registry section is what makes those ids resolvable.',
      ).toContain('Pending Tracks — Audit Findings (science-advantage, 2026-06-03)');
    });

    it('migration-tracks.md exists (cross-link target sanity)', async () => {
      const stat = await fs.stat(MIGRATION_TRACKS);
      expect(stat.isFile()).toBe(true);
    });
  });
});
