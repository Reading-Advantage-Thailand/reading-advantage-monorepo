/**
 * Phase 3 (Manual Review — judgment calls) contracts for the AGENTS.md
 * Compliance Audit of `apps/science-advantage/` (pilot).
 *
 * Phase 3 of the audit protocol (§4 of
 * `measure/agents-md-audit-protocol.md`) is the "manual review" pass:
 * for each static-FAIL recorded in `findings.md`, the auditor must
 * inspect 1–2 example file:line and confirm the violation is real
 * (not a false positive), then record the judgment. The protocol
 * explicitly calls out three classes of false positive that the
 * inspection must rule out:
 *
 *   1. `import { db } from "..."` inside a `lib/db.ts` adapter that
 *      wraps the shared client.
 *   2. `JSON.parse` of an env var already validated by Zod at boot.
 *   3. `console.log` in a test setup file.
 *
 * The test strategy (`test-strategy.md` §5) prescribes:
 *   - Unit: N/A (human judgment — auditor picks the sample)
 *   - Integration: Spot-check 2 samples per FAIL
 *   - Per-Phase Test Approach: Inspect 1–2 files per FAIL; confirm
 *     violation is real, not a false positive.
 *
 * This test file pins the structural contract of the inspection
 * annotations recorded in `findings.md` so that the audit is
 * reproducible and the manual-review pass cannot be silently
 * skipped or half-done:
 *
 *   1. Every FAIL has a `**Manual Inspection:**` line.
 *   2. 1–2 sample `path:line` references per non-subsumed FAIL.
 *      (Subsumed FAILs may defer to the umbrella finding's sample
 *      with a `SUBSUMED` judgment and 0 cited samples.)
 *   3. Each sample file exists on disk.
 *   4. Each sample line number is within the file's line count.
 *   5. A judgment keyword is recorded:
 *      `REAL` | `FALSE_POSITIVE` | `SUBSUMED` | `STATE_OK_NOW` |
 *      `REAL_AT_AUDIT_TIME`.
 *
 * The SUT is the audit's `findings.md` artifact. Tests are
 * unit-level (no DB, no Next.js server) and use the same filesystem
 * access patterns as the Phase 0/1/2 audit tests.
 *
 * All tests in this file are RED today (2026-06-05): the inspection
 * annotations have not been added to `findings.md` yet. They will
 * turn GREEN once the auditor walks each FAIL and appends the
 * inspection block in the format documented in the file's
 * pre-block comments.
 *
 * Expected inspection block format (one per FAIL section):
 *
 *   - **Manual Inspection:** (REAL)
 *     - `apps/science-advantage/lib/ai/recommendation-service.ts:2-4`
 *       — Imports `generateObject` from `ai`, `createOpenAI` from
 *       `@ai-sdk/openai`, `createGoogleGenerativeAI` from
 *       `@ai-sdk/google`. No `AIClient` interface boundary.
 *     - `apps/science-advantage/lib/ai/image-generator.ts:1`
 *       — `experimental_generateImage` imported; `ensureApiKey()`
 *       mutates `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY`.
 *
 * The judgment is the parenthesized keyword on the
 * `**Manual Inspection:**` line. Each subsequent indented bullet
 * that matches a `` `path:line` `` pattern counts as one sample.
 *
 * PASS findings (F-1206, F-1302–F-1304) do not require a Manual
 * Inspection. Sub-headings like "F-101 + F-102 bundled into Track 5
 * + 6" are excluded by the F-XXX heading regex.
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

/**
 * Valid judgment keywords for the `**Manual Inspection:**` annotation.
 * Per the audit protocol §4 (judgment-call examples) and §5
 * (classification for subsumed + state-based findings):
 *   - REAL                — violation is real, sample confirms it.
 *   - FALSE_POSITIVE      — looks like a violation but is one of the
 *                            three protocol-cited acceptable patterns.
 *   - SUBSUMED            — the FAIL is part of an umbrella finding
 *                            (e.g. F-203 subsumed by F-305); no
 *                            independent sample required.
 *   - STATE_OK_NOW        — audit-time state was REAL; current state
 *                            is resolved by a post-audit track.
 *   - REAL_AT_AUDIT_TIME  — state-based finding (e.g. graph.db
 *                            mtime); confirmation is a recorded
 *                            command output, not a file:line.
 */
const VALID_JUDGMENTS: readonly string[] = [
  'REAL',
  'FALSE_POSITIVE',
  'SUBSUMED',
  'STATE_OK_NOW',
  'REAL_AT_AUDIT_TIME',
];

/**
 * Maximum samples per FAIL per the test strategy §5 ("Inspect 1–2
 * files per FAIL"). 2 samples is the upper bound; subsumed FAILs
 * may legitimately have 0.
 */
const MIN_NON_SUBSUMED_SAMPLES = 1;
const MAX_SAMPLES = 2;

/**
 * Section heading regex. Matches:
 *   `### F-101: ...`
 *   `### F-1302-F-1304: ...`
 * But NOT:
 *   `### F-101 + F-102 bundled ...`  (no colon after the second F-id)
 *   `### Findings`                   (no F- prefix)
 */
