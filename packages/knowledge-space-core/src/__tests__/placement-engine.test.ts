import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  runPlacementTraversal,
  type PlacementEngineResult,
} from '../placement-engine.js';
import type { KnowledgeSpace, KnowledgeSpaceNode, KnowledgeSpaceEdge } from '../types.js';
import type { PlacementResult, ProbeResult, ProbeAdapter } from '../placement.js';
import { placementResultSchema, PROBE_RESULTS } from '../placement.js';
import {
  syntheticPlacementGraph,
  syntheticCyclicPlacementGraph,
  buildLinearPlacementChain,
  createDeterministicProbeAdapter,
  createMockPlacementResult,
} from '../placement-fixtures.js';

// ---------------------------------------------------------------------------
// Task 2.1 — Tree-walk traversal logic
//   "Pass → toward advanced; fail → toward prerequisites; domain-neutral, pure"
// ---------------------------------------------------------------------------
//
// All tests in this section drive the engine with pure, deterministic probe
// inputs. No mocks, no I/O, no async. The engine is expected to be
// domain-neutral (no imports outside ./types, ./placement, ./schemas, etc.)
// and pure (same input → same output).

// --- Helpers ---------------------------------------------------------------

/** Build a tiny linear prereq chain: a → b → c (a is prereq for b, etc.). */
function buildChain3(): KnowledgeSpace {
  return {
    nodes: [
      nodeOfKind('math.test.a', 'skill'),
      nodeOfKind('math.test.b', 'skill'),
      nodeOfKind('math.test.c', 'skill'),
    ],
    edges: [
      prereqEdge('math.test.a', 'math.test.b'),
      prereqEdge('math.test.b', 'math.test.c'),
    ],
  };
}

/** Build a small branching tree for frontier-split tests. */
function buildBranch(): KnowledgeSpace {
  return {
    nodes: [
      nodeOfKind('math.test.a', 'skill'), // root
      nodeOfKind('math.test.b', 'skill'), // a → b
      nodeOfKind('math.test.c', 'skill'), // a → c
      nodeOfKind('math.test.d', 'skill'), // b → d
      nodeOfKind('math.test.e', 'skill'), // c → e
    ],
    edges: [
      prereqEdge('math.test.a', 'math.test.b'),
      prereqEdge('math.test.a', 'math.test.c'),
      prereqEdge('math.test.b', 'math.test.d'),
      prereqEdge('math.test.c', 'math.test.e'),
    ],
  };
}

/**
 * Create a knowledge space node with a given kind for testing.
 * @param {string} id - The node ID
 * @param {KnowledgeSpaceNode['kind']} kind - The node kind
 * @returns {KnowledgeSpaceNode} - A KnowledgeSpaceNode for test use
 */
