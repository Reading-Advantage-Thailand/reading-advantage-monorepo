/**
 * Phase 3 (Track 4 next-skill-planner_20260521) — Red direct unit
 * tests for the composite `priority(B)` scoring function.
 *
 * Per spec FR4 + kst-srs.v2 §7.2: `priority(B) = a·readiness(B) +
 * b·unlockValue(B) + c·goalProximity(B) + d·weaknessFit(B)`, with
 * `a, b, c, d` configurable engine weights. The composite is a
 * single number; the per-term breakdown lives in the `PriorityScore`
 * discriminated union (used by the visualization in the integration
 * test). The composite itself is what the ranker sorts on.
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 *   `packages/knowledge-space-practice/src/planner/priority.ts`
 *     - `getPriority(nodeId, input, weights): number` (per-node oracle)
 *     - `computePriorities(input, weights): ReadonlyMap<string, number>` (bulk precompute)
 *
 * Test approach: pure unit, no I/O, no app/Convex imports. Each case
 * uses hand-rolled `PlannerInput` fixtures from `planner-fixtures.ts`
 * (this test file's neighbor). Hand-calculated expected values
 * leverage the existing per-term test contracts (unlock-value,
 * goal-proximity, weakness-fit) so the math is anchored in the
 * already-verified scoring terms. The Red failure is `TypeError:
 * getPriority is not a function` from the missing module exports —
 * not durable-record staleness.
 *
 * Determinism: every fixture is deterministic; assertions do not
 * depend on iteration order or shared state.
 */

import { describe, expect, it } from 'vitest';

import {
  getPriority,
  computePriorities,
} from '../planner/priority.js';
import {
  makePlannerChain,
  makePlannerEmpty,
  defaultPriorityWeights,
} from './planner-fixtures.js';

const EPS = 1e-9;
const closeTo = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

// Hand-calculated reference chain (n1 -> n2 -> n3 -> n4, goal = n4).
// readiness:   n1=0.1, n2=0.2, n3=0.3, n4=0.4
// unlockValue: n1=3,   n2=2,   n3=1,   n4=0
// goalProxim:  n1=0.25, n2=1/3, n3=0.5, n4=1
// weaknessFit: 0, 0, 0, 0 (Track-6 stub)
const CHAIN_READINESS = { 'chain.n1': 0.1, 'chain.n2': 0.2, 'chain.n3': 0.3, 'chain.n4': 0.4 } as const;

// ---------------------------------------------------------------------------
// Default equal weights
// ---------------------------------------------------------------------------

