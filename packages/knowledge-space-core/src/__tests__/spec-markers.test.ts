/**
 * Tests — kst-srs.v2/SPECIFICATION.md cross-reference markers
 *
 * Track 8: Lesser Holes. Phase 4, Task 1.
 *
 * Per plan.md Phase 4 Task 1: "Update in-repo kst-srs.v2 spec
 * (§3.2 transfers_to, §16 Level Projection, §9.4 progressTrend, §12.9
 * FSRS per-card limitation + siblingReinforcement flag)." The spec
 * documents the items in §11 only; the cross-references in
 * §3.2 / §9.4 / §12.9 / §16 — plus the §12.9 / §16 headings — must
 * be added so readers traversing the spec land on the §11
 * definitions from the natural home of each topic:
 *
 *   - §3.2 (Four-Way State, in Knowledge State & Mastery) — should
 *     cross-reference `transfers_to` as the cross-domain edge that
 *     seeds a prior on a target's initial mastery state.
 *   - §9.4 (Planner Injection, in Misconception Remediation Loop) —
 *     should cross-reference `progressTrend` as the parent-facing
 *     signal produced by the planner's history.
 *   - §12.9 (a new subsection of §12 Package Boundaries) — should
 *     document the FSRS per-card limitation and the
 *     `siblingReinforcement` config flag.
 *   - §16 (a new top-level section after §13 NFRs) — should
 *     document Level Projection as a presentation-only projection.
 *
 * The bare `siblingReinforcement` token check at the end is a
 * regression guard so a future refactor that renames or removes the
 * flag from §11 is caught.
 *
 * Artifact contract — not a behavioral test. This file grep's a
 * checked-in markdown document. The live-behavior gate is the
 * cross-package suite (`npm run test` per package) plus the
 * in-process `transfers_to` / Level Projection / `progressTrend`
 * tests authored in Phases 1–3. Per the directive, this artifact
 * test is paired with the live-behavior tests that own the
 * acceptance criteria for the underlying functionality; the
 * Phase 4 Green role also owns the cross-reference edit and the
 * `npm run generate && npm run doctor && npm run lint &&
 * npx tsc --noEmit && CI=true npm run test` phase-closeout
 * command.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SPEC_PATH = resolve(__dirname, '../../../../kst-srs.v2/SPECIFICATION.md');

/**
 * Read the full SPECIFICATION.md file contents.
 * @returns {string} - The spec file as a UTF-8 string
 */
function readSpec(): string {
  return readFileSync(SPEC_PATH, 'utf-8');
}

/**
 * Extract the content of a section heading, regardless of heading
 * level (h2 `## ` or h3 `### `). Returns everything from the matched
 * heading line up to (but not including) the next heading of equal
 * or higher level. Returns an empty string if the heading is not
 * present.
 *
 * @param {string} spec - The full spec markdown string
 * @param {RegExp} headingPattern - Regex matching the heading line text, e.g.
 *   `/^### 3\.2 Four-Way State/`. The line number is captured via
 *   `match.index`; the capture group is not used.
 * @param {'## ' | '### '} headingLevel - The Markdown heading level ('## ' or '### ').
 *   Stops at the next heading of equal or higher level.
 */
function extractSection(
  spec: string,
  headingPattern: RegExp,
  headingLevel: '## ' | '### ',
): string {
  const match = spec.match(headingPattern);
  if (!match || match.index === undefined) {
    return '';
  }
  const start = match.index + match[0].length;
  const rest = spec.slice(start);
  const stopPatterns: Record<typeof headingLevel, RegExp> = {
    '## ': /^## \d/m,
    '### ': /^## \d|^### \d/m,
  };
  const stopAt = rest.search(stopPatterns[headingLevel]);
  return stopAt === -1 ? rest : rest.slice(0, stopAt);
}

describe('Phase 4 — kst-srs.v2/SPECIFICATION.md cross-reference markers', () => {
  it('the spec file exists and is non-empty', () => {
    const spec = readSpec();
    expect(spec.length).toBeGreaterThan(0);
    expect(spec).toMatch(/KST-SRS v2 Specification/);
  });

  it('§3.2 cross-references the transfers_to edge type', () => {
    const section32 = extractSection(
      readSpec(),
      /^### 3\.2[^\n]*\n/m,
      '### ',
    );
    expect(
      section32.length,
      '§3.2 heading was not found in the spec — required for the cross-reference.',
    ).toBeGreaterThan(0);
    expect(
      section32,
      '§3.2 must cross-reference the `transfers_to` edge type so that the cross-domain prior-seeding surface is surfaced inside the Knowledge State & Mastery chapter.',
    ).toMatch(/transfers_to/);
    expect(
      section32,
      '§3.2 must preserve the track boundary that transfers_to consumption is future/deferred work, not implemented behavior.',
    ).toMatch(/future|deferred/i);
  });

  it('§9.4 cross-references the progressTrend parent-facing signal', () => {
    const section94 = extractSection(
      readSpec(),
      /^### 9\.4[^\n]*\n/m,
      '### ',
    );
    expect(
      section94.length,
      '§9.4 heading was not found in the spec — required for the cross-reference.',
    ).toBeGreaterThan(0);
    expect(
      section94,
      '§9.4 must cross-reference `progressTrend` so the parent-facing signal is surfaced inside the Misconception Remediation Loop chapter where the planner injects activities.',
    ).toMatch(/progressTrend/);
  });

  it('§12.9 documents the FSRS per-card limitation and siblingReinforcement flag', () => {
    const section129 = extractSection(
      readSpec(),
      /^### 12\.9[^\n]*\n/m,
      '### ',
    );
    expect(
      section129.length,
      '§12.9 must be added under §12 (Package Boundaries) to document the FSRS per-card limitation. Heading not found in the live spec.',
    ).toBeGreaterThan(0);
    expect(
      section129,
      '§12.9 must cross-reference the FSRS per-card limitation and the siblingReinforcement flag.',
    ).toMatch(/FSRS/i);
    expect(section129).toMatch(/siblingReinforcement/);
  });

  it('§16 documents Level Projection as a presentation-only projection', () => {
    const section16 = extractSection(
      readSpec(),
      /^## 16\.[^\n]*\n/m,
      '## ',
    );
    expect(
      section16.length,
      '§16 must be added as a top-level section to document Level Projection. Heading not found in the live spec.',
    ).toBeGreaterThan(0);
    expect(
      section16,
      '§16 must call Level Projection "presentation-only" so the never-feeds-KST/SRS invariant is documented alongside the projection.',
    ).toMatch(/Level Projection/i);
    expect(section16).toMatch(/presentation[- ]only/i);
  });

  it('the spec contains the `siblingReinforcement` token (regression guard)', () => {
    const spec = readSpec();
    expect(
      spec,
      '`siblingReinforcement` flag must appear in the spec (currently at §11.4). If this assertion fails, the flag has been silently dropped from the spec.',
    ).toMatch(/siblingReinforcement/);
  });
});