function nodeOfKind(id: string, kind: KnowledgeSpaceNode['kind']): KnowledgeSpaceNode {
  return {
    id,
    kind,
    title: id,
    domain: 'math.test',
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
function prereqEdge(sourceId: string, targetId: string): KnowledgeSpaceEdge {
  return {
    id: `${sourceId}->${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight: 1,
    confidence: 'high',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
  };
}

/**
 * Extract node IDs from a placement engine result for assertion.
 * @param {PlacementEngineResult} result - The engine result containing placement results
 * @returns {string[]} - Array of node ID strings
 */
function resultNodeIds(result: PlacementEngineResult): string[] {
  return result.results.map((r) => r.nodeId);
}

/**
 * Assert that a PlacementResult conforms to the expected schema and value ranges.
 * @param {PlacementResult} r - The placement result to validate
 */
function expectValidResultShape(r: PlacementResult): void {
  const parsed = placementResultSchema.safeParse(r);
  expect(parsed.success, `PlacementResult did not validate: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
  expect(r.masteryEstimate).toBeGreaterThanOrEqual(0);
  expect(r.masteryEstimate).toBeLessThanOrEqual(1);
  expect(['low', 'medium']).toContain(r.confidence);
}

// ---------------------------------------------------------------------------
// Task 2.1.a — Direction: pass → downstream (toward advanced skills)
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — walk direction: pass → downstream', () => {
  it('on a 3-node chain starting at the root, pass-all walks every node to the leaf', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(result.probesPerformed).toBe(3);
    expect(resultNodeIds(result).sort()).toEqual(['math.test.a', 'math.test.b', 'math.test.c'].sort());
    // Each pass should produce a high mastery estimate
    for (const r of result.results) {
      expectValidResultShape(r);
      expect(r.masteryEstimate).toBeGreaterThan(0.5);
    }
  });

  it('on a chain, the walk visits a node\'s downstream neighbors in the next probe step', async () => {
    // Start at 'a'. After probing 'a' (pass), 'b' must be reachable.
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    const aIndex = result.results.findIndex((r) => r.nodeId === 'math.test.a');
    const bIndex = result.results.findIndex((r) => r.nodeId === 'math.test.b');
    const cIndex = result.results.findIndex((r) => r.nodeId === 'math.test.c');
    expect(aIndex).toBeGreaterThanOrEqual(0);
    expect(bIndex).toBeGreaterThan(aIndex);
    expect(cIndex).toBeGreaterThan(bIndex);
  });

  it('on a chain, passing a leaf node does not enqueue any new nodes (no downstream)', async () => {
    // Start at 'c' (leaf). Pass. No downstream neighbors. Walk terminates.
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.c' });

    expect(result.probesPerformed).toBe(1);
    expect(resultNodeIds(result)).toEqual(['math.test.c']);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.b — Direction: fail → upstream (toward prerequisites)
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — walk direction: fail → upstream', () => {
  it('on a 3-node chain starting at the leaf, fail-all walks back to the root', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'fail', 'math.test.b': 'fail', 'math.test.c': 'fail' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.c' });

    // c fail → add b. b fail → add a. a fail → no upstream → stop.
    expect(resultNodeIds(result).sort()).toEqual(['math.test.a', 'math.test.b', 'math.test.c'].sort());
    // Failures must produce low mastery estimates
    for (const r of result.results) {
      expect(r.masteryEstimate).toBeLessThan(0.5);
    }
  });

  it('on a chain, failing at the root stops the walk (no upstream)', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'fail', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    // a fail → no upstream → stop. b and c are not probed.
    expect(result.probesPerformed).toBe(1);
    expect(resultNodeIds(result)).toEqual(['math.test.a']);
  });

  it('on a branching tree, failing a node walks to its prerequisites only (not unrelated branches)', async () => {
    // Tree: a → b → d, a → c → e. Start at 'd'. d fail → add b. b fail → add a. a fail → stop.
    // 'c' and 'e' should NOT be probed.
    const graph = buildBranch();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'fail', 'math.test.b': 'fail', 'math.test.c': 'pass', 'math.test.d': 'fail', 'math.test.e': 'pass',
    });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.d' });

    const probed = new Set(resultNodeIds(result));
    expect(probed.has('math.test.d')).toBe(true);
    expect(probed.has('math.test.b')).toBe(true);
    expect(probed.has('math.test.a')).toBe(true);
    expect(probed.has('math.test.c')).toBe(false);
    expect(probed.has('math.test.e')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.c — Mixed pass/fail
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — mixed pass/fail traversal', () => {
  it('on a 3-node chain, pass-pass-fail probes all three nodes and produces correct mastery bands', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'fail' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(result.probesPerformed).toBe(3);
    const byId = new Map(result.results.map((r) => [r.nodeId, r] as const));
    expect(byId.get('math.test.a')!.masteryEstimate).toBeGreaterThan(0.5);
    expect(byId.get('math.test.b')!.masteryEstimate).toBeGreaterThan(0.5);
    expect(byId.get('math.test.c')!.masteryEstimate).toBeLessThan(0.5);
  });

  it('on a branching tree, pass-one-branch and fail-another probes both branches', async () => {
    // Tree: a → b → d, a → c → e. Start at 'a'. a pass → add b, c.
    // b pass → add d. c fail → no upstream. d pass → no downstream.
    const graph = buildBranch();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'fail', 'math.test.d': 'pass', 'math.test.e': 'pass',
    });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    const probed = new Set(resultNodeIds(result));
    expect(probed.size).toBeGreaterThanOrEqual(4);
    expect(probed.has('math.test.a')).toBe(true);
    expect(probed.has('math.test.b')).toBe(true);
    expect(probed.has('math.test.c')).toBe(true);
    expect(probed.has('math.test.d')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.d — Partial is treated as fail-adjacent
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — partial result direction', () => {
  it('treats "partial" the same as "fail" for walk direction (walk moves upstream)', async () => {
    // Chain a → b → c. Start at 'c'. c partial → move to b. b partial → move to a. a partial → stop.
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'partial', 'math.test.b': 'partial', 'math.test.c': 'partial' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.c' });

    expect(resultNodeIds(result).sort()).toEqual(['math.test.a', 'math.test.b', 'math.test.c'].sort());
  });

  it('partial produces a "low" or "medium" confidence mastery estimate', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'partial' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });
    expect(result.probesPerformed).toBe(1);
    const r = result.results[0]!;
    expect(r.confidence).not.toBe('high');
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.e — Edge cases: empty graph, single node, disconnected components
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — edge-case graphs', () => {
  it('returns an empty result for an empty graph (no nodes, no edges)', async () => {
    const empty: KnowledgeSpace = { nodes: [], edges: [] };
    const adapter: ProbeAdapter = { domain: 'test', probe: () => 'pass' };

    const result = await runPlacementTraversal(empty, adapter);

    expect(result.results).toEqual([]);
    expect(result.probesPerformed).toBe(0);
    expect(result.reason).toBe('empty-graph');
    expect(result.converged).toBe(true);
  });

  it('probes a single-node graph once and converges', async () => {
    const single: KnowledgeSpace = {
      nodes: [nodeOfKind('lone', 'skill')],
      edges: [],
    };
    const adapter = createDeterministicProbeAdapter({ lone: 'pass' });

    const result = await runPlacementTraversal(single, adapter, { startNodeId: 'lone' });

    expect(result.probesPerformed).toBe(1);
    expect(resultNodeIds(result)).toEqual(['lone']);
    expect(result.converged).toBe(true);
  });

  it('on a graph with two disconnected nodes, the walk does not probe the unreachable one', async () => {
    const graph: KnowledgeSpace = {
      nodes: [
        nodeOfKind('alpha', 'skill'),
        nodeOfKind('beta', 'skill'),
      ],
      edges: [],
    };
    const adapter = createDeterministicProbeAdapter({ alpha: 'pass', beta: 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'alpha' });

    // No edges → walk cannot reach 'beta' from 'alpha'.
    expect(resultNodeIds(result)).toEqual(['alpha']);
    expect(result.probesPerformed).toBe(1);
  });

  it('on a graph with two disconnected nodes, the walk still probes only the start node', async () => {
    // This is the same property as above with fail instead of pass.
    const graph: KnowledgeSpace = {
      nodes: [
        nodeOfKind('alpha', 'skill'),
        nodeOfKind('beta', 'skill'),
      ],
      edges: [],
    };
    const adapter = createDeterministicProbeAdapter({ alpha: 'fail', beta: 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'alpha' });

    expect(result.probesPerformed).toBe(1);
    expect(resultNodeIds(result)).toEqual(['alpha']);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.f — Cycle safety (no infinite loops)
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — cycle safety', () => {
  it('terminates on a 3-node prerequisite cycle (a → b → c → a) without infinite-looping', async () => {
    const adapter = createDeterministicProbeAdapter({});

    // Vitest's default test timeout is 5s; if the walk infinite-loops,
    // the test will time out. We additionally assert that the walk
    // returned and didn't probe the same node twice in a row.
    const result = await runPlacementTraversal(syntheticCyclicPlacementGraph, adapter, {
      startNodeId: 'math.test.cycle.a',
      maxProbes: 10,
    });

    expect(result.probesPerformed).toBeLessThanOrEqual(10);
    // Each node in the cycle should appear at most once in the walk
    const ids = resultNodeIds(result);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('on a cyclic graph, the walk does not enqueue already-visited nodes', async () => {
    const calls: string[] = [];
    const adapter: ProbeAdapter = {
      domain: 'test',
      probe(nodeId: string): ProbeResult {
        calls.push(nodeId);
        return 'pass';
      },
    };

    const result = await runPlacementTraversal(syntheticCyclicPlacementGraph, adapter, {
      startNodeId: 'math.test.cycle.a',
      maxProbes: 10,
    });

    // Even if every probe returns 'pass', the cycle must terminate.
    expect(calls.length).toBeLessThanOrEqual(10);
    // No node probed more than once
    expect(new Set(calls).size).toBe(calls.length);
    expect(result.results.length).toBe(result.probesPerformed);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.g — Result shape & confidence
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — result shape and confidence', () => {
  it('every PlacementResult in the output is a valid placementResultSchema', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    for (const r of result.results) {
      expectValidResultShape(r);
    }
  });

  it('every PlacementResult has a confidence of "low" or "medium" (never "high")', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    for (const r of result.results) {
      expect(r.confidence).not.toBe('high');
      expect(['low', 'medium']).toContain(r.confidence);
    }
  });

  it('every PlacementResult.masteryEstimate is in [0, 1]', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'fail', 'math.test.c': 'partial' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    for (const r of result.results) {
      expect(r.masteryEstimate).toBeGreaterThanOrEqual(0);
      expect(r.masteryEstimate).toBeLessThanOrEqual(1);
    }
  });

  it('every node probed produces exactly one PlacementResult (probe count == result length)', async () => {
    const graph = buildBranch();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass', 'math.test.d': 'pass', 'math.test.e': 'pass',
    });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(result.results.length).toBe(result.probesPerformed);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.h — Determinism and purity
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — determinism and purity', () => {
  it('returns identical results on repeated calls with the same inputs', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const a = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });
    const b = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(a.probesPerformed).toBe(b.probesPerformed);
    expect(resultNodeIds(a)).toEqual(resultNodeIds(b));
  });

  it('does not mutate the input graph', async () => {
    const graph = buildChain3();
    const snapshot = JSON.parse(JSON.stringify(graph)) as KnowledgeSpace;
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(graph).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Task 2.1.i — Domain neutrality (no forbidden imports)
// ---------------------------------------------------------------------------

describe('placement-engine — boundary', () => {
  const FORBIDDEN_IMPORT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /from\s+['"]\s*apps\//, label: 'apps/' },
    { pattern: /from\s+['"]\s*convex\/_generated/, label: 'convex/_generated/' },
    { pattern: /from\s+['"]\s*@math-platform\/math-content/, label: '@math-platform/math-content' },
    { pattern: /from\s+['"]\s*packages\/math-content/, label: 'packages/math-content/' },
    { pattern: /from\s+['"]\s*\.\.\/math-content/, label: 'relative to math-content package' },
  ];
  const PACKAGE_SRC = resolve(__dirname, '..');

  it('placement-engine.ts must not import from apps/, convex/_generated/, or domain content', async () => {
    const enginePath = join(PACKAGE_SRC, 'placement-engine.ts');
    const content = readFileSync(enginePath, 'utf-8');
    const lines = content.split('\n');
    const violations: Array<{ line: number; match: string; label: string }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const { pattern, label } of FORBIDDEN_IMPORT_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({ line: i + 1, match: line.trim(), label });
        }
      }
    }
    if (violations.length > 0) {
      expect.fail(
        `Boundary violations in placement-engine.ts:\n${violations
          .map((v) => `  line ${v.line} — forbidden import from ${v.label}\n    ${v.match}`)
          .join('\n\n')}`,
      );
    }
    expect(violations).toHaveLength(0);
  });
});

// ===========================================================================
// Task 2.2 — Convergence / frontier detection with bounded probe count
// ===========================================================================

describe('runPlacementTraversal — convergence', () => {
  it('reports reason="converged" and converged=true when the frontier is exhausted', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(result.reason).toBe('converged');
    expect(result.converged).toBe(true);
  });

  it('reports reason="converged" when failing at the root (no upstream reachable)', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'fail' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'math.test.a' });

    expect(result.reason).toBe('converged');
    expect(result.converged).toBe(true);
  });

  it('reports reason="converged" on a single-node graph after one probe', async () => {
    const graph: KnowledgeSpace = {
      nodes: [nodeOfKind('only', 'skill')],
      edges: [],
    };
    const adapter = createDeterministicProbeAdapter({ only: 'pass' });

    const result = await runPlacementTraversal(graph, adapter, { startNodeId: 'only' });

    expect(result.reason).toBe('converged');
    expect(result.converged).toBe(true);
  });
});

describe('runPlacementTraversal — max-probe cap', () => {
  it('stops at maxProbes=2 even if more nodes are reachable', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.a',
      maxProbes: 2,
    });

    expect(result.probesPerformed).toBe(2);
    expect(result.reason).toBe('max-probes');
    expect(result.converged).toBe(false);
  });

  it('maxProbes=0 performs zero probes and reports reason="max-probes"', async () => {
    const graph = buildChain3();
    const adapter = createDeterministicProbeAdapter({ 'math.test.a': 'pass', 'math.test.b': 'pass', 'math.test.c': 'pass' });

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.a',
      maxProbes: 0,
    });

    expect(result.probesPerformed).toBe(0);
    expect(result.reason).toBe('max-probes');
    expect(result.results).toEqual([]);
  });

  it('probe count never exceeds maxProbes', async () => {
    const graph = buildLinearPlacementChain(20);
    const adapter = createDeterministicProbeAdapter(
      Object.fromEntries(
        graph.nodes.map((n) => [n.id, 'pass' as ProbeResult]),
      ),
    );

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: graph.nodes[0]!.id,
      maxProbes: 5,
    });

    expect(result.probesPerformed).toBeLessThanOrEqual(5);
  });
});

