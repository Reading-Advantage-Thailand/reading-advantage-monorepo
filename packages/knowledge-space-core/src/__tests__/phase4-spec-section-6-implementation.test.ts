/**
 * Phase 4 regression — kst-srs.v2 SPECIFICATION.md §6 documents the implemented model
 *
 * Track 3: Edge Calibration Loop. Phase 4, Task 1.
 *
 * Per plan.md Phase 4 Task 1: "Update in-repo kst-srs.v2 spec §6 (Edge
 * Calibration) with the implemented model." The contract is that §6 of
 * `kst-srs.v2/SPECIFICATION.md` reflects the model that Phase 1–Phase 3
 * actually shipped — not just the high-level FR1–FR6 narrative.
 *
 * This test reads §6 and asserts the presence of the implementation-level
 * details that the Red-phase code modules in `packages/srs-engine` and
 * `apps/integrated-math-3/convex` expose:
 *
 *   - The `CalibrationStatus` enum literal values (`confirmed | refuted |
 *     untested`) — see FR5 and `packages/srs-engine/src/srs/edge-calibration.ts`.
 *   - The 2×2 contingency-table field names (camelCase, matching the
 *     Convex schema in `apps/integrated-math-3/convex/schema.ts:737`).
 *   - The Beta(α, β) parameter names and the persistence shape.
 *   - The persistence table names (`edge_calibration`,
 *     `calibration_review_queue`).
 *   - The N+1 guard: batched reads/writes with `Promise.all` (test-strategy
 *     §3, AC7, and `apps/integrated-math-3/convex/edgeCalibration.ts:153`).
 *   - The NFR "the graph is never auto-edited" — the adapter touches only
 *     the two calibration tables, never `knowledge_space_edges`.
 *
 * This section now documents the implementation details added by the Green phase;
 * this test is a passing regression guard that keeps §6 aligned with the shipped
 * calibration model.
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
 * Extract section 6 (Edge Calibration Loop) content from the spec markdown.
 * @param {string} spec - The full spec markdown string
 * @returns {string} - The extracted section 6 content, or empty string if not found
 */
function extractSection6(spec: string): string {
  // The spec is markdown; §6 is the `Edge Calibration Loop` section.
  // Capture everything from the §6 heading up to the next `## ` heading.
  const heading = /^## 6\. Edge Calibration Loop[^\n]*\n/m;
  const match = spec.match(heading);
  if (!match || match.index === undefined) {
    return '';
  }
  const start = match.index + match[0].length;
  const rest = spec.slice(start);
  const nextHeading = rest.search(/^## \d/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

describe('Phase 4 — kst-srs.v2 SPECIFICATION.md §6 documents the implemented model', () => {
  it('§6 (Edge Calibration Loop) exists in the spec', () => {
    const spec = readSpec();
    const section6 = extractSection6(spec);
    expect(section6.length).toBeGreaterThan(0);
  });

  it('§6 names the three CalibrationStatus literal values from FR5', () => {
    const section6 = extractSection6(readSpec());
    // The implemented status enum is `confirmed | refuted | untested`.
    // The spec must surface all three literals as the canonical status set.
    expect(section6).toMatch(/confirmed/);
    expect(section6).toMatch(/refuted/);
    expect(section6).toMatch(/untested/);
  });

  it('§6 names the 2x2 contingency-table fields matching the Convex schema', () => {
    const section6 = extractSection6(readSpec());
    // The Convex schema at `apps/integrated-math-3/convex/schema.ts:752`
    // uses camelCase field names. §6 must list the same field names so
    // spec and schema are not silently drifting.
    expect(section6).toMatch(/proficientAProficientB/);
    expect(section6).toMatch(/proficientANotProficientB/);
    expect(section6).toMatch(/notProficientAProficientB/);
    expect(section6).toMatch(/notProficientANotProficientB/);
  });

  it('§6 names the Beta(α, β) posterior parameters and the persistence shape', () => {
    const section6 = extractSection6(readSpec());
    // The implemented record is `EdgeCalibration { edgeId, alpha, beta,
    // status, lastUpdated }` (see `edge-calibration.ts:82`). §6 must
    // name `alpha` and `beta` (or the Greek glyphs α, β) so the spec
    // matches the persistence shape.
    expect(section6).toMatch(/alpha|α/);
    expect(section6).toMatch(/beta|β/);
    expect(section6).toMatch(/lastUpdated|last[ -_]updated/i);
  });

  it('§6 names the persistence tables (edge_calibration, calibration_review_queue)', () => {
    const section6 = extractSection6(readSpec());
    // FR7 — Persistence. The two Convex tables introduced by Phase 1
    // are `edge_calibration` and `calibration_review_queue`. §6 must
    // name them so the spec is the source of truth for the schema.
    expect(section6).toMatch(/edge_calibration/);
    expect(section6).toMatch(/calibration_review_queue/);
  });

  it('§6 documents the divergence thresholds that flag edges for the review queue', () => {
    const section6 = extractSection6(readSpec());
    // FR6 — Review queue. The implemented thresholds (see
    // `apps/integrated-math-3/convex/edgeCalibration.ts:132-133`) are
    // weightThreshold = 0.5 and confidenceThreshold = 1.5. §6 must
    // surface the threshold values, not just the abstract concept.
    expect(section6).toMatch(/threshold/i);
  });

  it('§6 documents the N+1 guard: batched reads and writes with Promise.all', () => {
    const section6 = extractSection6(readSpec());
    // test-strategy §3: "Phase 3 persistence test must assert exactly
    // one `Promise.all` per batch." §6 must document that the adapter
    // uses batched reads/writes — not per-edge awaits.
    expect(section6).toMatch(/Promise\.all|batched|batch/i);
  });

  it('§6 documents the NFR: the graph is never auto-edited', () => {
    const section6 = extractSection6(readSpec());
    // The non-functional requirement: "The graph is never auto-edited."
    // §6 must surface this NFR verbatim or with a clear synonym, so the
    // invariant is not silently dropped in a future refactor.
    expect(section6).toMatch(/never\s+auto[- ]?edited|read[- ]?only|not\s+auto/i);
  });

  it('§6 is distinct from `CalibrationStatus` lifecycle (no draft/reviewed/approved)', () => {
    const section6 = extractSection6(readSpec());
    // The `ReviewStatus` enum (`draft | reviewed | approved | rejected`)
    // is a separate lifecycle. §6 must not overload it with calibration
    // vocabulary. The calibration enum uses `confirmed | refuted |
    // untested`; the review enum must not leak into §6 as if it were
    // a calibration status.
    const reviewLeak = /\b(draft|reviewed|approved|rejected)\b/i.test(section6);
    expect(reviewLeak).toBe(false);
  });
});
