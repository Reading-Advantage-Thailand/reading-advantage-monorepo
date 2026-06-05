/**
 * Phase 7 (Present to user) contracts for the AGENTS.md Compliance
 * Audit of `apps/science-advantage/` (pilot).
 *
 * Phase 7 of the audit protocol (`measure/agents-md-audit-protocol.md`
 * §"Audit Procedure" step 9) is the "present to user" pass: share the
 * executive summary with the top 3 proposed tracks, wait for sign-off,
 * and capture any protocol refinements surfaced by the pilot. The
 * protocol says:
 *
 *   > 9. Present to user
 *   >    - Share `executive-summary.md` + top 3 proposed tracks.
 *   >      Wait for sign-off before opening track tickets.
 *
 * The Phase 7 plan tasks restate the same contract:
 *
 *   - Share `executive-summary.md` + top 3 proposed tracks.
 *   - Wait for sign-off before opening track tickets.
 *   - Capture protocol refinements in `agents-md-audit-protocol.md`
 *     §"Open Questions" → §"Maintenance".
 *
 * The test strategy (`test-strategy.md` §1) flags Phases 7–8 as
 * "N/A" for unit tests because they are presentation / archival steps
 * with no executable behavior. The Red-phase contract tests below
 * deliberately pin only the *audit-trail* contracts of Phase 7 — the
 * evidence a future re-audit needs to confirm the pilot actually
 * completed the protocol's "present" step before archiving. They do
 * not test the human action of "presenting"; they pin the artifacts
 * that prove the presentation happened.
 *
 * Contracts pinned by this file:
 *
 *   7.1 — Sign-off gate: the audit track is still in an active,
 *         awaiting-sign-off state. The pilot has not been
 *         prematurely archived. (Track `metadata.json#status` is
 *         `active`; the plan still lists Phase 7 as in-progress.)
 *   7.2 — "Share" marker: `executive-summary.md` records that the
 *         summary was prepared for review (e.g. a "Distribution",
 *         "Reviewers", "Sign-off requested", or equivalent
 *         date-stamped line). The pilot's "Sign-off line" alone is
 *         the deliverable's *content*; a "Share / Sign-off
 *         requested" line is the *audit trail* of the act of
 *         presenting it.
 *   7.3 — Top 3 proposed tracks: the share artifact (i.e. the
 *         "Recommended next 3 tracks" section in the executive
 *         summary) names exactly 3 distinct track ids. (Sanity
 *         cross-check against Phase 6.5.)
 *   7.4 — Open Questions are status-annotated: each of the four
 *         Open Questions in the protocol now carries a
 *         `**Status:** OPEN | RESOLVED | DEFERRED` annotation,
 *         because the pilot surfaced concrete decisions that the
 *         next protocol iteration must respect.
 *   7.5 — Resolved refinements are mirrored in Maintenance: at
 *         least one Open Question has been resolved by the pilot
 *         and the resolution is mirrored in §"Maintenance" with a
 *         `Resolved: YYYY-MM-DD` date and a one-line summary.
 *   7.6 — Pilot's "Per-rule weights" decision is captured: the
 *         changelog records that the user chose pass/fail only on
 *         2026-06-03. That decision must be captured in the
 *         protocol (not only the changelog) so a future auditor
 *         does not relitigate it.
 *
 * The SUT is the audit's `executive-summary.md` artifact, the
 * `measure/agents-md-audit-protocol.md` "Open Questions" and
 * "Maintenance" sections, and the track's `metadata.json#status`.
 * Tests are unit-level (no DB, no Next.js server) and use the same
 * filesystem access patterns as the Phase 0–6 audit tests.
 *
 * State of the tests on 2026-06-05 (Red phase):
 *   - 7.1 (sign-off gate)                       — GREEN today.
 *   - 7.2 ("Share" / "Sign-off requested" line) — RED today.
 *     The executive summary has a `**Sign-off line:**` paragraph
 *     (the deliverable's *content*) but no `**Sign-off requested:**`
 *     or `**Distribution:**` line (the *audit trail* of the
 *     present step).
 *   - 7.3 (Top 3 proposed tracks by id)          — GREEN today
 *     (Phase 6.5 contract is satisfied; this is a smoke
 *     cross-check).
 *   - 7.4 (Open Questions have **Status:**)     — RED today. All
 *     four Open Questions are bare `[ ]` checkboxes with no
 *     status annotation.
 *   - 7.5 (Maintenance has resolved entry)      — RED today. The
 *     §"Maintenance" section is a single paragraph about how the
 *     protocol is living documentation; no resolved items are
 *     mirrored.
 *   - 7.6 ("Per-rule weights" is RESOLVED)       — RED today. The
 *     decision lives in the Changelog ("Per the user's choice on
 *     2026-06-03…") but the Open Question bullet is still bare.
 *
 * The four RED tests turn GREEN once the auditor:
 *   (a) Adds a `**Sign-off requested:** YYYY-MM-DD — reviewers:
 *       <list>` line (or equivalent `**Distribution:**` /
 *       `**Reviewers:**` marker) to `executive-summary.md`.
 *   (b) Annotates each Open Question with `**Status:**` (RESOLVED
 *       for "Per-rule weights"; OPEN for the remaining three; or
 *       the auditor's pilot decisions).
 *   (c) Mirrors the resolved items into §"Maintenance" with a
 *       `Resolved: 2026-06-05` line and a one-line resolution
 *       summary.
 *   (d) Optionally promotes a "## Resolved refinements (pilot
 *       2026-06-03)" subsection under Maintenance for clarity.
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
const PROTOCOL = path.join(MONOREPO_ROOT, 'measure/agents-md-audit-protocol.md');
const TRACK_METADATA = path.join(
  MONOREPO_ROOT,
  'measure/tracks/agents_md_audit_science_advantage_20260603/metadata.json',
);
const TRACK_PLAN = path.join(
  MONOREPO_ROOT,
  'measure/tracks/agents_md_audit_science_advantage_20260603/plan.md',
);

/**
 * The four Open Questions listed in `measure/agents-md-audit-protocol.md`
 * §"Open Questions" as of v1.1 (2026-06-03). Each bullet's leading bolded
 * noun-phrase is the canonical title. The mapping below is the source of
 * truth for the Phase 7.4 / 7.5 / 7.6 contracts: if the protocol ever adds
 * or renames an Open Question, update this list to match.
 */