describe('priority — v3.2 normalized terms with utility disabled', () => {
  it('uses normalized maximum unlock reach for chain.n1', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    // 0.1 readiness + 1 normalized unlock + 0.25 goal proximity.
    expect(closeTo(getPriority('chain.n1', graph, defaultPriorityWeights), 1.35)).toBe(true);
  });

  it('uses logarithmic normalized unlock reach for chain.n2', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    expect(
      closeTo(
        getPriority('chain.n2', graph, defaultPriorityWeights),
        0.2 + Math.log(3) / Math.log(4) + 1 / 3,
      ),
    ).toBe(true);
  });

  it('normalizes one reachable descendant for chain.n3', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    expect(closeTo(getPriority('chain.n3', graph, defaultPriorityWeights), 1.3)).toBe(true);
  });

  it('composite for chain.n4 = 1.4 (readiness 0.4 + unlock 0 + proximity 1)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    expect(closeTo(getPriority('chain.n4', graph, defaultPriorityWeights), 1.4)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Single-weight collapse
// ---------------------------------------------------------------------------

describe('priority — single-weight collapse (regression-equivalent to pre-track ordering)', () => {
  it('a=1, b=c=d=0 collapses to readiness-only ordering', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 1, b: 0, c: 0, d: 0 };
    expect(closeTo(getPriority('chain.n1', graph, weights), 0.1)).toBe(true);
    expect(closeTo(getPriority('chain.n2', graph, weights), 0.2)).toBe(true);
    expect(closeTo(getPriority('chain.n3', graph, weights), 0.3)).toBe(true);
    expect(closeTo(getPriority('chain.n4', graph, weights), 0.4)).toBe(true);
  });

  it('b=1, a=c=d=e=0 collapses to normalized unlockValue-only ordering', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 0, b: 1, c: 0, d: 0 };
    expect(getPriority('chain.n1', graph, weights)).toBe(1);
    expect(getPriority('chain.n2', graph, weights)).toBeCloseTo(Math.log(3) / Math.log(4), 10);
    expect(getPriority('chain.n3', graph, weights)).toBe(0.5);
    expect(getPriority('chain.n4', graph, weights)).toBe(0);
  });

  it('c=1, a=b=d=0 collapses to goalProximity-only ordering', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 0, b: 0, c: 1, d: 0 };
    expect(closeTo(getPriority('chain.n1', graph, weights), 0.25)).toBe(true);
    expect(closeTo(getPriority('chain.n2', graph, weights), 1 / 3)).toBe(true);
    expect(closeTo(getPriority('chain.n3', graph, weights), 0.5)).toBe(true);
    expect(getPriority('chain.n4', graph, weights)).toBe(1);
  });

  it('d=1, a=b=c=0 collapses to weaknessFit-only (zero in Track-6 stub mode)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 0, b: 0, c: 0, d: 1 };
    for (const node of graph.nodes) {
      expect(getPriority(node.id, graph, weights)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Zero and scaled weights
// ---------------------------------------------------------------------------

describe('priority — zero and scaled weights', () => {
  it('all weights = 0 produces composite = 0 for every node', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 0, b: 0, c: 0, d: 0 };
    for (const node of graph.nodes) {
      expect(getPriority(node.id, graph, weights)).toBe(0);
    }
  });

  it('a=2 scales the readiness contribution by 2', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 2, b: 0, c: 0, d: 0 };
    expect(closeTo(getPriority('chain.n1', graph, weights), 0.2)).toBe(true);
    expect(closeTo(getPriority('chain.n2', graph, weights), 0.4)).toBe(true);
    expect(closeTo(getPriority('chain.n3', graph, weights), 0.6)).toBe(true);
    expect(closeTo(getPriority('chain.n4', graph, weights), 0.8)).toBe(true);
  });

  it('b=0.5 scales normalized unlockValue by 0.5', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const weights = { a: 0, b: 0.5, c: 0, d: 0 };
    expect(closeTo(getPriority('chain.n1', graph, weights), 0.5)).toBe(true);
    expect(closeTo(getPriority('chain.n2', graph, weights), 0.5 * Math.log(3) / Math.log(4))).toBe(true);
    expect(closeTo(getPriority('chain.n3', graph, weights), 0.25)).toBe(true);
    expect(getPriority('chain.n4', graph, weights)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Missing readiness defaults
// ---------------------------------------------------------------------------

describe('priority — missing readiness default', () => {
  it('treats a missing readinessByNode entry as 0 (no contribution from readiness)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'] });
    // readinessByNode is empty -> readiness contribution is 0 everywhere
    const weights = { a: 1, b: 0, c: 0, d: 0 };
    for (const node of graph.nodes) {
      expect(getPriority(node.id, graph, weights)).toBe(0);
    }
  });

  it('treats an unknown node id as 0 (does not throw)', () => {
    const graph = makePlannerChain({ length: 3, goalIds: ['chain.n3'] });
    expect(getPriority('chain.does-not-exist', graph, defaultPriorityWeights)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Empty graph
// ---------------------------------------------------------------------------

describe('priority — empty graph', () => {
  it('returns 0 for any node id against an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(getPriority('any-id', graph, defaultPriorityWeights)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Determinism and purity
// ---------------------------------------------------------------------------

describe('priority — determinism and purity', () => {
  it('repeated calls with the same input return the same value', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const first = getPriority('chain.n2', graph, defaultPriorityWeights);
    const second = getPriority('chain.n2', graph, defaultPriorityWeights);
    const third = getPriority('chain.n2', graph, defaultPriorityWeights);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('does not mutate the input PlannerInput or its readinessByNode', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const snap = JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
      readinessByNode: graph.readinessByNode,
      goalNodeIds: graph.goalNodeIds,
      misconceptionLinks: graph.misconceptionLinks,
    });
    getPriority('chain.n1', graph, defaultPriorityWeights);
    getPriority('chain.n2', graph, defaultPriorityWeights);
    getPriority('chain.n3', graph, defaultPriorityWeights);
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

// ---------------------------------------------------------------------------
// Bulk precompute API
// ---------------------------------------------------------------------------

describe('priority — computePriorities (bulk precompute)', () => {
  it('returns a map keyed by every node id in the graph', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const map = computePriorities(graph, defaultPriorityWeights);
    expect(map).toBeInstanceOf(Map);
    for (const node of graph.nodes) {
      expect(map.has(node.id)).toBe(true);
    }
  });

  it('matches the per-node oracle for every node in the graph', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const map = computePriorities(graph, defaultPriorityWeights);
    for (const node of graph.nodes) {
      expect(closeTo(map.get(node.id)!, getPriority(node.id, graph, defaultPriorityWeights))).toBe(true);
    }
  });

  it('returns an empty map for an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(computePriorities(graph, defaultPriorityWeights).size).toBe(0);
  });

  it('is deterministic across repeated invocations on the same input', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const m1 = computePriorities(graph, defaultPriorityWeights);
    const m2 = computePriorities(graph, defaultPriorityWeights);
    expect(m1.size).toBe(m2.size);
    for (const [k, v] of m1) {
      expect(closeTo(m2.get(k)!, v)).toBe(true);
    }
  });

  it('is pure (does not mutate the input graph)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness: CHAIN_READINESS });
    const snap = JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
      readinessByNode: graph.readinessByNode,
      goalNodeIds: graph.goalNodeIds,
      misconceptionLinks: graph.misconceptionLinks,
    });
    computePriorities(graph, defaultPriorityWeights);
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
