/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — Red direct unit
 * tests for the `unlockValue` scoring term.
 *
 * In v3.2, `unlockValue(B)` logarithmically normalizes the count of skills
 * reachable downstream from `B` by the maximum reach in the graph.
 * The precomputation is an NFR (`unlockValue` precomputed once per
 * graph, not per request); the per-node accessor is the oracle used
 * to verify the bulk-precompute API.
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 *   `packages/knowledge-space-practice/src/planner/unlock-value.ts`
 *     - `getUnlockValue(nodeId, graph): number` (per-node oracle)
 *     - `computeUnlockValues(graph): ReadonlyMap<string, number>` (bulk precompute)
 *
 * Test approach: pure unit, no I/O, no app/Convex imports. Each
 * case uses hand-rolled `PlannerInput` fixtures from
 * `planner-fixtures.ts` (this test file's neighbor). The Red failure
 * is `TypeError: getUnlockValue is not a function` from the missing
 * module exports — not durable-record staleness.
 *
 * Determinism: every fixture returns the same shape on every call;
 * property assertions do not depend on call order or shared state.
 */

import { describe, expect, it } from 'vitest';

import {
  getUnlockValue,
  computeUnlockValues,
} from '../planner/unlock-value.js';
import {
  makePlannerChain,
  makePlannerTree,
  makePlannerCyclic,
  makePlannerDisconnected,
  makePlannerEmpty,
  makePlannerNode,
  makePrereqEdge,
  makeNonPrereqEdge,
} from './planner-fixtures.js';

// ---------------------------------------------------------------------------
// Leaf and unknown node
// ---------------------------------------------------------------------------

describe('unlockValue — leaf node', () => {
  it('returns 0 for a leaf node (no outgoing prerequisite_for edges)', () => {
    const graph = makePlannerChain({ length: 5 });
    expect(getUnlockValue('chain.n5', graph)).toBe(0);
  });
});

describe('unlockValue — unknown node', () => {
  it('returns 0 for a node id that is not present in the graph', () => {
    const graph = makePlannerChain({ length: 3 });
    expect(getUnlockValue('chain.does-not-exist', graph)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Linear chain
// ---------------------------------------------------------------------------

describe('unlockValue — linear chain (chain.n1 -> ... -> chain.nN)', () => {
  it('normalizes chain reach against the maximum downstream reach', () => {
    const graph = makePlannerChain({ length: 5 });
    // chain.n1 -> chain.n2 -> chain.n3 -> chain.n4 -> chain.n5
    expect(getUnlockValue('chain.n1', graph)).toBe(1);
    expect(getUnlockValue('chain.n2', graph)).toBeCloseTo(Math.log(4) / Math.log(5), 10);
    expect(getUnlockValue('chain.n3', graph)).toBeCloseTo(Math.log(3) / Math.log(5), 10);
    expect(getUnlockValue('chain.n4', graph)).toBeCloseTo(Math.log(2) / Math.log(5), 10);
    expect(getUnlockValue('chain.n5', graph)).toBe(0);
  });

  it('is monotonic non-increasing along the chain (descendants never grow as we move downstream)', () => {
    const graph = makePlannerChain({ length: 6 });
    const values: number[] = [];
    for (let i = 1; i <= 6; i++) {
      values.push(getUnlockValue(`chain.n${i}`, graph));
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// Tree (branching)
// ---------------------------------------------------------------------------

describe('unlockValue — balanced tree', () => {
  it('assigns one to the maximum-reach root of a depth-2 tree', () => {
    // tree.root -> { tree.n1.0.1, tree.n1.0.2 } (4 nodes total, 3 edges)
    // root has 2 descendants.
    const graph = makePlannerTree({ depth: 2, branching: 2 });
    expect(getUnlockValue('tree.root', graph)).toBe(1);
  });

  it('assigns one to the maximum-reach root of a depth-3 tree', () => {
    // depth=3, branching=2 -> 1 + 2 + 4 = 7 nodes; root has 6 descendants.
    const graph = makePlannerTree({ depth: 3, branching: 2 });
    expect(getUnlockValue('tree.root', graph)).toBe(1);
  });

  it('returns 0 for every leaf in a balanced tree', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2 });
    // For depth=3, leaf nodes have prefix `tree.n2.` (the number is the
    // parent's level in makePlannerTree). Nodes are: tree.root, tree.n1.*,
    // tree.n2.*. Only tree.n2.* are leaves.
    const leaves = graph.nodes.filter((n) => /^tree\.n2\./.test(n.id));
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(getUnlockValue(leaf.id, graph)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Empty / disconnected graphs
// ---------------------------------------------------------------------------

describe('unlockValue — empty graph', () => {
  it('returns 0 for an arbitrary id against an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(getUnlockValue('any-id', graph)).toBe(0);
  });
});

describe('unlockValue — disconnected graph', () => {
  it('does not cross connected components (chain B is invisible from chain A)', () => {
    const graph = makePlannerDisconnected();
    // Normalization uses the maximum reach across both disconnected components.
    expect(getUnlockValue('disc.a1', graph)).toBe(1);
    expect(getUnlockValue('disc.a2', graph)).toBeCloseTo(Math.log(2) / Math.log(3), 10);
    expect(getUnlockValue('disc.a3', graph)).toBe(0);
    // chain B: b1 -> b2 (b1 has 1 descendant, no shared nodes with chain A)
    expect(getUnlockValue('disc.b1', graph)).toBeCloseTo(Math.log(2) / Math.log(3), 10);
    expect(getUnlockValue('disc.b2', graph)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge-type filtering
// ---------------------------------------------------------------------------

describe('unlockValue — edge-type filtering', () => {
  it('ignores non-prerequisite_for edges (supports, extends, common_misconception_with)', () => {
    // Hand-rolled graph: a -> b via `prerequisite_for` (counts), a -> c via
    // `supports` (ignored), a -> d via `extends` (ignored). a's unlock value
    // must be 1 (only b).
    const graph: ReturnType<typeof makePlannerEmpty> & {
      nodes: readonly ReturnType<typeof makePlannerNode>[];
      edges: readonly ReturnType<typeof makePrereqEdge | typeof makeNonPrereqEdge>[];
    } = {
      nodes: [
        makePlannerNode('filt.a'),
        makePlannerNode('filt.b'),
        makePlannerNode('filt.c'),
        makePlannerNode('filt.d'),
      ],
      edges: [
        makePrereqEdge('filt.a', 'filt.b'),
        makeNonPrereqEdge('supports', 'filt.a', 'filt.c'),
        makeNonPrereqEdge('extends', 'filt.a', 'filt.d'),
      ],
      readinessByNode: {},
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getUnlockValue('filt.a', graph)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Cycle safety (defense-in-depth)
// ---------------------------------------------------------------------------

describe('unlockValue — cycle safety', () => {
  it('terminates on a cyclic prerequisite_for graph (no infinite loop)', () => {
    // 3-node cycle: a -> b -> c -> a. Each node has 2 descendants.
    // The traversal must terminate, not loop forever.
    const graph = makePlannerCyclic();
    const a = getUnlockValue('cyc.a', graph);
    const b = getUnlockValue('cyc.b', graph);
    const c = getUnlockValue('cyc.c', graph);
    // Equal maximum reach normalizes every node to one.
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(c).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Bulk precompute API
// ---------------------------------------------------------------------------

describe('unlockValue — computeUnlockValues (bulk precompute)', () => {
  it('returns a map keyed by every node id in the graph', () => {
    const graph = makePlannerChain({ length: 5 });
    const map = computeUnlockValues(graph);
    expect(map).toBeInstanceOf(Map);
    for (const node of graph.nodes) {
      expect(map.has(node.id)).toBe(true);
    }
  });

  it('matches the per-node oracle for every node in the graph', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2 });
    const map = computeUnlockValues(graph);
    for (const node of graph.nodes) {
      expect(map.get(node.id)).toBe(getUnlockValue(node.id, graph));
    }
  });

  it('returns an empty map for an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(computeUnlockValues(graph).size).toBe(0);
  });

  it('is deterministic across repeated invocations on the same input', () => {
    const graph = makePlannerTree({ depth: 4, branching: 2 });
    const m1 = computeUnlockValues(graph);
    const m2 = computeUnlockValues(graph);
    expect(m1.size).toBe(m2.size);
    for (const [k, v] of m1) {
      expect(m2.get(k)).toBe(v);
    }
  });

  it('is pure (does not mutate the input graph)', () => {
    const graph = makePlannerTree({ depth: 3, branching: 2 });
    const snap = JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
      readinessByNode: graph.readinessByNode,
      goalNodeIds: graph.goalNodeIds,
      misconceptionLinks: graph.misconceptionLinks,
    });
    computeUnlockValues(graph);
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