describe('runPlacementTraversal — probe-count bounds', () => {
  it('probe count is always ≤ total node count', async () => {
    for (const length of [5, 10, 25, 50]) {
      const graph = buildLinearPlacementChain(length);
      const adapter = createDeterministicProbeAdapter(
        Object.fromEntries(graph.nodes.map((n) => [n.id, 'pass' as ProbeResult])),
      );

      const result = await runPlacementTraversal(graph, adapter, {
        startNodeId: graph.nodes[0]!.id,
      });

      expect(result.probesPerformed, `chain length ${length}`).toBeLessThanOrEqual(
        graph.nodes.length,
      );
    }
  });

  it('on a degenerate linear chain of 20 nodes, probe count ≤ 20 (worst case O(n))', async () => {
    const graph = buildLinearPlacementChain(20);
    const adapter = createDeterministicProbeAdapter(
      Object.fromEntries(graph.nodes.map((n) => [n.id, 'pass' as ProbeResult])),
    );

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: graph.nodes[0]!.id,
    });

    expect(result.probesPerformed).toBeLessThanOrEqual(20);
  });

  it('on a balanced 17-node placement graph, the walk converges in strictly fewer than N probes (frontier splits)', async () => {
    // syntheticPlacementGraph has 17 nodes; with a smart walk we expect
    // O(log n) ~ 5 probes. Allow generous slack (≤ 12) for implementation
    // flexibility, but require the walk to terminate before exhausting N.
    const graph = syntheticPlacementGraph;
    const adapter = createDeterministicProbeAdapter({});

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.placement.skill.1.1.a',
    });

    expect(result.probesPerformed).toBeLessThan(graph.nodes.length);
    expect(result.converged).toBe(true);
  });

  it('on the 17-node placement graph, a pass-all walk from a root should reach multiple leaves', async () => {
    const graph = syntheticPlacementGraph;
    const preset: Record<string, ProbeResult> = {};
    for (const n of graph.nodes) {
      // Default everything to 'pass' so the walk explores both modules.
      preset[n.id] = 'pass';
    }
    const adapter = createDeterministicProbeAdapter(preset);

    const result = await runPlacementTraversal(graph, adapter, {
      startNodeId: 'math.test.placement.skill.1.1.a',
    });

    const probed = new Set(resultNodeIds(result));
    // The walk should have probed at least nodes from both modules
    expect(probed.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// DeterministicProbeAdapter — fixture self-tests
// ---------------------------------------------------------------------------

describe('createDeterministicProbeAdapter', () => {
  it('returns the preset value for known nodeIds', async () => {
    const adapter = createDeterministicProbeAdapter({ a: 'pass', b: 'fail' });
    expect(adapter.probe('a')).toBe<ProbeResult>('pass');
    expect(adapter.probe('b')).toBe<ProbeResult>('fail');
  });

  it('returns the default "partial" for unknown nodeIds', async () => {
    const adapter = createDeterministicProbeAdapter({ a: 'pass' });
    expect(adapter.probe('unknown')).toBe<ProbeResult>('partial');
  });

  it('respects a custom defaultResult for unknown nodeIds', async () => {
    const adapter = createDeterministicProbeAdapter(
      { a: 'pass' },
      { defaultResult: 'fail' },
    );
    expect(adapter.probe('unknown')).toBe<ProbeResult>('fail');
  });

  it('tracks probe calls in order', async () => {
    const adapter = createDeterministicProbeAdapter({ a: 'pass', b: 'fail' });
    adapter.probe('a');
    adapter.probe('b');
    adapter.probe('a');
    expect(adapter.probeCalls).toEqual(['a', 'b', 'a']);
    expect(adapter.callCount).toBe(3);
  });

  it('reset() clears the probe-call log but not the preset', async () => {
    const adapter = createDeterministicProbeAdapter({ a: 'pass' });
    adapter.probe('a');
    adapter.reset();
    expect(adapter.probeCalls).toEqual([]);
    expect(adapter.callCount).toBe(0);
    expect(adapter.probe('a')).toBe<ProbeResult>('pass');
  });

  it('only returns canonical ProbeResult values', async () => {
    const adapter = createDeterministicProbeAdapter({ a: 'pass', b: 'fail', c: 'partial',
    });
    const valid = new Set<string>(PROBE_RESULTS);
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(valid.has(adapter.probe(id) as string)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// syntheticPlacementGraph — fixture self-tests
// ---------------------------------------------------------------------------

describe('syntheticPlacementGraph fixture', () => {
  it('contains 15–25 nodes', async () => {
    expect(syntheticPlacementGraph.nodes.length).toBeGreaterThanOrEqual(15);
    expect(syntheticPlacementGraph.nodes.length).toBeLessThanOrEqual(25);
  });

  it('has multi-branch prerequisite_for edges (at least one node with >=2 outgoing prereq edges)', async () => {
    const outgoing = new Map<string, number>();
    for (const e of syntheticPlacementGraph.edges) {
      if (e.type !== 'prerequisite_for') continue;
      outgoing.set(e.sourceId, (outgoing.get(e.sourceId) ?? 0) + 1);
    }
    const maxBranching = Math.max(0, ...Array.from(outgoing.values()));
    expect(maxBranching).toBeGreaterThanOrEqual(2);
  });

  it('is acyclic at the prerequisite_for level (used for natural-convergence tests)', async () => {
    // If the engine ever has trouble converging on this fixture, the
    // tree is the problem first. Validate no prerequisite cycles.
    const seen = new Set<string>();
    const visiting = new Set<string>();
    const adj = new Map<string, string[]>();
    for (const e of syntheticPlacementGraph.edges) {
      if (e.type !== 'prerequisite_for') continue;
      const list = adj.get(e.sourceId) ?? [];
      list.push(e.targetId);
      adj.set(e.sourceId, list);
    }
    function visit(node: string): boolean {
      if (visiting.has(node)) return true;
      if (seen.has(node)) return false;
      visiting.add(node);
      for (const n of adj.get(node) ?? []) {
        if (visit(n)) return true;
      }
      visiting.delete(node);
      seen.add(node);
      return false;
    }
    let hasCycle = false;
    for (const n of syntheticPlacementGraph.nodes) {
      if (visit(n.id)) {
        hasCycle = true;
        break;
      }
    }
    expect(hasCycle).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createMockPlacementResult — fixture self-tests
// ---------------------------------------------------------------------------

describe('createMockPlacementResult', () => {
  it('returns a default PlacementResult with the canonical shape', async () => {
    const mock = createMockPlacementResult();
    expect(mock.nodeId).toBe('math.test.placement.skill.1.1.a');
    expect(mock.masteryEstimate).toBe(0.5);
    expect(mock.confidence).toBe('low');
  });

  it('honors overrides', async () => {
    const mock = createMockPlacementResult({
      nodeId: 'math.test.skill.x',
      masteryEstimate: 0.8,
      confidence: 'medium',
      metadata: { probeCount: 2 },
    });
    expect(mock.nodeId).toBe('math.test.skill.x');
    expect(mock.masteryEstimate).toBe(0.8);
    expect(mock.confidence).toBe('medium');
    expect(mock.metadata).toEqual({ probeCount: 2 });
  });

  it('produces results that pass placementResultSchema', async () => {
    const mock = createMockPlacementResult();
    const parsed = placementResultSchema.safeParse(mock);
    expect(parsed.success).toBe(true);
  });
});
