// Tests for the domain-neutral PlacementResult → knowledge-state seed
// mapping. The deferred Phase 1 integration test (test-strategy.md §5
// Phase 1, item 3) — "Verify `PlacementResult` can feed into
// `getKnowledgeState` shape" — depends on a domain-neutral
// `buildKnowledgeStateSeed` (or equivalent) helper that the placement
// contract module exposes. That helper is the contract-layer function
// that converts a `PlacementResult[]` into a `KnowledgeStateSeed[]` whose
// shape is compatible with Track 1's eventual `getKnowledgeState`
// contract.
//
// These tests assert that contract (preserve nodeId / masteryEstimate /
// confidence, tag with source === "placement", attach a numeric
// seededAt, validate against the placement result schema, do not
// mutate the input, reject invalid confidence / out-of-range mastery).
// The IM3-specific `buildPlacementKnowledgeStateSeed` lives in
// `apps/integrated-math-3/lib/placement/seed-knowledge-state.ts` and is
// a thin wrapper over this domain-neutral helper.

import { describe, it, expect } from 'vitest';
import type { PlacementResult } from '../placement.js';
import { placementResultSchema } from '../placement.js';
// Importing the contract-layer helper that the test exercises. The
// domain-neutral `buildKnowledgeStateSeed` is exported from
// `../placement.ts` (the contract module). The IM3-specific
// `apps/integrated-math-3/lib/placement/seed-knowledge-state.ts`
// delegates to it.
import { buildKnowledgeStateSeed } from '../placement.js';
import type { KnowledgeStateSeed } from '../placement.js';

// ---------------------------------------------------------------------------
// Shape compatibility — KnowledgeStateSeed must extend PlacementResult
// ---------------------------------------------------------------------------

describe('buildKnowledgeStateSeed (Phase 1 deferred integration test prerequisite)', () => {
  it('is exported from the placement contract module', () => {
    expect(typeof buildKnowledgeStateSeed).toBe('function');
  });

  it('returns an empty array for an empty input', () => {
    const out = buildKnowledgeStateSeed([]);
    expect(out).toEqual([]);
  });

  it('preserves nodeId, masteryEstimate, and confidence from each input result', () => {
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.8,
        confidence: 'medium',
      },
      {
        nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring',
        masteryEstimate: 0.3,
        confidence: 'low',
      },
    ];
    const out = buildKnowledgeStateSeed(input);
    expect(out).toHaveLength(2);
    expect(out[0]?.nodeId).toBe('math.im3.skill.m1.l2.identify-roots');
    expect(out[0]?.masteryEstimate).toBe(0.8);
    expect(out[0]?.confidence).toBe('medium');
    expect(out[1]?.nodeId).toBe('math.im3.skill.m1.l2.solve-quadratic-by-factoring');
    expect(out[1]?.masteryEstimate).toBe(0.3);
    expect(out[1]?.confidence).toBe('low');
  });

  it('tags every produced seed with source === "placement"', () => {
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'low',
      },
    ];
    const out = buildKnowledgeStateSeed(input);
    for (const seed of out) {
      expect(seed.source).toBe('placement');
    }
  });

  it('attaches a numeric seededAt timestamp to every seed', () => {
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'low',
      },
    ];
    const out = buildKnowledgeStateSeed(input);
    for (const seed of out) {
      expect(typeof seed.seededAt).toBe('number');
      expect(Number.isFinite(seed.seededAt)).toBe(true);
    }
  });

  it('uses the provided `now` option verbatim when supplied', () => {
    const now = 1_700_000_000_000;
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'low',
      },
    ];
    const out = buildKnowledgeStateSeed(input, { now });
    expect(out[0]?.seededAt).toBe(now);
  });

  it('produces an output that validates against placementResultSchema-equivalent shape', () => {
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'low',
      },
    ];
    const out = buildKnowledgeStateSeed(input);
    for (const seed of out) {
      // A KnowledgeStateSeed must satisfy the placement result shape too
      // (it is a strict superset), so the placement schema must still
      // accept it. The added `source` and `seededAt` fields are
      // ignored by the schema (passthrough).
      const parsed = placementResultSchema.safeParse(seed);
      expect(parsed.success, `seed ${seed.nodeId} should validate`).toBe(true);
    }
  });

  it('does not mutate the input array', () => {
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'low',
      },
    ];
    const snapshot = JSON.parse(JSON.stringify(input));
    buildKnowledgeStateSeed(input);
    expect(input).toEqual(snapshot);
  });

  it('rejects a result whose confidence is "high" (placement contract: low/medium only)', () => {
    const input = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'high' as const,
      },
    ];
    expect(() => buildKnowledgeStateSeed(input as unknown as PlacementResult[])).toThrow();
  });

  it('rejects a result whose masteryEstimate is out of [0, 1]', () => {
    const tooHigh = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 1.5,
        confidence: 'low' as const,
      },
    ];
    expect(() => buildKnowledgeStateSeed(tooHigh)).toThrow();
    const tooLow = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: -0.1,
        confidence: 'low' as const,
      },
    ];
    expect(() => buildKnowledgeStateSeed(tooLow)).toThrow();
  });

  it('KnowledgeStateSeed type is assignable from the buildKnowledgeStateSeed return value', () => {
    const input: PlacementResult[] = [
      {
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: 0.5,
        confidence: 'low',
      },
    ];
    const out: ReadonlyArray<KnowledgeStateSeed> = buildKnowledgeStateSeed(input);
    expect(out).toHaveLength(1);
  });
});
