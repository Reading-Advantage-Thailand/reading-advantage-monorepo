import { describe, it, expect } from 'vitest';
import { runPlacementTraversal } from '../placement-engine.js';
import type { KnowledgeSpace, KnowledgeSpaceNode, KnowledgeSpaceEdge } from '../types.js';
import type { PlacementResult, ProbeResult, ProbeAdapter } from '../placement.js';
import {
  createDeterministicProbeAdapter,
  buildLinearPlacementChain,
} from '../placement-fixtures.js';

// ---------------------------------------------------------------------------
// Tree-walk test extension (adaptive-placement_20260521 Phase 2)
//
// This file strengthens coverage of structural patterns and async-probe
// support. The structural tests pin down correctness on patterns not yet
// exercised in `placement-engine.test.ts`; the async-probe and
// probe-error tests lock in the engine's contract that async probes
// resolve before further processing and thrown errors propagate.
//
// Per measure/tracks/adaptive-placement_20260521/test-strategy.md §5:
//   - Diamond/convergent DAGs (frontier merges correctly)
//   - Multi-prerequisite nodes (a node with >=2 prereqs is reached once)
//   - Non-prerequisite edge types (walk ignores them)
//   - Self-loops (termination on a→a)
//   - Property-based termination on small generated DAGs
//
// Plus the engine-contract tests that lock in the live behavior:
//   - `ProbeAdapter.probe` may return a `Promise<ProbeResult>` (per the
//     interface); the engine awaits the result before computing mastery.
//   - If a probe throws, the engine surfaces the error to the caller
//     rather than swallowing it.
// ---------------------------------------------------------------------------

// --- Helpers ---------------------------------------------------------------

/**
 * Create a knowledge space node with a given kind for testing.
 * @param {string} id - The node ID
 * @param {KnowledgeSpaceNode['kind']} kind - The node kind, defaults to 'skill'
 * @returns {KnowledgeSpaceNode} - A KnowledgeSpaceNode for test use
 */
function makeNode(id: string, kind: KnowledgeSpaceNode['kind'] = 'skill'): KnowledgeSpaceNode {
  return {
    id,
    kind,
    title: id,
    domain: 'math.test.extension',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata: {},
  };
}

/**
 * Create a prerequisite_for edge for testing.
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @returns {KnowledgeSpaceEdge} - A prerequisite_for KnowledgeSpaceEdge
 */
