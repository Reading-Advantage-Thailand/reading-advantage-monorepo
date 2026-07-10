import { describe, expect, it } from 'vitest';

import { computeUnlockValues } from '../planner/unlock-value.js';
import { getRecommendedNext } from '../planner/recommended-next.js';
import * as plannerTypes from '../planner/types.js';
import type { PlannerInput } from '../planner/types.js';

const SPEC_VERSION = 'kst-srs.v3.2';
const CONFIG_VERSION = 'planner.v3.2';

function node(id: string) {
  return { id, kind: 'skill', title: id, domain: 'synthetic.v32' };
}

function edge(id: string, type: string, sourceId: string, targetId: string) {
  return { id, type, sourceId, targetId, weight: 1 };
}

describe(`${SPEC_VERSION} §10.1 normalized priority`, () => {
  it('requires the versioned five-term default weight contract', () => {
    expect(CONFIG_VERSION).toBe('planner.v3.2');
    expect(() =>
      plannerTypes.priorityWeightsSchema.parse({
        a: 0.35,
        b: 0.2,
        c: 0.15,
        d: 0.1,
        e: 0.2,
      }),
    ).not.toThrow();

    expect(
      (plannerTypes as typeof plannerTypes & {
        DEFAULT_PRIORITY_WEIGHTS?: Record<string, number>;
      }).DEFAULT_PRIORITY_WEIGHTS,
    ).toEqual({ a: 0.35, b: 0.2, c: 0.15, d: 0.1, e: 0.2 });
  });

  it('normalizes downstream reach with ln(1+reach)/ln(1+maxReach)', () => {
    const input: PlannerInput = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [
        edge('a-b', 'prerequisite_for', 'a', 'b'),
        edge('b-c', 'prerequisite_for', 'b', 'c'),
        edge('c-d', 'prerequisite_for', 'c', 'd'),
      ],
      readinessByNode: {},
      goalNodeIds: [],
      misconceptionLinks: [],
    };

    const values = computeUnlockValues(input);
    expect(values.get('a')).toBeCloseTo(1, 10);
    expect(values.get('b')).toBeCloseTo(Math.log(3) / Math.log(4), 10);
    expect(values.get('c')).toBeCloseTo(Math.log(2) / Math.log(4), 10);
    expect(values.get('d')).toBe(0);
    expect([...values.values()].every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});

describe(`${SPEC_VERSION} §10.2 deterministic diversity cap`, () => {
  it('returns at most two candidates per nearest contains ancestor', () => {
    const input: PlannerInput = {
      nodes: [node('a1'), node('a2'), node('a3'), node('b1'), node('b2')],
      edges: [
        edge('unit-a-a1', 'contains', 'unit-a', 'a1'),
        edge('unit-a-a2', 'contains', 'unit-a', 'a2'),
        edge('unit-a-a3', 'contains', 'unit-a', 'a3'),
        edge('unit-b-b1', 'contains', 'unit-b', 'b1'),
        edge('unit-b-b2', 'contains', 'unit-b', 'b2'),
      ],
      readinessByNode: { a1: 1, a2: 0.99, a3: 0.98, b1: 0.97, b2: 0.96 },
      goalNodeIds: [],
      misconceptionLinks: [],
    };

    const result = getRecommendedNext(
      input,
      { a: 1, b: 0, c: 0, d: 0, e: 0 } as never,
      4,
    );

    expect(result).toEqual(['a1', 'a2', 'b1', 'b2']);
    expect(result).not.toContain('a3');
  });
});
