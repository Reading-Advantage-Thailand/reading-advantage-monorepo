import { describe, it, expect } from 'vitest';

import {
  priorityWeightsSchema,
  type PriorityScore,
  type PlannerInput,
  type PlannerOutput,
} from '../planner/types.js';

describe('Planner contract — priority weights schema', () => {
  describe('Zod parse rejects invalid weights', () => {
    it('rejects negative a weight', () => {
      const result = priorityWeightsSchema.safeParse({ a: -1, b: 1, c: 1, d: 1, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative b weight', () => {
      const result = priorityWeightsSchema.safeParse({ a: 1, b: -0.1, c: 1, d: 1, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative c weight', () => {
      const result = priorityWeightsSchema.safeParse({ a: 1, b: 1, c: -0.01, d: 1, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative d weight', () => {
      const result = priorityWeightsSchema.safeParse({ a: 1, b: 1, c: 1, d: -2, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects NaN', () => {
      const result = priorityWeightsSchema.safeParse({ a: NaN, b: 1, c: 1, d: 1, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects Infinity', () => {
      const result = priorityWeightsSchema.safeParse({ a: Infinity, b: 1, c: 1, d: 1, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects string values', () => {
      const result = priorityWeightsSchema.safeParse({ a: '1' as unknown, b: 1, c: 1, d: 1, e: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects unknown extra keys beyond the v3.2 a/b/c/d/e contract', () => {
      const result = priorityWeightsSchema.safeParse({
        a: 1,
        b: 1,
        c: 1,
        d: 1,
        e: 1,
        f: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown extra keys when value type is invalid (defense-in-depth)', () => {
      const result = priorityWeightsSchema.safeParse({
        a: 1,
        b: 1,
        c: 1,
        d: 1,
        e: 0,
        unknownWeight: 'high',
      });
      expect(result.success).toBe(false);
    });
  });

  it('accepts valid zero and positive weights', () => {
    const result = priorityWeightsSchema.safeParse({ a: 0, b: 0.5, c: 1, d: 0, e: 0.25 });
    expect(result.success).toBe(true);
  });

  it('accepts default equal weights', () => {
    const result = priorityWeightsSchema.safeParse({ a: 1, b: 1, c: 1, d: 1, e: 1 });
    expect(result.success).toBe(true);
  });
});

describe('Planner contract — PriorityScore discriminated union', () => {
  function assertNever(_value: never): never {
    throw new Error('Unhandled PriorityScore variant');
  }

  it('PriorityScore discriminator is exhaustively handled by TypeScript', () => {
    function renderScoreLabel(score: PriorityScore): string {
      switch (score.kind) {
        case 'ranked':
          return `Ranked: ${score.composite.toFixed(3)}`;
        case 'unranked':
          return `Unranked: ${score.reason}`;
        case 'mastered':
          return 'Mastered';
        default:
          return assertNever(score);
      }
    }

    const ranked: PriorityScore = {
      kind: 'ranked',
      nodeId: 'test-node',
      composite: 0.85,
      terms: {
        readiness: 0.9,
        unlockValue: 0.7,
        goalProximity: 0.5,
        weaknessFit: 0.0,
        utility: 0.0,
      },
    };
    expect(renderScoreLabel(ranked)).toBe('Ranked: 0.850');

    const mastered: PriorityScore = {
      kind: 'mastered',
      nodeId: 'test-node-2',
    };
    expect(renderScoreLabel(mastered)).toBe('Mastered');

    const unranked: PriorityScore = {
      kind: 'unranked',
      nodeId: 'test-node-3',
      reason: 'blocked',
    };
    expect(renderScoreLabel(unranked)).toBe('Unranked: blocked');
  });
});

describe('Planner contract — input/output type shapes', () => {
  it('PlannerInput accepts readiness, goals, weights, and misconception links', () => {
    const input: PlannerInput = {
      nodes: [{ id: 'n1', kind: 'skill', title: 'Test', domain: 'math' }],
      edges: [{ id: 'e1', type: 'prerequisite_for', sourceId: 'n1', targetId: 'n2', weight: 1 }],
      readinessByNode: { n1: 0.5, n2: 0.8 },
      goalNodeIds: ['n2'],
      misconceptionLinks: [],
    };
    expect(input).toBeDefined();
    expect(input.readinessByNode['n1']).toBe(0.5);
  });

  it('PlannerOutput includes scores and recommendedNext', () => {
    const output: PlannerOutput = {
      scores: [
        {
          kind: 'ranked',
          nodeId: 'n1',
          composite: 0.75,
          terms: {
            readiness: 0.9,
            unlockValue: 0.6,
            goalProximity: 0.4,
            weaknessFit: 0.0,
            utility: 0.0,
          },
        },
      ],
      recommendedNext: ['n1'],
    };
    expect(output.scores).toHaveLength(1);
    expect(output.recommendedNext).toEqual(['n1']);
  });
});
