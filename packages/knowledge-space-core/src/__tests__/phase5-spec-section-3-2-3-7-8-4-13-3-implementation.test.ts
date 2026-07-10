/**
 * Phase 5 regression — kst-srs.v2 SPECIFICATION.md §3.2, §3.7, §8.4, §13.3
 *   document the misconception-loop model.
 *
 * Track 6: Misconception Remediation Loop. Phase 5, Task 1.
 *
 * Per plan.md Phase 5 Task 1: "Update in-repo kst-srs.v2 spec (§3.2
 * remediated_by, §3.7, §8.4 rating cap, §13.3)." The contract is that
 * `kst-srs.v2/SPECIFICATION.md` reflects the model that Phase 1–Phase 4
 * of this track actually shipped — not just the high-level §9 (Item 6)
 * narrative. The plan task asks for cross-references in the four
 * sections that other readers of the spec would naturally check for
 * misconception-loop semantics.
 *
 *   - §3.2 (Four-Way State) — the four-way mastery table lives in the
 *     state engine. A detected misconception can pin a skill in
 *     `inProgress` until remediation resolves. The spec must surface
 *     the `remediated_by` edge type so a reader can navigate from the
 *     state model to §9 (Misconception Remediation Loop).
 *   - §3.7 (new section) — a new subsection in §3 (Knowledge State &
 *     Mastery) that documents how the misconception lifecycle interacts
 *     with the state model (per test-strategy §3 "Severity source of
 *     truth" cross-phase concern). A reader who lands on §3 looking
 *     for state semantics must find the misconception-loop seam here.
 *   - §8.4 (IM3 Problem Bank) — the placement engine's problem bank
 *     returns `ProbeResult` verdicts that feed misconception detection
 *     downstream. The spec must surface the rating-cap rule (§9.2) so
 *     a reader can navigate from probe semantics to rating behavior.
 *   - §13.3 (new NFR) — a new non-functional requirement under §13
 *     that documents the misconception-lifecycle purity contract:
 *     `runRealT6Loop` is a pure function, the per-student Convex
 *     handlers are the only persistence seam, and stale state defaults
 *     to empty (test-strategy §3 "Stale state migration").
 *
 * This test reads the spec and asserts the presence of the cross-
 * references / new sections that the Red-phase code modules in
 * `packages/knowledge-space-practice/src/misconception-loop.ts` and
 * `apps/integrated-math-3/convex/misconceptionState.ts` expose:
 *
 *   - `remediated_by` edge type — `packages/knowledge-space-core/src/types.ts`
 *     (Phase 1 deliverable, see `edge-type-remediated-by.test.ts`).
 *   - `getMisconceptionSeverity` accessor — `packages/knowledge-space-practice/
 *     src/misconception-loop.ts:55-60` (Phase 1 deliverable, severity source
 *     of truth shared with Phase 2).
 *   - `student_misconception_state` Convex table — `apps/integrated-math-3/
 *     convex/schema.ts` (Phase 1 deliverable, see `misconceptionStateSchema.test.ts`).
 *   - `runRealT6Loop` transition function — `packages/knowledge-space-practice/
 *     src/misconception-loop.ts` (Phase 3 deliverable, see
 *     `misconception-lifecycle.test.ts`).
 *   - Rating-cap rule — `packages/practice-core/src/practice/srs-rating.ts:88-123`
 *     (Phase 2 deliverable, see `srs-rating-cap.test.ts`).
 *
 * The spec now surfaces these cross-references and subsections; this file is a
 * passing regression guard that keeps the misconception-loop model documented in
 * the sections readers naturally consult.
 *
 * Live-behavior pairing (per the prompt's "artifact assertions must be
 * paired with a live-behavior proof or a later-phase plan note"):
 * this Phase 5 spec-parity artifact gate is paired with the live
 * aggregate suite (`npm run lint`, `tsc --noEmit`, `CI=true npm test`)
 * listed in test-strategy §5 P5 row, which the Green role runs as the
 * production gate. The artifact contract stays in Phase 5; the live
 * runtime gate is owned by the same Phase 5 Green closeout.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SPEC_PATH = resolve(__dirname, '../../../../kst-srs.v2/SPECIFICATION.md');

function readSpec(): string {
  return readFileSync(SPEC_PATH, 'utf-8');
}

function extractSubsection(spec: string, topLevel: number, subLevel: number): string {
  // The spec is markdown; capture from `### <topLevel>.<subLevel> ...`
  // up to the next `###` heading.
  const heading = new RegExp(
    `^### ${topLevel}\\.${subLevel}[^\\n]*\\n`,
    'm',
  );
  const match = spec.match(heading);
  if (!match || match.index === undefined) {
    return '';
  }
  const start = match.index + match[0].length;
  const rest = spec.slice(start);
  const nextHeading = rest.search(/^### \d/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

describe('Phase 5 — kst-srs.v2 SPECIFICATION.md §3.2 documents remediated_by cross-reference', () => {
  const section3_2 = extractSubsection(readSpec(), 3, 2);

  it('§3.2 (Four-Way State) exists in the spec', () => {
    expect(section3_2.length, '§3.2 must be present in the spec').toBeGreaterThan(0);
  });

  it('§3.2 surfaces the remediated_by edge type (Phase 1 deliverable)', () => {
    // The spec must mention the `remediated_by` edge type in §3.2 so a
    // reader navigating the state model can find the misconception-loop
    // seam. This is the FR1 cross-reference the plan task asks for.
    expect(section3_2, '§3.2 must mention remediated_by').toMatch(/remediated_by/);
  });

  it('§3.2 cross-references §9 (Misconception Remediation Loop) or its subsections', () => {
    // The plan task asks for a cross-reference to the misconception-loop
    // section. §3.2 must point at §9 (or a specific §9.X) so the spec
    // is a navigable document, not a collection of disjoint sections.
    expect(section3_2, '§3.2 must cross-reference §9 or a §9.X subsection').toMatch(/§9(\.\d)?/);
  });
});

describe('Phase 5 — kst-srs.v2 SPECIFICATION.md §3.7 (new) documents misconception-state interaction', () => {
  const section3_7 = extractSubsection(readSpec(), 3, 7);

  it('§3.7 exists in the spec', () => {
    // The plan task asks for a new §3.7 subsection that documents the
    // misconception lifecycle's interaction with the state model. At
    // HEAD, the spec has §3.1–§3.5 only; §3.7 is missing.
    expect(
      section3_7.length,
      '§3.7 must exist in the spec (currently missing — see Phase 5 plan Task 1)',
    ).toBeGreaterThan(0);
  });

  it('§3.7 references the misconception lifecycle (active/resolved or misconception-loop seam)', () => {
    // The new section must connect the state model to the misconception
    // lifecycle so a reader navigating §3 finds the §9 cross-reference.
    // Either direct mention of the lifecycle states or a cross-reference
    // to §9.3 (Per-Student Lifecycle) is acceptable.
    const hasLifecycle =
      /\bactive\b/i.test(section3_7) &&
      /\bresolved\b/i.test(section3_7);
    const hasCrossRef = /§9\.3/.test(section3_7);
    expect(
      hasLifecycle || hasCrossRef,
      '§3.7 must mention the active/resolved lifecycle or cross-reference §9.3',
    ).toBe(true);
  });
});

describe('Phase 5 — kst-srs.v2 SPECIFICATION.md §8.4 documents rating-cap cross-reference', () => {
  const section8_4 = extractSubsection(readSpec(), 8, 4);

  it('§8.4 (IM3 Problem Bank) exists in the spec', () => {
    expect(section8_4.length, '§8.4 must be present in the spec').toBeGreaterThan(0);
  });

  it('§8.4 surfaces the rating-cap rule (Phase 2 deliverable)', () => {
    // The rating-cap rule (cap at Hard by default, Again only for
    // severe misconceptions) lives in §9.2. The §8.4 placement section
    // describes probes that feed misconception detection, so the spec
    // must cross-reference the rating-cap rule here.
    const mentionsRatingCap = /rating[- ]?cap/i.test(section8_4);
    const crossRefsRule = /§9\.2/.test(section8_4);
    expect(
      mentionsRatingCap || crossRefsRule,
      '§8.4 must mention "rating cap" or cross-reference §9.2',
    ).toBe(true);
  });
});

describe('Phase 5 — kst-srs.v2 SPECIFICATION.md §13.3 (new) documents misconception-lifecycle NFR', () => {
  const section13_3 = extractSubsection(readSpec(), 13, 3);

  it('§13.3 exists in the spec', () => {
    // The plan task asks for a new §13.3 NFR about the misconception
    // lifecycle's purity contract. At HEAD, §13 has bullet points but
    // no numbered subsections.
    expect(
      section13_3.length,
      '§13.3 must exist in the spec (currently missing — see Phase 5 plan Task 1)',
    ).toBeGreaterThan(0);
  });

  it('§13.3 documents the misconception-lifecycle purity / persistence contract', () => {
    // The NFR must surface one of: (a) `runRealT6Loop` is pure, (b) the
    // Convex handlers are the only persistence seam, or (c) stale
    // student state defaults to empty. These are the test-strategy §3
    // "Stale state migration" + "Purity" cross-phase concerns.
    const hasPurityClaim = /pure|purity/i.test(section13_3);
    const hasPersistenceClaim = /convex|persist/i.test(section13_3);
    const hasStaleStateClaim = /stale|default|empty/i.test(section13_3);
    const hasMisconceptionScope = /misconception|remediation|lifecycle/i.test(section13_3);
    expect(
      hasMisconceptionScope && (hasPurityClaim || hasPersistenceClaim || hasStaleStateClaim),
      '§13.3 must scope the misconception-lifecycle purity / persistence / stale-state contract',
    ).toBe(true);
  });
});
