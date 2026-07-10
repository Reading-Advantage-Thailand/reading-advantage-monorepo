/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — Red direct unit
 * tests for the `goalProximity` scoring term.
 *
 * Per spec FR2 + kst-srs.v2 §7.2: `goalProximity(B)` = inverse
 * graph distance from `B` to the learner's goal node(s) if a goal
 * is set; 0 otherwise. The "graph distance" here uses the
 * `prerequisite_for` edge direction: an edge `A -> B` means `A` is
 * a prerequisite for `B`, so a node that is *upstream* of the
 * goal (closer to the root) is "nearer" in prerequisite terms.
 *
 * The `goalProximity` term rewards skills that are prerequisites
 * for the learner's goal: a skill that is the goal itself returns
 * 1 (distance 0 → 1/1 = 1); an immediate prerequisite returns
 * 1/2 = 0.5; and so on. Unreachable nodes (no path to any goal)
 * return 0.
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 *   `packages/knowledge-space-practice/src/planner/goal-proximity.ts`
 *     - `getGoalProximity(nodeId, graph): number` (per-node oracle)
 *     - `computeGoalProximities(graph): ReadonlyMap<string, number>` (bulk precompute)
 *
 * Test approach: pure unit, no I/O, no app/Convex imports. Each
 * case uses hand-rolled `PlannerInput` fixtures from
 * `planner-fixtures.ts`. The Red failure is `TypeError:
 * getGoalProximity is not a function` from the missing module
 * exports — not durable-record staleness.
 *
 * Determinism: fixtures are deterministic; assertions do not
 * depend on iteration order or shared state.
 */

import { describe, expect, it } from 'vitest';

import {
  getGoalProximity,
  computeGoalProximities,
} from '../planner/goal-proximity.js';
import {
  makePlannerChain,
  makePlannerTree,
  makePlannerDisconnected,
  makePlannerEmpty,
  makePlannerNode,
  makePrereqEdge,
} from './planner-fixtures.js';

const EPS = 1e-9;
const closeTo = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

// ---------------------------------------------------------------------------
// No goal set
// ---------------------------------------------------------------------------