const OPEN_QUESTION_TITLES: readonly string[] = [
  'Re-audit trigger',
  'Coverage threshold',
  'Per-rule weights',
  'App-specific deviations',
];

/**
 * Read the protocol file and return the slice of text covered by the
 * §"Open Questions" section (between its `^# Open Questions` heading and
 * the next `^# ` heading). Used to keep the per-question status regex
 * anchored to the Open Questions section, not the prose body of the
 * document.
 */
async function readOpenQuestionsSection(): Promise<string> {
  const contents = await fs.readFile(PROTOCOL, 'utf-8');
  const headingRe = /^# Open Questions\b.*$/m;
  const start = contents.match(headingRe);
  if (!start) return '';
  const startIdx = contents.indexOf(start[0]);
  const tail = contents.slice(startIdx + start[0].length);
  // End of section = next `^# ` (or `^## `) heading, or EOF. The
  // §"Maintenance" heading is the next sibling, so this stops there.
  const endRe = /^#{1,6}\s+(?!\s)/m;
  const end = tail.match(endRe);
  return end ? tail.slice(0, end.index) : tail;
}

/**
 * Read the protocol file and return the slice of text covered by the
 * §"Maintenance" section. Mirrors `readOpenQuestionsSection` and is
 * used by Phase 7.5 to keep the resolved-refinements regex anchored
 * to the right region of the document.
 */
