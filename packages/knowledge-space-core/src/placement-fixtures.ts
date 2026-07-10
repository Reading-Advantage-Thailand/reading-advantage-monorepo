// Placement-specific fixtures and factories for adaptive placement tests.
// Domain-neutral; mirrors the shape of `fixtures.ts` but adds a deeper
// prerequisite DAG and helpers for Phase 2 tree-walk tests.
//
// Per measure/tracks/adaptive-placement_20260521/test-strategy.md §2:
//   - syntheticPlacementGraph — 15–25 node multi-branch prereq tree
//   - DeterministicProbeAdapter — preset map with probe-call tracking
//   - createMockPlacementResult — factory for { nodeId, masteryEstimate, confidence }

import type { KnowledgeSpace, KnowledgeSpaceNode, KnowledgeSpaceEdge } from './types.js';
import type { ProbeResult, ProbeAdapter, PlacementResult } from './placement.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a skill node with default test metadata.
 * @param {string} id - The node ID
 * @param {Record<string, unknown>} metadata - Optional metadata overrides
 * @returns {KnowledgeSpaceNode} - A skill KnowledgeSpaceNode
 */
function makeSkill(id: string, metadata: Record<string, unknown> = {}): KnowledgeSpaceNode {
  return {
    id,
    kind: 'skill',
    title: id,
    domain: 'math.test.placement',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata,
  };
}

/**
 * Create a content_group node with default test metadata.
 * @param {string} id - The node ID
 * @param {Record<string, unknown>} metadata - Optional metadata overrides
 * @returns {KnowledgeSpaceNode} - A content_group KnowledgeSpaceNode
 */
function makeContentGroup(id: string, metadata: Record<string, unknown> = {}): KnowledgeSpaceNode {
  return {
    id,
    kind: 'content_group',
    title: id,
    domain: 'math.test.placement',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata,
  };
}

/**
 * Create an instructional_unit node with default test metadata.
 * @param {string} id - The node ID
 * @param {Record<string, unknown>} metadata - Optional metadata overrides
 * @returns {KnowledgeSpaceNode} - An instructional_unit KnowledgeSpaceNode
 */
function makeLesson(id: string, metadata: Record<string, unknown> = {}): KnowledgeSpaceNode {
  return {
    id,
    kind: 'instructional_unit',
    title: id,
    domain: 'math.test.placement',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata,
  };
}

/**
 * Create a domain node with default test metadata.
 * @param {string} id - The node ID
 * @returns {KnowledgeSpaceNode} - A domain KnowledgeSpaceNode
 */
function makeDomain(id: string): KnowledgeSpaceNode {
  return {
    id,
    kind: 'domain',
    title: id,
    domain: 'math.test.placement',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata: { version: 'v1' },
  };
}

/**
 * Create a prerequisite_for edge with default high confidence.
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @param {number} weight - Edge weight, defaults to 0.8
 * @returns {KnowledgeSpaceEdge} - A prerequisite_for KnowledgeSpaceEdge
 */
