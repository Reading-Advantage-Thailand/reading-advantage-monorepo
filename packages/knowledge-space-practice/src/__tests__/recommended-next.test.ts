/**
 * Phase 3 (Track 4 next-skill-planner_20260521) — Red direct unit
 * tests for the `getRecommendedNext` top-N ranker.
 *
 * v3.2 ranks only the ready/nearly-ready fringe (readiness at least 0.50)
 * by normalized composite priority. Unknown and blocked candidates are
 * deliberately excluded; ties use `nodeId.localeCompare` ascending.
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 *   `packages/knowledge-space-practice/src/planner/recommended-next.ts`
 *     - `getRecommendedNext(input, weights, topN?): readonly string[]`
 *
 * Test approach: pure unit, no I/O, no app/Convex imports. Each case
 * uses hand-rolled `PlannerInput` fixtures from `planner-fixtures.ts`.
 * Hand-calculated expected values leverage the per-term test
 * contracts (unlock-value, goal-proximity, weakness-fit) and the
 * `priority` composite. The Red failure is `TypeError:
 * getRecommendedNext is not a function` from the missing module
 * exports — not durable-record staleness.
 *
 * Determinism: every fixture is deterministic; assertions do not
 * depend on iteration order or shared state. The test for ties
 * feeds the ranker nodes whose composite priority is equal under
 * the chosen weights, then asserts the ranker falls back to
 * `nodeId.localeCompare` ascending.
 */

import { describe, expect, it } from 'vitest';

import { getRecommendedNext } from '../planner/recommended-next.js';
import {
  makePlannerChain,
  makePlannerEmpty,
  defaultPriorityWeights,
} from './planner-fixtures.js';

const READY = { 'chain.n1': 1, 'chain.n2': 1, 'chain.n3': 1, 'chain.n4': 1 } as const;

// ---------------------------------------------------------------------------
// Empty / degenerate inputs
// ---------------------------------------------------------------------------

describe('recommendedNext — empty graph', () => {
  it('returns an empty list for an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([]);
  });
});

describe('recommendedNext — single node', () => {
  it('returns the single node id when the graph has one node', () => {
    const graph = makePlannerChain({ length: 1, goalIds: ['chain.n1'], readiness: READY });
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual(['chain.n1']);
  });
});

// ---------------------------------------------------------------------------
// Top-N by priority descending
// ---------------------------------------------------------------------------

describe('recommendedNext — top-N by priority (default weights)', () => {
  it('returns nodes sorted by priority descending (chain.n1 wins, chain.n4 last)', () => {
    // chain.n1 -> chain.n2 -> chain.n3 -> chain.n4, goal = n4
    // With equal readiness, normalized unlock reach keeps upstream skills
    // first; n3/n4 tie and fall back to node id.
    // Expected order: n1, n2, n3, n4
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([
      'chain.n1',
      'chain.n2',
      'chain.n3',
      'chain.n4',
    ]);
  });

  it('topN=2 returns the two highest-priority nodes', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    expect(getRecommendedNext(graph, defaultPriorityWeights, 2)).toEqual(['chain.n1', 'chain.n2']);
  });

  it('topN=3 returns the three highest-priority nodes', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    expect(getRecommendedNext(graph, defaultPriorityWeights, 3)).toEqual([
      'chain.n1',
      'chain.n2',
      'chain.n3',
    ]);
  });

  it('topN larger than the graph size returns every node', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    expect(getRecommendedNext(graph, defaultPriorityWeights, 100)).toEqual([
      'chain.n1',
      'chain.n2',
      'chain.n3',
      'chain.n4',
    ]);
  });

  it('topN=0 returns an empty list', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    expect(getRecommendedNext(graph, defaultPriorityWeights, 0)).toEqual([]);
  });

  it('default topN is 5 (matches current visualization slice-of-5)', () => {
    // chain length 7 ensures the default slice truncates to 5
    const readiness = Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [`chain.n${index + 1}`, 1]),
    );
    const graph = makePlannerChain({ length: 7, goalIds: ['chain.n7'], readiness });
    const result = getRecommendedNext(graph, defaultPriorityWeights);
    expect(result).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Single-weight regression (sanity check)
// ---------------------------------------------------------------------------

describe('recommendedNext — single-weight regression (b=0 collapses to readiness-only)', () => {
  it('readiness-only weights sort by readiness descending, then nodeId tie-break', () => {
    // With b=c=d=0 and a=1, the composite is just readiness.
    const readiness = { 'chain.n1': 0.6, 'chain.n2': 0.7, 'chain.n3': 0.8, 'chain.n4': 0.9 };
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness });
    const weights = { a: 1, b: 0, c: 0, d: 0 };
    expect(getRecommendedNext(graph, weights)).toEqual([
      'chain.n4',
      'chain.n3',
      'chain.n2',
      'chain.n1',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Ready/nearly-ready fringe
// ---------------------------------------------------------------------------

describe('recommendedNext — v3.2 ready/nearly-ready fringe', () => {
  it('includes ready and nearly-ready nodes while excluding below-threshold nodes', () => {
    const readiness = { 'chain.n1': 0.8, 'chain.n2': 0.7, 'chain.n3': 0.49, 'chain.n4': 0.5 } as const;
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness });
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([
      'chain.n1',
      'chain.n2',
      'chain.n4',
    ]);
  });

  it('excludes nodes with missing readiness instead of treating them as fallback candidates', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'] });
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tie-break stability
// ---------------------------------------------------------------------------

describe('recommendedNext — tie-break stability (nodeId.localeCompare ascending)', () => {
  it('falls back to nodeId.localeCompare ascending when priority is tied', () => {
    // Hand-rolled graph: 3 nodes, no edges (so unlockValue=0 and
    // goalProximity=0 everywhere). readiness: tied at 0.5 for all
    // three. weaknessFit=0. Composite is the same for every node:
    //   1*0.5 + 1*0 + 1*0 + 1*0 = 0.5
    // Tie-break is by nodeId.localeCompare ascending.
    const graph = {
      nodes: [
        { id: 'tie.c', kind: 'skill', title: 'C', domain: 'math.test.planner' },
        { id: 'tie.a', kind: 'skill', title: 'A', domain: 'math.test.planner' },
        { id: 'tie.b', kind: 'skill', title: 'B', domain: 'math.test.planner' },
      ],
      edges: [],
      readinessByNode: { 'tie.a': 0.5, 'tie.b': 0.5, 'tie.c': 0.5 },
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual(['tie.a', 'tie.b', 'tie.c']);
  });
});

// ---------------------------------------------------------------------------
// Determinism and purity
// ---------------------------------------------------------------------------

describe('recommendedNext — determinism and purity', () => {
  it('repeated calls with the same input return the same output', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    const first = getRecommendedNext(graph, defaultPriorityWeights);
    const second = getRecommendedNext(graph, defaultPriorityWeights);
    const third = getRecommendedNext(graph, defaultPriorityWeights);
    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });

  it('does not mutate the input PlannerInput', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: READY });
    const snap = JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
      readinessByNode: graph.readinessByNode,
      goalNodeIds: graph.goalNodeIds,
      misconceptionLinks: graph.misconceptionLinks,
    });
    getRecommendedNext(graph, defaultPriorityWeights);
    getRecommendedNext(graph, defaultPriorityWeights, 3);
    expect(
      JSON.stringify({
        nodes: graph.nodes,
        edges: graph.edges,
        readinessByNode: graph.readinessByNode,
        goalNodeIds: graph.goalNodeIds,
        misconceptionLinks: graph.misconceptionLinks,
      }),
    ).toBe(snap);
  });
});