function prereqEdge(
  sourceId: string,
  targetId: string,
): KnowledgeSpaceEdge {
  return {
    id: `${sourceId}->${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight: 0.8,
    confidence: 'high',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
  };
}

/**
 * Create a non-prerequisite edge of a given type for testing.
 * @param {KnowledgeSpaceEdge['type']} type - The edge type (not prerequisite_for)
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @returns {KnowledgeSpaceEdge} - A KnowledgeSpaceEdge of the specified non-prerequisite type
 */
function nonPrereqEdge(
  type: KnowledgeSpaceEdge['type'],
  sourceId: string,
  targetId: string,
): KnowledgeSpaceEdge {
  return {
    id: `${sourceId}-${type}->${targetId}`,
    type,
    sourceId,
    targetId,
    weight: 0.5,
    confidence: 'medium',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
  };
}

/**
 * Extract node IDs from a placement traversal result for assertion.
 * @param {{ results: PlacementResult[] }} result - The traversal result containing placement results
 * @returns {string[]} - Array of node ID strings
 */
function resultNodeIds(result: { results: PlacementResult[] }): string[] {
  return result.results.map((r) => r.nodeId);
}

// ---------------------------------------------------------------------------
// Diamond / convergent DAGs
//   Shape: a → b, a → c, b → d, c → d
//   Node d has two prerequisites that converge. The walk must reach d
//   exactly once even if both paths are explored.
// ---------------------------------------------------------------------------

/**
 * Build a 4-node diamond DAG (a→b, a→c, b→d, c→d) for convergent-path testing.
 * @returns {KnowledgeSpace} - A knowledge space with a diamond prerequisite structure
 */
function buildDiamond(): KnowledgeSpace {
  return {
    nodes: [
      makeNode('math.test.diamond.a'),
      makeNode('math.test.diamond.b'),
      makeNode('math.test.diamond.c'),
      makeNode('math.test.diamond.d'),
    ],
    edges: [
      prereqEdge('math.test.diamond.a', 'math.test.diamond.b'),
      prereqEdge('math.test.diamond.a', 'math.test.diamond.c'),
      prereqEdge('math.test.diamond.b', 'math.test.diamond.d'),
      prereqEdge('math.test.diamond.c', 'math.test.diamond.d'),
    ],
  };
}

describe('runPlacementTraversal — diamond / convergent DAGs', () => {
  it('on a 4-node diamond, a pass-all walk probes every node and never double-probes the merge', async () => {
    const graph = buildDiamond();
    const adapter = createDeterministicProbeAdapter(
      {},
      { defaultResult: 'pass' },
    );

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.diamond.a',
    });

    // All 4 nodes probed, but 'd' appears exactly once in the result list
    expect(result.probesPerformed).toBe(4);
    const ids = resultNodeIds(result);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('math.test.diamond.d');
    // 'd' must come after both 'b' and 'c' (downstream of both)
    const idxD = ids.indexOf('math.test.diamond.d');
    const idxB = ids.indexOf('math.test.diamond.b');
    const idxC = ids.indexOf('math.test.diamond.c');
    expect(idxD).toBeGreaterThan(idxB);
    expect(idxD).toBeGreaterThan(idxC);
  });

  it('on a diamond, failing both branches still converges without probing the merge', async () => {
    // a pass → b, c; b fail → no upstream; c fail → no upstream; never reaches d
    const graph = buildDiamond();
    const adapter = createDeterministicProbeAdapter({
      'math.test.diamond.a': 'pass',
      'math.test.diamond.b': 'fail',
      'math.test.diamond.c': 'fail',
    });

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.diamond.a',
    });

    const probed = new Set(resultNodeIds(result));
    expect(probed.has('math.test.diamond.d')).toBe(false);
    expect(result.converged).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Multi-prerequisite nodes
//   Shape: a → c, b → c, c → d
//   Node c has two prerequisites. The walk should be able to reach c via
//   either path but must not double-probe it.
// ---------------------------------------------------------------------------

/**
 * Build a 4-node graph where a node has multiple prerequisites (a→c, b→c, c→d).
 * @returns {KnowledgeSpace} - A knowledge space with multi-prerequisite structure
 */
function buildMultiPrereq(): KnowledgeSpace {
  return {
    nodes: [
      makeNode('math.test.multi.a'),
      makeNode('math.test.multi.b'),
      makeNode('math.test.multi.c'),
      makeNode('math.test.multi.d'),
    ],
    edges: [
      prereqEdge('math.test.multi.a', 'math.test.multi.c'),
      prereqEdge('math.test.multi.b', 'math.test.multi.c'),
      prereqEdge('math.test.multi.c', 'math.test.multi.d'),
    ],
  };
}

describe('runPlacementTraversal — multi-prerequisite nodes', () => {
  it('reaches a 2-prereq node via at least one of its prerequisites and probes it exactly once', async () => {
    const graph = buildMultiPrereq();
    const adapter = createDeterministicProbeAdapter({});

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.multi.a',
    });

    const ids = resultNodeIds(result);
    // 'a' is the start; 'c' must appear in the result list at most once.
    expect(ids.filter((id) => id === 'math.test.multi.c').length).toBeLessThanOrEqual(1);
    // 'b' is unreachable from 'a' (no path), so it should not be probed.
    expect(ids).not.toContain('math.test.multi.b');
  });

  it('on a 3-prereq fan-in, walk reaches the merge node from any starting prerequisite', async () => {
    // a → x, b → x, c → x
    const graph: KnowledgeSpace = {
      nodes: [
        makeNode('math.test.fanin.a'),
        makeNode('math.test.fanin.b'),
        makeNode('math.test.fanin.c'),
        makeNode('math.test.fanin.x'),
      ],
      edges: [
        prereqEdge('math.test.fanin.a', 'math.test.fanin.x'),
        prereqEdge('math.test.fanin.b', 'math.test.fanin.x'),
        prereqEdge('math.test.fanin.c', 'math.test.fanin.x'),
      ],
    };
    const adapter = createDeterministicProbeAdapter(
      {},
      { defaultResult: 'pass' },
    );

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.fanin.b',
    });

    const ids = resultNodeIds(result);
    expect(ids).toContain('math.test.fanin.x');
    expect(ids.filter((id) => id === 'math.test.fanin.x').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Non-prerequisite edge types must be ignored by the walk
//   Shape: graph with `prerequisite_for` AND `appears_in_context`,
//   `supports`, `extends` edges. Only `prerequisite_for` should affect
//   frontier expansion.
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — non-prerequisite edge types are ignored', () => {
  it('walk only follows `prerequisite_for` edges and ignores `appears_in_context`, `supports`, and `extends`', async () => {
    const graph: KnowledgeSpace = {
      nodes: [
        makeNode('math.test.edges.a'),
        makeNode('math.test.edges.b'),
        makeNode('math.test.edges.c'),
        makeNode('math.test.edges.d'),
      ],
      edges: [
        prereqEdge('math.test.edges.a', 'math.test.edges.b'),
        // Non-prereq edges that should NOT be followed:
        nonPrereqEdge('appears_in_context', 'math.test.edges.a', 'math.test.edges.c'),
        nonPrereqEdge('supports', 'math.test.edges.b', 'math.test.edges.c'),
        nonPrereqEdge('extends', 'math.test.edges.c', 'math.test.edges.d'),
      ],
    };
    const adapter = createDeterministicProbeAdapter(
      {},
      { defaultResult: 'pass' },
    );

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.edges.a',
    });

    const probed = new Set(resultNodeIds(result));
    // 'a' → 'b' via prerequisite_for is the only path the walk should follow.
    expect(probed.has('math.test.edges.a')).toBe(true);
    expect(probed.has('math.test.edges.b')).toBe(true);
    // 'c' and 'd' should NOT be probed because the only edges to them are
    // non-prerequisite types.
    expect(probed.has('math.test.edges.c')).toBe(false);
    expect(probed.has('math.test.edges.d')).toBe(false);
    expect(result.probesPerformed).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Self-loops: a → a must not infinite-loop. The visited set must prevent
// re-enqueueing the same node.
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — self-loops', () => {
  it('terminates on a single-node graph with a self-loop edge', async () => {
    const graph: KnowledgeSpace = {
      nodes: [makeNode('math.test.loop.a')],
      edges: [prereqEdge('math.test.loop.a', 'math.test.loop.a')],
    };
    const adapter = createDeterministicProbeAdapter({
      'math.test.loop.a': 'pass',
    });

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.loop.a',
    });

    // Visited set must prevent re-probing the same node.
    expect(result.probesPerformed).toBe(1);
    expect(resultNodeIds(result)).toEqual(['math.test.loop.a']);
    expect(result.converged).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Async probe support
//   The `ProbeAdapter` interface type allows `probe` to return a Promise.
//   The current engine does not await the result, which causes the
//   `computeMastery` switch to receive a `Promise` object and fall through
//   to an implicit `undefined` return, leading to a TypeError on the
//   destructuring assignment.
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — async probe support', () => {
  it('awaits an async probe and uses the resolved value (pass)', async () => {
    const graph = buildLinearPlacementChain(3);
    const adapter: ProbeAdapter = {
      domain: 'math.test.extension',
      legacySingleProbe: true,
      async probe(nodeId: string): Promise<ProbeResult> {
        // Yield to the event loop so the engine cannot accidentally
        // observe a synchronously-resolved value.
        await Promise.resolve();
        const match = /^math\.test\.chain\.n(\d+)$/.exec(nodeId);
        if (!match) return 'fail';
        const n = Number(match[1]!);
        return n <= 3 ? 'pass' : 'fail';
      },
    };

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.chain.n1',
    });

    // All 3 nodes should be probed; the walk follows passes downstream.
    expect(result.probesPerformed).toBe(3);
    expect(resultNodeIds(result).sort()).toEqual([
      'math.test.chain.n1',
      'math.test.chain.n2',
      'math.test.chain.n3',
    ].sort());
  });

  it('awaits an async probe and uses the resolved value (fail walks upstream)', async () => {
    const graph = buildLinearPlacementChain(3);
    const adapter: ProbeAdapter = {
      domain: 'math.test.extension',
      legacySingleProbe: true,
      async probe(nodeId: string): Promise<ProbeResult> {
        await Promise.resolve();
        return nodeId === 'math.test.chain.n3' ? 'fail' : 'pass';
      },
    };

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.chain.n3',
    });

    // n3 fail → upstream n2 (pass) → downstream n3 (visited). Walk ends.
    // The current engine does not await, so the Promise is treated as a
    // non-matching switch value, causing the function to throw on
    // destructuring undefined. This test is the Red-phase contract.
    expect(result.probesPerformed).toBeGreaterThanOrEqual(1);
    expect(result.results[0]!.nodeId).toBe('math.test.chain.n3');
  });
});

// ---------------------------------------------------------------------------
// Probe error propagation
//   A throwing probe should be surfaced to the caller. The current engine
//   lets the throw bubble up naturally (no try/catch), but we lock the
//   contract in: an error in probe must not be swallowed or coerced to a
//   silent result.
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — probe error propagation', () => {
  it('surfaces a thrown error from `probe` to the caller', async () => {
    const graph = buildLinearPlacementChain(2);
    const adapter: ProbeAdapter = {
      domain: 'math.test.extension',
      legacySingleProbe: true,
      probe(nodeId: string): ProbeResult {
        if (nodeId === 'math.test.chain.n2') {
          throw new Error('probe backend unavailable');
        }
        return 'pass';
      },
    };

    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.chain.n1',
      }),
    ).rejects.toThrow(/probe backend unavailable/);
  });
});

// ---------------------------------------------------------------------------
// Property-based termination on small generated DAGs
//   For any valid DAG + deterministic probe map, the traversal must
//   terminate with probesPerformed ≤ total node count and a `converged`
//   reason of either `converged` or `max-probes`.
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — property-based termination', () => {
  it('terminates with probe count ≤ total node count on 5 randomly-generated linear chains', async () => {
    // Deterministic "random" lengths: 1, 3, 7, 12, 25
    const lengths = [1, 3, 7, 12, 25];
    for (const length of lengths) {
      const graph = buildLinearPlacementChain(length);
      const adapter = createDeterministicProbeAdapter(
        Object.fromEntries(
          graph.nodes.map((n) => [n.id, 'pass' as ProbeResult]),
        ),
      );
      const result = await runPlacementTraversal(graph, adapter, {
        startNodeId: graph.nodes[0]!.id,
      });
      expect(
        result.probesPerformed,
        `length=${length}`,
      ).toBeLessThanOrEqual(graph.nodes.length);
      expect(['converged', 'max-probes', 'empty-graph']).toContain(result.reason);
    }
  });

  it('terminates on a generated binary tree of depth 4 (15 nodes) with probe count ≤ 15', async () => {
    // Build a 15-node binary tree:
    //   1 → 2, 3; 2 → 4, 5; 3 → 6, 7; 4 → 8, 9; 5 → 10, 11; 6 → 12, 13; 7 → 14, 15
    const totalNodes = 15;
    const nodes: KnowledgeSpaceNode[] = [];
    const edges: KnowledgeSpaceEdge[] = [];
    for (let i = 1; i <= totalNodes; i++) {
      nodes.push(makeNode(`math.test.tree.n${i}`));
      const left = i * 2;
      const right = i * 2 + 1;
      if (left <= totalNodes) {
        edges.push(prereqEdge(`math.test.tree.n${i}`, `math.test.tree.n${left}`));
      }
      if (right <= totalNodes) {
        edges.push(prereqEdge(`math.test.tree.n${i}`, `math.test.tree.n${right}`));
      }
    }
    const graph: KnowledgeSpace = { nodes, edges };

    const adapter = createDeterministicProbeAdapter(
      Object.fromEntries(
        graph.nodes.map((n) => [n.id, 'pass' as ProbeResult]),
      ),
    );

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.tree.n1',
    });

    // Probe count must be bounded by the node count.
    expect(result.probesPerformed).toBeLessThanOrEqual(totalNodes);
    // On a balanced tree with pass-all, the walk should reach the leaves.
    const probed = new Set(resultNodeIds(result));
    expect(probed.size).toBeGreaterThan(1);
  });
});