function prereqEdge(
  sourceId: string,
  targetId: string,
  weight = 0.8,
): KnowledgeSpaceEdge {
  return {
    id: `${sourceId}->${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight,
    confidence: 'high',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
  };
}

// ---------------------------------------------------------------------------
// syntheticPlacementGraph — deeper DAG with multi-branch prerequisite tree
// ---------------------------------------------------------------------------
//
// Structure (17 nodes, 8 prerequisite_for edges):
//
//   math.test.placement.domain (domain)
//   ├── module.1 (content_group)
//   │   ├── lesson.1.1 (instructional_unit)
//   │   │   ├── skill.1.1.a (skill)
//   │   │   └── skill.1.1.b (skill)        ← requires 1.1.a
//   │   ├── lesson.1.2 (instructional_unit)
//   │   │   ├── skill.1.2.a (skill)        ← requires 1.1.a
//   │   │   └── skill.1.2.b (skill)        ← requires 1.2.a
//   │   └── lesson.1.3 (instructional_unit)
//   │       └── skill.1.3.a (skill)        ← requires 1.2.a
//   └── module.2 (content_group)
//       ├── lesson.2.1 (instructional_unit)
//       │   ├── skill.2.1.a (skill)
//       │   └── skill.2.1.b (skill)        ← requires 2.1.a
//       └── lesson.2.2 (instructional_unit)
//           ├── skill.2.2.a (skill)        ← requires 2.1.a
//           │   └── skill.2.2.a.advanced (skill) ← requires 2.2.a
//           └── skill.2.2.b (skill)        ← requires 2.2.a
//
// This produces a balanced tree of depth ~4. A naive linear walk
// (passing everything) probes every node from start to leaf on one
// branch — but an adaptive walk that splits the frontier on partial
// results should converge in O(log n) probes.

const PLACEMENT_DOMAIN = 'math.test.placement.domain';
const PLACEMENT_M1 = 'math.test.placement.module.1';
const PLACEMENT_M2 = 'math.test.placement.module.2';

const PLACEMENT_NODES: KnowledgeSpaceNode[] = [
  makeDomain(PLACEMENT_DOMAIN),
  makeContentGroup(PLACEMENT_M1, { module: '1' }),
  makeContentGroup(PLACEMENT_M2, { module: '2' }),
  makeLesson('math.test.placement.lesson.1.1', { module: '1', lesson: '1' }),
  makeLesson('math.test.placement.lesson.1.2', { module: '1', lesson: '2' }),
  makeLesson('math.test.placement.lesson.1.3', { module: '1', lesson: '3' }),
  makeLesson('math.test.placement.lesson.2.1', { module: '2', lesson: '1' }),
  makeLesson('math.test.placement.lesson.2.2', { module: '2', lesson: '2' }),
  makeSkill('math.test.placement.skill.1.1.a'),
  makeSkill('math.test.placement.skill.1.1.b'),
  makeSkill('math.test.placement.skill.1.2.a'),
  makeSkill('math.test.placement.skill.1.2.b'),
  makeSkill('math.test.placement.skill.1.3.a'),
  makeSkill('math.test.placement.skill.2.1.a'),
  makeSkill('math.test.placement.skill.2.1.b'),
  makeSkill('math.test.placement.skill.2.2.a'),
  makeSkill('math.test.placement.skill.2.2.a.advanced'),
  makeSkill('math.test.placement.skill.2.2.b'),
];

const PLACEMENT_EDGES: KnowledgeSpaceEdge[] = [
  prereqEdge(
    'math.test.placement.skill.1.1.a',
    'math.test.placement.skill.1.1.b',
  ),
  prereqEdge(
    'math.test.placement.skill.1.1.a',
    'math.test.placement.skill.1.2.a',
  ),
  prereqEdge(
    'math.test.placement.skill.1.2.a',
    'math.test.placement.skill.1.2.b',
  ),
  prereqEdge(
    'math.test.placement.skill.1.2.a',
    'math.test.placement.skill.1.3.a',
  ),
  prereqEdge(
    'math.test.placement.skill.2.1.a',
    'math.test.placement.skill.2.1.b',
  ),
  prereqEdge(
    'math.test.placement.skill.2.1.a',
    'math.test.placement.skill.2.2.a',
  ),
  prereqEdge(
    'math.test.placement.skill.2.2.a',
    'math.test.placement.skill.2.2.a.advanced',
  ),
  prereqEdge(
    'math.test.placement.skill.2.2.a',
    'math.test.placement.skill.2.2.b',
  ),
];

export const syntheticPlacementGraph: KnowledgeSpace = Object.freeze({
  nodes: Object.freeze(PLACEMENT_NODES) as KnowledgeSpaceNode[],
  edges: Object.freeze(PLACEMENT_EDGES) as KnowledgeSpaceEdge[],
});

// ---------------------------------------------------------------------------
// syntheticCyclicPlacementGraph — small graph with a prerequisite cycle,
// used for cycle-safety tests
// ---------------------------------------------------------------------------
//
//   a (skill)
//   └── b (skill)    ← prereq: a
//       └── c (skill) ← prereq: b
//           └── a   ← prereq: c (cycle back to a)

export const syntheticCyclicPlacementGraph: KnowledgeSpace = Object.freeze({
  nodes: Object.freeze([
    makeSkill('math.test.cycle.a'),
    makeSkill('math.test.cycle.b'),
    makeSkill('math.test.cycle.c'),
  ]) as KnowledgeSpaceNode[],
  edges: Object.freeze([
    prereqEdge('math.test.cycle.a', 'math.test.cycle.b'),
    prereqEdge('math.test.cycle.b', 'math.test.cycle.c'),
    prereqEdge('math.test.cycle.c', 'math.test.cycle.a'),
  ]) as KnowledgeSpaceEdge[],
});

// ---------------------------------------------------------------------------
// syntheticLinearChain — N-node linear prereq chain
// ---------------------------------------------------------------------------
//
//   n1 → n2 → n3 → ... → nN
//
// Used to test degenerate chain probe count (worst case O(n)).
// Pass-all walks the full chain; fail-all stops at n1.

/**
 * Build a linear prerequisite chain of N skill nodes for testing.
 * @param {number} length - Number of nodes in the chain (must be >= 1)
 * @returns {KnowledgeSpace} - A knowledge space with a linear prerequisite chain
 * @throws If length is less than 1
 */
export function buildLinearPlacementChain(length: number): KnowledgeSpace {
  if (length < 1) {
    throw new Error('buildLinearPlacementChain requires length >= 1');
  }
  const nodes: KnowledgeSpaceNode[] = [];
  const edges: KnowledgeSpaceEdge[] = [];
  for (let i = 1; i <= length; i++) {
    nodes.push(
      makeSkill(`math.test.chain.n${i}`, { chainIndex: i }),
    );
    if (i > 1) {
      edges.push(
        prereqEdge(`math.test.chain.n${i - 1}`, `math.test.chain.n${i}`),
      );
    }
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// DeterministicProbeAdapter — preset map adapter with probe-call tracking
// ---------------------------------------------------------------------------

export interface DeterministicProbeAdapter extends ProbeAdapter {
  /** Ordered list of nodeIds probed via this adapter. */
  readonly probeCalls: ReadonlyArray<string>;
  /** Total number of probe calls. */
  readonly callCount: number;
  /** Reset the probe-call log (useful between runs in property tests). */
  reset(): void;
}

export interface DeterministicProbeAdapterOptions {
  /** Result returned for nodeIds absent from the preset. Defaults to 'partial'. */
  defaultResult?: ProbeResult;
  /** Domain tag for the adapter. Defaults to 'math.test.placement'. */
  domain?: string;
}

/**
 * Create a probe adapter with preset results and call tracking for testing.
 * @param {Record<string, ProbeResult>} preset - Map of node IDs to expected probe results
 * @param {DeterministicProbeAdapterOptions} options - Optional default result and domain configuration
 * @returns {DeterministicProbeAdapter} - A deterministic probe adapter with call tracking
 */
export function createDeterministicProbeAdapter(
  preset: Record<string, ProbeResult>,
  options: DeterministicProbeAdapterOptions = {},
): DeterministicProbeAdapter {
  const defaultResult: ProbeResult = options.defaultResult ?? 'partial';
  const domain = options.domain ?? 'math.test.placement';
  const calls: string[] = [];

  const adapter: DeterministicProbeAdapter = {
    legacySingleProbe: true,
    domain,
    probeCalls: calls,
    get callCount() {
      return calls.length;
    },
    probe(nodeId: string): ProbeResult {
      calls.push(nodeId);
      return preset[nodeId] ?? defaultResult;
    },
    reset(): void {
      calls.length = 0;
    },
  };

  return adapter;
}

// ---------------------------------------------------------------------------
// createMockPlacementResult — factory for { nodeId, masteryEstimate, confidence }
// ---------------------------------------------------------------------------

const DEFAULT_MOCK_NODE_ID = 'math.test.placement.skill.1.1.a';
const DEFAULT_MOCK_ESTIMATE = 0.5;

export interface MockPlacementResultOverrides {
  nodeId?: string;
  masteryEstimate?: number;
  confidence?: PlacementResult['confidence'];
  metadata?: Record<string, unknown>;
}

/**
 * Create a mock placement result with optional field overrides.
 * @param {MockPlacementResultOverrides} overrides - Optional overrides for nodeId, masteryEstimate, confidence, and metadata
 * @returns {PlacementResult} - A PlacementResult with defaults or overridden values
 */
export function createMockPlacementResult(
  overrides: MockPlacementResultOverrides = {},
): PlacementResult {
  return {
    nodeId: overrides.nodeId ?? DEFAULT_MOCK_NODE_ID,
    masteryEstimate: overrides.masteryEstimate ?? DEFAULT_MOCK_ESTIMATE,
    confidence: overrides.confidence ?? 'low',
    ...(overrides.metadata !== undefined ? { metadata: overrides.metadata } : {}),
  };
}
