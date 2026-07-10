import { describe, it, expect } from 'vitest';
import { CORE_ID_PATTERN } from '../schemas.js';
import type { ConfidenceLevel } from '../types.js';
import {
  placementResultSchema,
  placementResultsSchema,
  isPlacementResult,
  PROBE_RESULTS,
  probeResultSchema,
  type PlacementResult,
  type ProbeResult,
  type ProbeAdapter,
} from '../placement.js';
import { syntheticMathFixture } from '../fixtures.js';

// ---------------------------------------------------------------------------
// Task 1.1.a — placementResultSchema accepts the canonical shape
// ---------------------------------------------------------------------------

describe('placementResultSchema', () => {
  it('parses a valid low-confidence PlacementResult', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring',
      masteryEstimate: 0.5,
      confidence: 'low',
    });
    expect(result.success, result.error?.message).toBe(true);
    if (result.success) {
      expect(result.data.nodeId).toBe('math.im3.skill.m1.l2.solve-quadratic-by-factoring');
      expect(result.data.masteryEstimate).toBe(0.5);
      expect(result.data.confidence).toBe('low');
    }
  });

  it('parses a valid medium-confidence PlacementResult with metadata', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.75,
      confidence: 'medium',
      metadata: { probedAt: '2026-05-21T00:00:00Z', probeCount: 3 },
    });
    expect(result.success, result.error?.message).toBe(true);
    if (result.success) {
      expect(result.data.metadata?.probedAt).toBe('2026-05-21T00:00:00Z');
      expect(result.data.metadata?.probeCount).toBe(3);
    }
  });

  it('rejects an empty nodeId', () => {
    const result = placementResultSchema.safeParse({
      nodeId: '',
      masteryEstimate: 0.5,
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a nodeId that violates the core ID pattern', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'BAD ID',
      masteryEstimate: 0.5,
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a masteryEstimate below 0', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: -0.1,
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a masteryEstimate above 1', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 1.1,
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('accepts masteryEstimate boundaries 0 and 1 inclusive', () => {
    for (const value of [0, 1]) {
      const result = placementResultSchema.safeParse({
        nodeId: 'math.im3.skill.m1.l2.identify-roots',
        masteryEstimate: value,
        confidence: 'low',
      });
      expect(result.success, `masteryEstimate=${value} should be valid`).toBe(true);
    }
  });

  it('rejects a confidence value outside the placement allow-list', () => {
    // Placement seeds are low/medium only; "high" must be rejected here
    // even though ConfidenceLevel permits it.
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
      confidence: 'high',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('confidence'))).toBe(true);
    }
  });

  it('rejects an unknown confidence string', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
      confidence: 'maybe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric masteryEstimate', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: '0.5',
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing nodeId', () => {
    const result = placementResultSchema.safeParse({
      masteryEstimate: 0.5,
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing masteryEstimate', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing confidence', () => {
    const result = placementResultSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 1.1.b — placementResultsSchema round-trips an array of PlacementResults
// ---------------------------------------------------------------------------

describe('placementResultsSchema', () => {
  it('parses an empty array', () => {
    const result = placementResultsSchema.safeParse([]);
    expect(result.success, result.error?.message).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it('parses a multi-result batch', () => {
    const batch = [
      { nodeId: 'math.im3.skill.m1.l2.identify-roots', masteryEstimate: 0.8, confidence: 'medium' as const },
      { nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring', masteryEstimate: 0.3, confidence: 'low' as const },
    ];
    const result = placementResultsSchema.safeParse(batch);
    expect(result.success, result.error?.message).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('rejects an array containing an invalid entry', () => {
    const batch = [
      { nodeId: 'math.im3.skill.m1.l2.identify-roots', masteryEstimate: 0.8, confidence: 'medium' as const },
      { nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring', masteryEstimate: 0.3, confidence: 'high' as const },
    ];
    const result = placementResultsSchema.safeParse(batch);
    expect(result.success).toBe(false);
  });

  it('rejects a non-array input', () => {
    const result = placementResultsSchema.safeParse({
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
      confidence: 'low',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 1.1.c — schema composes with the existing knowledgeSpaceSchema
// ---------------------------------------------------------------------------

describe('placement contract — schema composition', () => {
  it('every PlacementResult nodeId matches the core ID pattern', () => {
    const valid: PlacementResult = {
      nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring',
      masteryEstimate: 0.5,
      confidence: 'low',
    };
    expect(CORE_ID_PATTERN.test(valid.nodeId)).toBe(true);
  });

  it('synthetic fixture node IDs are usable as placement nodeId targets', () => {
    for (const node of syntheticMathFixture.nodes) {
      const result = placementResultSchema.safeParse({
        nodeId: node.id,
        masteryEstimate: 0.5,
        confidence: 'low',
      });
      expect(result.success, `nodeId ${node.id} should be valid placement target`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 1.1.d — isPlacementResult type guard
// ---------------------------------------------------------------------------

describe('isPlacementResult', () => {
  it('returns true for a valid PlacementResult', () => {
    const value: unknown = {
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
      confidence: 'low',
    };
    expect(isPlacementResult(value)).toBe(true);
  });

  it('returns true for a PlacementResult with optional metadata', () => {
    const value: unknown = {
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
      confidence: 'medium',
      metadata: { probeCount: 2 },
    };
    expect(isPlacementResult(value)).toBe(true);
  });

  it('returns false for an object missing confidence', () => {
    const value: unknown = {
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
    };
    expect(isPlacementResult(value)).toBe(false);
  });

  it('returns false for an object with high confidence (placement must be low/medium)', () => {
    const value: unknown = {
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 0.5,
      confidence: 'high',
    };
    expect(isPlacementResult(value)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPlacementResult(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPlacementResult(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isPlacementResult('placement')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isPlacementResult(0.5)).toBe(false);
  });

  it('returns false for a primitive boolean', () => {
    expect(isPlacementResult(true)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isPlacementResult([])).toBe(false);
  });

  it('returns false for a PlacementResult with masteryEstimate out of range', () => {
    const value: unknown = {
      nodeId: 'math.im3.skill.m1.l2.identify-roots',
      masteryEstimate: 1.5,
      confidence: 'low',
    };
    expect(isPlacementResult(value)).toBe(false);
  });

  it('returns false for a PlacementResult with non-string nodeId', () => {
    const value: unknown = {
      nodeId: 42,
      masteryEstimate: 0.5,
      confidence: 'low',
    };
    expect(isPlacementResult(value)).toBe(false);
  });

  it('narrowing: an array of unknowns narrows to a non-empty PlacementResult array', () => {
    const candidates: unknown[] = [
      { nodeId: 'math.im3.skill.m1.l2.identify-roots', masteryEstimate: 0.5, confidence: 'low' as ConfidenceLevel },
      { nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring', masteryEstimate: 0.7, confidence: 'medium' as ConfidenceLevel },
    ];
    const narrowed: PlacementResult[] = candidates.filter(isPlacementResult);
    expect(narrowed).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Task 1.1.e — ProbeResult enum and probeResultSchema
// ---------------------------------------------------------------------------

describe('probeResultSchema / PROBE_RESULTS', () => {
  it('exposes the canonical ProbeResult set', () => {
    expect(new Set(PROBE_RESULTS)).toEqual(new Set(['pass', 'fail', 'partial']));
  });

  it('parses each canonical ProbeResult value', () => {
    for (const value of PROBE_RESULTS) {
      const result = probeResultSchema.safeParse(value);
      expect(result.success, `expected "${value}" to parse`).toBe(true);
    }
  });

  it('rejects unknown probe results', () => {
    const result = probeResultSchema.safeParse('maybe');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = probeResultSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects non-string values', () => {
    for (const value of [1, true, null, undefined, {}, []]) {
      const result = probeResultSchema.safeParse(value);
      expect(result.success, `expected ${JSON.stringify(value)} to be rejected`).toBe(false);
    }
  });

  it('PROBE_RESULTS is a non-empty readonly array of distinct strings', () => {
    expect(Array.isArray(PROBE_RESULTS)).toBe(true);
    expect(PROBE_RESULTS.length).toBeGreaterThan(0);
    const set = new Set<string>(PROBE_RESULTS);
    expect(set.size).toBe(PROBE_RESULTS.length);
  });
});

// ---------------------------------------------------------------------------
// Task 1.1.f — ProbeAdapter interface shape
// ---------------------------------------------------------------------------

describe('ProbeAdapter', () => {
  it('can be implemented by a domain supplying a synchronous probe map', () => {
    const preset: Record<string, ProbeResult> = {
      'math.im3.skill.m1.l2.identify-roots': 'pass',
      'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'fail',
    };
    const adapter: ProbeAdapter = {
      domain: 'math.im3',
      probe(nodeId: string): ProbeResult {
        return preset[nodeId] ?? 'partial';
      },
    };
    expect(adapter.domain).toBe('math.im3');
    expect(adapter.probe('math.im3.skill.m1.l2.identify-roots')).toBe<ProbeResult>('pass');
    expect(adapter.probe('math.im3.skill.m1.l2.solve-quadratic-by-factoring')).toBe<ProbeResult>('fail');
    expect(adapter.probe('math.im3.skill.m1.l2.unknown')).toBe<ProbeResult>('partial');
  });

  it('returns only canonical ProbeResult values from any conforming adapter', () => {
    const validResults: ReadonlySet<ProbeResult> = new Set(PROBE_RESULTS);
    const adapter: ProbeAdapter = {
      domain: 'math.im3',
      probe: (nodeId: string): ProbeResult => {
        if (nodeId.endsWith('.a')) return 'pass';
        if (nodeId.endsWith('.b')) return 'fail';
        return 'partial';
      },
    };
    for (const id of ['node.a', 'node.b', 'node.c']) {
      const result = adapter.probe(id);
      expect(validResults.has(result as ProbeResult), `adapter returned non-canonical value for ${id}`).toBe(true);
    }
  });

  it('is a structural interface — no domain imports required to type-check', () => {
    // A no-op adapter demonstrates the interface is purely structural.
    const adapter: ProbeAdapter = {
      domain: 'test',
      probe: () => 'partial',
    };
    expect(typeof adapter.probe).toBe('function');
  });

  it('an async probe implementation is also assignable when returning a Promise<ProbeResult>', () => {
    const asyncAdapter: ProbeAdapter = {
      domain: 'test',
      probe: async (nodeId: string): Promise<ProbeResult> => {
        if (!nodeId) return 'partial';
        return 'pass';
      },
    };
    return expect(asyncAdapter.probe('x')).resolves.toBe('pass');
  });
});

// ---------------------------------------------------------------------------
// Task 1.1.g — Round-trip with syntheticMathFixture
// ---------------------------------------------------------------------------

describe('placement contract — round-trip with synthetic fixture', () => {
  it('every fixture node can be the target of a placement result', () => {
    for (const node of syntheticMathFixture.nodes) {
      const result = placementResultSchema.safeParse({
        nodeId: node.id,
        masteryEstimate: 0.5,
        confidence: 'low',
      });
      expect(result.success, `node ${node.id} should be a valid placement target`).toBe(true);
    }
  });

  it('the prerequisite chain in the fixture produces a valid two-result batch', () => {
    const batch = [
      { nodeId: 'math.im3.skill.m1.l2.identify-roots', masteryEstimate: 0.8, confidence: 'medium' as const },
      { nodeId: 'math.im3.skill.m1.l2.solve-quadratic-by-factoring', masteryEstimate: 0.4, confidence: 'low' as const },
    ];
    const result = placementResultsSchema.safeParse(batch);
    expect(result.success, result.error?.message).toBe(true);
  });
});