const HEADING_RE = /^### (F-\d+(?:-F-\d+)?):/;

/**
 * Inspection line regex. Matches `- **Manual Inspection:** (KEYWORD)`
 * with optional whitespace inside the parens.
 */
const INSPECTION_HEAD_RE = /^- \*\*Manual Inspection:\*\*\s*(?:\(([^)]*)\))?/;

/**
 * Sample bullet regex. Matches the path:line pattern inside
 * backticks. The path is restricted to filesystem-safe characters
 * (alphanumerics, dot, slash, hyphen, underscore, brackets, parens,
 * `@`, `+`) so a trailing colon followed by digits is unambiguous.
 * Multi-line ranges (`2-4`) and lists (`2,5,7`) are accepted; the
 * first number is captured as the sample line.
 */
const SAMPLE_RE = /`([A-Za-z0-9._\-\/[\]()@+]+):(\d+)(?:[-,]\d+)*`/;

/**
 * Read findings.md and split it into sections keyed by F-XXX heading.
 * A section's body is the heading line plus everything up to the next
 * `### F-` heading (or end of file). Sub-headings like
 * `### F-101 + F-102 bundled ...` (no `:` immediately after the
 * second F-id) are not treated as section starts and are absorbed
 * into the previous section.
 */
async function parseFindingsSections(): Promise<Map<string, string>> {
  const contents = await fs.readFile(FINDINGS, 'utf-8');
  const sections = new Map<string, string>();
  const lines = contents.split('\n');
  let currentId: string | null = null;
  let currentBuf: string[] = [];
  const flush = () => {
    if (currentId) sections.set(currentId, currentBuf.join('\n'));
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
 * Filter the section map down to the FAIL IDs that require a Manual
 * Inspection annotation. Excludes:
 *   - Range headings (F-1302–F-1304) — these are PASS entries per
 *     findings.md. Match the trailing `-F-\d+` so single IDs like
 *     `F-101` (which contain a hyphen but are not ranges) are kept.
 *   - Single-ID headings whose first line contains the literal
 *     "PASS" — covers F-1206.
 *   - Sections that are not FAILs (e.g. heading-only PASS sections).
 */
function getFailIdsRequiringInspection(
  sections: Map<string, string>,
): string[] {
  const out: string[] = [];
  for (const [id, body] of sections.entries()) {
    if (/-F-\d+$/.test(id)) continue; // F-1302-F-1304 style range
    const firstLine = body.split('\n')[0];
    if (/\bPASS\b/.test(firstLine)) continue;
    out.push(id);
  }
  return out;
}

interface InspectionParse {
  present: boolean;
  judgment: string | null;
  samples: { file: string; line: number }[];
}

/**
 * Parse a `**Manual Inspection:**` annotation out of a FAIL section's
 * body. Returns:
 *   - present:   whether the annotation line was found.
 *   - judgment:  the parenthesized keyword (e.g. "REAL"), or null.
 *   - samples:   array of { file, line } extracted from
 *                `path:line` bullets under the annotation.
 *
 * The parse is bounded by the next `### F-` heading or the next
 * top-level field (a bullet line matching `- **Field:**`) so the
 * inspection's sample bullets don't bleed into the next finding or
 * into the next structured field on the same finding.
 */
function parseInspectionBlock(body: string): InspectionParse {
  const lines = body.split('\n');
  const idx = lines.findIndex((l) => INSPECTION_HEAD_RE.test(l));
  if (idx === -1) {
    return { present: false, judgment: null, samples: [] };
  }
  const head = lines[idx];
  const headMatch = head.match(INSPECTION_HEAD_RE);
  const judgment = headMatch?.[1]?.trim() || null;
  const samples: { file: string; line: number }[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ')) break;
    if (/^- \*\*[A-Za-z][^*]*:\*\*/.test(line)) break;
    const m = line.match(SAMPLE_RE);
    if (m) {
      samples.push({ file: m[1], line: Number(m[2]) });
    }
  }
  return { present: true, judgment, samples };
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 3: Manual Review)', () => {
  describe('Phase 3.1 — Inspection annotation exists for every FAIL', () => {
    /**
     * For every FAIL recorded in `findings.md`, the auditor must add
     * a `**Manual Inspection:**` annotation. PASS findings (F-1206,
     * F-1302–F-1304) and sub-headings (e.g. "F-101 + F-102 bundled")
     * are excluded — they have no inspection obligation.
     */
    it('every FAIL section in findings.md has a **Manual Inspection:** line', async () => {
      const sections = await parseFindingsSections();
      const failIds = getFailIdsRequiringInspection(sections);
      expect(failIds.length).toBeGreaterThan(0);
      const missing: string[] = [];
      for (const id of failIds) {
        const inspection = parseInspectionBlock(sections.get(id) ?? '');
        if (!inspection.present) missing.push(id);
      }
      expect(
        missing,
        `these FAILs are missing a Manual Inspection annotation: ${missing.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('Phase 3.2 — Sample count is 1–2 per non-subsumed FAIL', () => {
    /**
     * Per test strategy §5: "Inspect 1–2 files per FAIL". A FAIL
     * judged SUBSUMED (e.g. F-203 / F-208 / F-306 / F-307 / F-405 /
     * F-701 / F-702, all rolled into F-305) legitimately has 0
     * cited samples because the umbrella's inspection covers it.
     * Every other FAIL must have 1–2 samples.
     */
    it('every non-SUBSUMED FAIL inspection cites 1–2 path:line samples', async () => {
      const sections = await parseFindingsSections();
      const failIds = getFailIdsRequiringInspection(sections);
      const violations: { id: string; count: number; judgment: string | null }[] = [];
      for (const id of failIds) {
        const inspection = parseInspectionBlock(sections.get(id) ?? '');
        if (!inspection.present) continue;
        if (inspection.judgment === 'SUBSUMED') continue;
        const n = inspection.samples.length;
        if (n < MIN_NON_SUBSUMED_SAMPLES || n > MAX_SAMPLES) {
          violations.push({ id, count: n, judgment: inspection.judgment });
        }
      }
      expect(
        violations,
        `these FAILs have an out-of-range sample count (need 1–2): ${JSON.stringify(violations)}`,
      ).toEqual([]);
    });
  });

  describe('Phase 3.3 — Sample files exist on disk', () => {
    /**
     * Each cited sample path must resolve to a file in the working
     * tree at the time the audit is read. The path is interpreted
     * relative to MONOREPO_ROOT, matching the convention used in the
     * Evidence section of every existing FAIL in `findings.md`
     * (e.g. `apps/science-advantage/lib/ai/recommendation-service.ts:2-4`).
     */
    it('every FAIL inspection sample file exists at the cited path', async () => {
      const sections = await parseFindingsSections();
      const failIds = getFailIdsRequiringInspection(sections);
      const missing: string[] = [];
      for (const id of failIds) {
        const inspection = parseInspectionBlock(sections.get(id) ?? '');
        if (!inspection.present) continue;
        for (const sample of inspection.samples) {
          const abs = path.join(MONOREPO_ROOT, sample.file);
          try {
            const stat = await fs.stat(abs);
            if (!stat.isFile()) {
              missing.push(`${id}: ${sample.file} is not a regular file`);
            }
          } catch {
            missing.push(`${id}: ${sample.file} does not exist`);
          }
        }
      }
      expect(
        missing,
        `these sample files are missing on disk: ${missing.join('; ')}`,
      ).toEqual([]);
    });
  });

  describe('Phase 3.4 — Sample line numbers in range', () => {
    /**
     * Each cited `path:line` must point inside the file. A line
     * number of 0 or > the file's line count is an inspection
     * bookkeeping error (the auditor copy-pasted a wrong line
     * number from the audit-time evidence list, or the file has
     * since been truncated). Either way, the inspection is not
     * reproducible from the annotation.
     */
    it("every FAIL inspection sample line is within the file's line count", async () => {
      const sections = await parseFindingsSections();
      const failIds = getFailIdsRequiringInspection(sections);
      const outOfRange: string[] = [];
      for (const id of failIds) {
        const inspection = parseInspectionBlock(sections.get(id) ?? '');
        if (!inspection.present) continue;
        for (const sample of inspection.samples) {
          const abs = path.join(MONOREPO_ROOT, sample.file);
          let lineCount = 0;
          try {
            const contents = await fs.readFile(abs, 'utf-8');
            lineCount = contents.split('\n').length;
          } catch {
            continue; // covered by Phase 3.3
          }
          if (sample.line < 1 || sample.line > lineCount) {
            outOfRange.push(
              `${id}: ${sample.file}:${sample.line} (file has ${lineCount} lines)`,
            );
          }
        }
      }
      expect(
        outOfRange,
        `these sample lines are out of range: ${outOfRange.join('; ')}`,
      ).toEqual([]);
    });
  });

  describe('Phase 3.5 — Judgment keyword recorded', () => {
    /**
     * The judgment is the auditor's call, but it must be one of the
     * five enumerated keywords. Anything else (e.g. "yes", "ok",
     * "confirmed", or missing entirely) is a contract violation —
     * downstream readers cannot tell whether the inspection is
     * decisive or whether the auditor left it open.
     */
    it(
      'every FAIL inspection records one of: REAL | FALSE_POSITIVE | SUBSUMED | STATE_OK_NOW | REAL_AT_AUDIT_TIME',
      async () => {
        const sections = await parseFindingsSections();
        const failIds = getFailIdsRequiringInspection(sections);
        const invalid: { id: string; judgment: string | null }[] = [];
        for (const id of failIds) {
          const inspection = parseInspectionBlock(sections.get(id) ?? '');
          if (!inspection.present) continue;
          if (
            inspection.judgment === null ||
            !VALID_JUDGMENTS.includes(inspection.judgment)
          ) {
            invalid.push({ id, judgment: inspection.judgment });
          }
        }
        expect(
          invalid,
          `these FAILs are missing a valid judgment keyword: ${JSON.stringify(invalid)}`,
        ).toEqual([]);
      },
    );
  });
});