async function readMaintenanceSection(): Promise<string> {
  const contents = await fs.readFile(PROTOCOL, 'utf-8');
  const headingRe = /^# Maintenance\b.*$/m;
  const start = contents.match(headingRe);
  if (!start) return '';
  const startIdx = contents.indexOf(start[0]);
  const tail = contents.slice(startIdx + start[0].length);
  // The protocol may end after Maintenance (no further `^# ` heading),
  // or have a `^# ` heading after — handle both.
  const endRe = /^#{1,6}\s+(?!\s)/m;
  const end = tail.match(endRe);
  return end ? tail.slice(0, end.index) : tail;
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 7: Present to user)', () => {
  // ============================================================
  // 7.1 — Sign-off gate: track is active, awaiting sign-off
  // ============================================================
  describe('Phase 7.1 — Sign-off gate', () => {
    /**
     * The pilot's Phase 7 work is the *presentation* of the audit
     * for sign-off. The track's `metadata.json#status` must remain
     * `active` while the audit is awaiting sign-off — flipping it
     * to `complete` (or any terminal state) would mark Phase 8
     * work as done prematurely and skip the sign-off gate.
     *
     * GREEN today: `metadata.json#status = "active"`.
     */
    it('track metadata.json status is "active" (not "complete" or "archived")', async () => {
      const contents = await fs.readFile(TRACK_METADATA, 'utf-8');
      const metadata = JSON.parse(contents) as { status?: string };
      expect(
        metadata.status,
        'Track metadata.status should be "active" while awaiting sign-off. ' +
          'A "complete" or "archived" status would skip the sign-off gate and is owned by Phase 8 (Close-out).',
      ).toBe('active');
    });

    /**
     * The plan must still list the Phase 7 tasks as not-yet-complete
     * (i.e. `[ ]` or `[~]`, not `[x]`). If the plan shows Phase 7
     * as fully checked, the auditor has signalled the sign-off has
     * landed and Phase 8 (Close-out) is the next phase — not Phase 7.
     *
     * GREEN today: all three Phase 7 plan tasks are `[~]` (the
     * Red-phase marker applied 2026-06-05).
     */
    it('plan.md still has Phase 7 tasks as in-progress (not all [x])', async () => {
      const contents = await fs.readFile(TRACK_PLAN, 'utf-8');
      // Slice from the `## Phase 7:` heading to the next `## Phase`
      // (or `## Phase 8:`, whichever comes first) heading.
      const phase7Re = /^## Phase 7:.*$/m;
      const start = contents.match(phase7Re);
      expect(start, 'plan.md must still contain a "## Phase 7:" heading').not.toBeNull();
      if (!start) return;
      const startIdx = contents.indexOf(start[0]);
      const tail = contents.slice(startIdx + start[0].length);
      const nextPhaseRe = /^## Phase\s/m;
      const end = tail.match(nextPhaseRe);
      const section = end ? tail.slice(0, end.index) : tail;

      // Count Phase 7 task lines (skip blockquote / heading lines).
      const taskRe = /^\s*-\s+\[(.)\]/gm;
      const matches = [...section.matchAll(taskRe)];
      expect(
        matches.length,
        `Expected at least 3 Phase 7 tasks in plan.md; found ${matches.length}. Phase 7 must have at least the three tasks listed in the plan (Share / Wait / Capture refinements).`,
      ).toBeGreaterThanOrEqual(3);
      const completed = matches.filter((m) => m[1] === 'x').length;
      expect(
        completed,
        `All ${matches.length} Phase 7 tasks are already [x] (completed); the sign-off gate has been skipped. The pilot must keep Phase 7 in-progress until the present-to-user step is actually complete.`,
      ).toBeLessThan(matches.length);
    });
  });

  // ============================================================
  // 7.2 — "Share" / "Sign-off requested" marker (RED today)
  // ============================================================
  describe('Phase 7.2 — "Share" / "Sign-off requested" marker on executive-summary.md', () => {
    /**
     * The protocol step 9 says "Share `executive-summary.md` + top
     * 3 proposed tracks. Wait for sign-off before opening track
     * tickets." The act of "sharing" is a human action; the
     * *audit trail* of the share is a date-stamped line on the
     * executive summary.
     *
     * Acceptable marker forms (any one is sufficient):
     *   - `**Sign-off requested:** YYYY-MM-DD — reviewers: <list>`
     *   - `**Distribution:** <list> (<date>)`
     *   - `**Reviewers:** <list>`
     *   - `**Shared with:** <list> (<date>)`
     *
     * The pilot's `**Sign-off line:**` paragraph (line 87 of the
     * current exec summary) is the *content* of the sign-off
     * request — i.e. what leadership is being asked to sign off
     * on. The "Share" marker is the *fact* of the request:
     * when, to whom, and by whom.
     *
     * RED today (2026-06-05): no such marker is present. The
     * auditor must add a `**Sign-off requested:**` line (or
     * equivalent Distribution / Reviewers line) so the Phase 7
     * step is auditable.
     */
    it('executive-summary.md has a "Sign-off requested" / "Distribution" / "Reviewers" line', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Match any of: Sign-off requested, Distribution, Reviewers,
      // Shared with. Anchor on the bolded label (`**Foo:**`) so
      // prose mentions ("reviewers should look at…") do not satisfy
      // the contract.
      const markerRe = /^\*\*\s*(?:Sign-off\s+requested|Distribution|Reviewers|Shared\s+with)\s*:\*\*/im;
      expect(
        contents.match(markerRe),
        'executive-summary.md should have a "**Sign-off requested:**" (or "**Distribution:**" / ' +
          '**Reviewers:**" / "**Shared with:**") line so the Phase 7 "share" step is auditable. ' +
          'The current "**Sign-off line:**" paragraph states what is being signed off on, not ' +
          'when/to whom the share happened. Add a date-stamped distribution line above or below ' +
          'the existing sign-off line.',
      ).not.toBeNull();
    });
  });

  // ============================================================
  // 7.3 — Top 3 proposed tracks named in the share artifact
  // ============================================================
  describe('Phase 7.3 — Top 3 proposed tracks (smoke cross-check vs Phase 6.5)', () => {
    /**
     * Per protocol step 9: "Share `executive-summary.md` + top 3
     * proposed tracks." The "share artifact" *is* the executive
     * summary, and it must name exactly 3 distinct track ids in
     * its "Recommended next 3 tracks" section. This is a smoke
     * cross-check of Phase 6.5 — the contract is the same, and
     * re-pinning it here makes Phase 7 self-contained: a reader
     * who reads only the Phase 7 plan + tests knows the share
     * artifact's structural requirement.
     *
     * GREEN today (2026-06-05): the executive summary's
     * "Recommended next 3 tracks" section names
     * `app_domain_migration_20260603`, `tenant_db_school_id_20260603`,
     * and `argon2id_password_20260603`.
     */
    it('executive-summary.md "Recommended next 3 tracks" section names exactly 3 distinct track ids', async () => {
      const contents = await fs.readFile(EXEC_SUMMARY, 'utf-8');
      // Find a heading whose text contains "3 tracks" and walk to
      // the next heading; collect track ids that appear in that
      // slice. Same shape as Phase 6.5's test, repeated here so
      // Phase 7 reads self-containedly.
      const startMatch = contents.match(/^#{1,6}\s+.*3\s+(?:proposed\s+|recommended\s+)?tracks?\b.*$/im);
      expect(
        startMatch,
        'executive-summary.md should have a heading naming "3 tracks" as the recommended next slice. ' +
          'The Phase 7 share artifact is incomplete without it.',
      ).not.toBeNull();
      if (!startMatch) return;
      const startIdx = contents.indexOf(startMatch[0]);
      const tail = contents.slice(startIdx + startMatch[0].length);
      const endMatch = tail.match(/^#{1,6}\s+/m);
      const section = endMatch ? tail.slice(0, endMatch.index) : tail;

      // Collect unique track ids of the form `<slug>_20260603`.
      const ids = new Set<string>();
      const idRe = /\b([a-z][a-z0-9_]*_20\d{6})\b/g;
      let m: RegExpExecArray | null;
      while ((m = idRe.exec(section)) !== null) {
        ids.add(m[1]);
      }
      expect(
        ids.size,
        `Recommended-next section should name exactly 3 distinct track ids; found ${ids.size}: ` +
          `${[...ids].join(', ') || '(none)'}. The Phase 7 share artifact is the executive summary; ` +
          'it must surface exactly 3 tracks so the reader knows what to fund first.',
      ).toBe(3);
    });
  });

  // ============================================================
  // 7.4 — Open Questions have a **Status:** annotation (RED today)
  // ============================================================
  describe('Phase 7.4 — Open Questions are status-annotated', () => {
    /**
     * The Phase 7 plan task is to "Capture protocol refinements"
     * from the pilot. The protocol's §"Open Questions" section
     * lists four questions; the pilot surfaced concrete decisions
     * for at least one of them (Per-rule weights — the user
     * chose pass/fail only on 2026-06-03, per the Changelog).
     *
     * The contract: every Open Question bullet now carries a
     * `**Status:** <OPEN|RESOLVED|DEFERRED>` annotation. The
     * status field is what tells the next protocol iteration
     * which questions are still open. A bare `[ ]` checkbox is
     * the *original* form (v1.0 / v1.1); Phase 7's refinement
     * is to surface the pilot's decisions inline.
     *
     * RED today (2026-06-05): all four Open Question bullets are
     * bare `[ ]` checkboxes with no `**Status:**` annotation.
     */
    it('each of the four Open Questions has a **Status:** annotation in the Open Questions section', async () => {
      const section = await readOpenQuestionsSection();
      const missing: string[] = [];
      for (const title of OPEN_QUESTION_TITLES) {
        // Find the bullet whose bolded title matches `**Title.**`
        // and check the same bullet line for `**Status:**`.
        // The bullet may span multiple lines; we anchor on the
        // first line that contains both the title and a status
        // marker. If the title is in the section but no bullet
        // near it has `**Status:**`, count it as missing.
        const titleEscaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const bulletRe = new RegExp(
          `^-\\s+\\[(?:\\s|x)\\]\\s+\\*\\*${titleEscaped}\\.\\*\\*[\\s\\S]*?\\*\\*Status:\\*\\*`,
          'm',
        );
        if (!bulletRe.test(section)) {
          missing.push(title);
        }
      }
      expect(
        missing,
        `Open Questions in agents-md-audit-protocol.md are missing **Status:** annotations for: ${missing.join(', ')}. ` +
          'Each Open Question should now carry a **Status:** OPEN | RESOLVED | DEFERRED annotation so the next ' +
          'protocol iteration knows which questions the pilot decided. Example: ' +
          '`- [x] **Per-rule weights.** ... **Status:** RESOLVED 2026-06-05 — pilot uses pass/fail only, no weights.`',
      ).toEqual([]);
    });

    /**
     * Specific concrete contract: the "Per-rule weights" question
     * is RESOLVED in the pilot (the user chose pass/fail only on
     * 2026-06-03, per the protocol Changelog). The bullet should
     * reflect that decision, not leave the question bare.
     *
     * RED today: the bullet is bare.
     */
    it('the "Per-rule weights" Open Question is annotated as RESOLVED (pilot decision on 2026-06-03)', async () => {
      const section = await readOpenQuestionsSection();
      const titleEscaped = 'Per-rule weights'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const bulletRe = new RegExp(
        `-\\s+\\[(?:\\s|x)\\]\\s+\\*\\*${titleEscaped}\\.\\*\\*[\\s\\S]{0,400}?\\*\\*Status:\\*\\*\\s*\\*\\*RESOLVED\\*\\*`,
        'i',
      );
      expect(
        bulletRe.test(section),
        'The "Per-rule weights" Open Question should be annotated `**Status:** **RESOLVED**` ' +
          'because the pilot decided pass/fail only on 2026-06-03 (per the protocol Changelog). ' +
          'A bare `[ ]` bullet leaves the decision in the Changelog but not the body, so the next ' +
          'auditor will relitigate it. Add the annotation inline.',
      ).toBe(true);
    });
  });

  // ============================================================
  // 7.5 — Resolved refinements mirrored in Maintenance (RED today)
  // ============================================================
  describe('Phase 7.5 — Resolved refinements are mirrored in §"Maintenance"', () => {
    /**
     * Per the Phase 7 plan task: "Capture protocol refinements
     * in `agents-md-audit-protocol.md` §"Open Questions" →
     * §"Maintenance"." The arrow means: resolved Open
     * Questions are moved (mirrored) into the Maintenance
     * section with a `Resolved: YYYY-MM-DD` date so the
     * history of decisions is preserved.
     *
     * RED today (2026-06-05): the §"Maintenance" section is a
     * single paragraph about how the protocol is living
     * documentation; no resolved items are mirrored.
     */
    it('§"Maintenance" has at least one "Resolved: YYYY-MM-DD" entry from a pilot refinement', async () => {
      const section = await readMaintenanceSection();
      // A "resolved" entry looks like `- **Resolved: 2026-06-05 — <title>: <resolution>`
      // or `**Resolved (2026-06-05):** <resolution>`, or any line whose text contains
      // `Resolved:` followed by a YYYY-MM-DD date. Anchor on the date so
      // generic prose ("if a check is resolved, ...") does not satisfy.
      const resolvedDateRe = /\bResolved\b[^\n]{0,40}?20\d{2}-\d{2}-\d{2}/i;
      expect(
        resolvedDateRe.test(section),
        '§"Maintenance" in agents-md-audit-protocol.md should contain at least one "Resolved: YYYY-MM-DD" ' +
          'entry mirroring a pilot Open-Question refinement. The pilot decided at least one question ' +
          '(Per-rule weights — 2026-06-03, pass/fail only) and the resolution should be recorded under ' +
          'Maintenance with the decision date.',
      ).toBe(true);
    });

    /**
     * Stronger contract: the "Per-rule weights" resolution
     * specifically is mirrored, because the protocol Changelog
     * already records the decision — the body just hasn't been
     * updated. The mirror entry should mention the question
     * title or its decision ("pass/fail only").
     */
    it('§"Maintenance" mirrors the "Per-rule weights" resolution (pass/fail only)', async () => {
      const section = await readMaintenanceSection();
      const hasDate = /\bResolved\b[^\n]{0,40}?20\d{2}-\d{2}-\d{2}/i.test(section);
      const mentionsWeights = /Per-rule\s+weights/i.test(section);
      const mentionsDecision = /pass[\s/]+fail\s+only|pass\/fail\s+only/i.test(section);
      expect(
        hasDate && (mentionsWeights || mentionsDecision),
        '§"Maintenance" should mirror the "Per-rule weights" resolution with a `Resolved:` date and a ' +
          'mention of either the question title or its decision (pass/fail only). The current section ' +
          `hasDate=${hasDate} mentionsWeights=${mentionsWeights} mentionsDecision=${mentionsDecision}. ` +
          'Add a `- **Resolved: 2026-06-05 — Per-rule weights:** ...` entry.',
      ).toBe(true);
    });
  });
});