describe('goalProximity — no goal set', () => {
  it('returns 0 for every node when goalNodeIds is empty', () => {
    const graph = makePlannerChain({ length: 5 });
    for (const node of graph.nodes) {
      expect(getGoalProximity(node.id, graph)).toBe(0);
    }
  });

  it('returns 0 for every node in a tree when no goal is set', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2 });
    for (const node of graph.nodes) {
      expect(getGoalProximity(node.id, graph)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Same node as goal
// ---------------------------------------------------------------------------

describe('goalProximity — node is its own goal', () => {
  it('returns 1 when the node id equals the goal id (distance 0 -> 1/1)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n3'] });
    expect(getGoalProximity('chain.n3', graph)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Inverse distance to a single goal
// ---------------------------------------------------------------------------

describe('goalProximity — inverse distance to a single goal', () => {
  it('returns 1/1, 1/2, 1/3, 1/4 for chain.n1..n4 with goal chain.n4', () => {
    // chain.n1 -> chain.n2 -> chain.n3 -> chain.n4
    // chain.n4 IS the goal (distance 0 -> 1/1 = 1)
    // chain.n3 is 1 step upstream of the goal (distance 1 -> 1/2 = 0.5)
    // chain.n2 is 2 steps upstream (distance 2 -> 1/3 ≈ 0.333)
    // chain.n1 is 3 steps upstream (distance 3 -> 1/4 = 0.25)
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'] });
    expect(getGoalProximity('chain.n4', graph)).toBe(1);
    expect(closeTo(getGoalProximity('chain.n3', graph), 0.5)).toBe(true);
    expect(closeTo(getGoalProximity('chain.n2', graph), 1 / 3)).toBe(true);
    expect(closeTo(getGoalProximity('chain.n1', graph), 0.25)).toBe(true);
  });

  it('is monotonically non-decreasing as a node moves closer to the goal (chain.n1..n4, goal chain.n4)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'] });
    const values: number[] = [];
    for (let i = 1; i <= 4; i++) {
      values.push(getGoalProximity(`chain.n${i}`, graph));
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// Unreachable
// ---------------------------------------------------------------------------

describe('goalProximity — unreachable node', () => {
  it('returns 0 for a node in a different connected component than the goal', () => {
    // chain A: disc.a1 -> disc.a2 -> disc.a3
    // chain B: disc.b1 -> disc.b2
    // Goal: disc.a3 (only reachable from chain A).
    const graph = makePlannerDisconnected({ goalIds: ['disc.a3'] });
    expect(getGoalProximity('disc.b1', graph)).toBe(0);
    expect(getGoalProximity('disc.b2', graph)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple goals
// ---------------------------------------------------------------------------

describe('goalProximity — multiple goals', () => {
  it('uses the minimum upstream distance across all goals (closer goal wins)', () => {
    // Hand-rolled V-shaped graph:
    //   root -> a
    //   root -> b
    //   a -> goal1
    //   b -> goal2
    // From root, distance to goal1 is 2; distance to goal2 is 2 (equal).
    // From a, distance to goal1 is 1, to goal2 is 3 (closer is goal1).
    const graph = {
      nodes: [
        makePlannerNode('v.root'),
        makePlannerNode('v.a'),
        makePlannerNode('v.b'),
        makePlannerNode('v.goal1'),
        makePlannerNode('v.goal2'),
      ],
      edges: [
        makePrereqEdge('v.root', 'v.a'),
        makePrereqEdge('v.root', 'v.b'),
        makePrereqEdge('v.a', 'v.goal1'),
        makePrereqEdge('v.b', 'v.goal2'),
      ],
      readinessByNode: {},
      goalNodeIds: ['v.goal1', 'v.goal2'],
      misconceptionLinks: [],
    };
    // root: min(2, 2) = 2 -> 1/3
    expect(closeTo(getGoalProximity('v.root', graph), 1 / 3)).toBe(true);
    // a: min(1, 3) = 1 -> 1/2
    expect(closeTo(getGoalProximity('v.a', graph), 0.5)).toBe(true);
    // b: min(3, 1) = 1 -> 1/2
    expect(closeTo(getGoalProximity('v.b', graph), 0.5)).toBe(true);
    // goal1: distance 0 to itself -> 1
    expect(getGoalProximity('v.goal1', graph)).toBe(1);
    // goal2: distance 0 to itself -> 1
    expect(getGoalProximity('v.goal2', graph)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Goal id not in graph
// ---------------------------------------------------------------------------

describe('goalProximity — goal node not present in the graph', () => {
  it('returns 0 for every node when the goal id is unknown (treated as no goal)', () => {
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.does-not-exist'] });
    for (const node of graph.nodes) {
      expect(getGoalProximity(node.id, graph)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Empty graph
// ---------------------------------------------------------------------------

describe('goalProximity — empty graph', () => {
  it('returns 0 for an arbitrary id against an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(getGoalProximity('any-id', graph)).toBe(0);
  });

  it('returns 0 for every node when both graph and goals are empty', () => {
    const graph = makePlannerEmpty();
    const map = computeGoalProximities(graph);
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bulk precompute API
// ---------------------------------------------------------------------------

describe('goalProximity — computeGoalProximities (bulk precompute)', () => {
  it('returns a map keyed by every node id in the graph', () => {
    const graph = makePlannerChain({ length: 5, goalIds: ['chain.n5'] });
    const map = computeGoalProximities(graph);
    expect(map).toBeInstanceOf(Map);
    for (const node of graph.nodes) {
      expect(map.has(node.id)).toBe(true);
    }
  });

  it('matches the per-node oracle for every node in the graph', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2, goalIds: ['tree.root'] });
    const map = computeGoalProximities(graph);
    for (const node of graph.nodes) {
      expect(closeTo(map.get(node.id)!, getGoalProximity(node.id, graph))).toBe(true);
    }
  });

  it('is deterministic across repeated invocations on the same input', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2, goalIds: ['tree.root'] });
    const m1 = computeGoalProximities(graph);
    const m2 = computeGoalProximities(graph);
    expect(m1.size).toBe(m2.size);
    for (const [k, v] of m1) {
      expect(closeTo(m2.get(k)!, v)).toBe(true);
    }
  });

  it('is pure (does not mutate the input graph)', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2, goalIds: ['tree.root'] });
    const snap = JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
      readinessByNode: graph.readinessByNode,
      goalNodeIds: graph.goalNodeIds,
      misconceptionLinks: graph.misconceptionLinks,
    });
    computeGoalProximities(graph);
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
