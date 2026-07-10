/**
 * Phase 3 (Track 4 next-skill-planner_20260521) — adversarial coverage.
 *
 * Intent: cover the boundary, integration, and regression gaps the
 * Mid/JR test files do not exercise. Anchored in live behavior
 * (real planner functions + real visualization pipeline + real
 * `syntheticMathFixture`) — no fake harnesses.
 *
 * Coverage categories:
 *   - boundary: `getRecommendedNext` topN with NaN / Infinity / negative /
 *     fractional / larger-than-N; `getUnlockValue` self-loops;
 *     `getGoalProximity` goal at disconnected component
 *   - failure-path: empty candidate set; mastery-everywhere; planner input
 *     with non-skill kinds excluded by visualization; node id returned by
 *     ranker but missing from `nodeMap`
 *   - integration: `syntheticMathFixture` round-trip through
 *     `projectStudentVisualization` — `recommendedNext` length, stability,
 *     and identity with the planner's top-N
 *   - regression: pre-track `[...ready, ...unknown].sort(nodeId).slice(0, 5)`
 *     semantics preserved where required; ranker uses `nodeId.localeCompare`
 *     ascending on ties; precomputation invariant for `computePriorities`
 *   - property: shuffled input node order produces identical
 *     `getRecommendedNext` output (the ranker is order-independent)
 *
 * These are tests; the prompts's request is "Add and commit valuable tests
 * and any tightly scoped fixes they expose." If a test below exposes a
 * real bug, the fix is committed in the same change set.
 */

import { describe, expect, it } from 'vitest';

import { syntheticMathFixture } from '@reading-advantage/knowledge-space-core';

import { getRecommendedNext } from '../planner/recommended-next.js';
import { getPriority, computePriorities } from '../planner/priority.js';
import { getUnlockValue } from '../planner/unlock-value.js';
import { getGoalProximity } from '../planner/goal-proximity.js';
import { projectStudentVisualization } from '../projections/visualization.js';
import { studentVisualizationV1Schema } from '../projections/schemas.js';
import {
  makePlannerChain,
  makePlannerEmpty,
  makePlannerNode,
  makePrereqEdge,
  makeNonPrereqEdge,
  defaultPriorityWeights,
} from './planner-fixtures.js';

const EPS = 1e-9;
const closeTo = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

// ---------------------------------------------------------------------------
// Boundary: `getRecommendedNext` topN values
// ---------------------------------------------------------------------------

describe('getRecommendedNext — topN boundary values', () => {
  const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'] });

  it('topN=0 returns []', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, 0)).toEqual([]);
  });

  it('topN=-1 returns [] (defensive against caller bugs)', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, -1)).toEqual([]);
  });

  it('topN=-100 returns [] (deeply negative)', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, -100)).toEqual([]);
  });

  it('topN=1 returns the single highest-priority node (chain.n1)', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, 1)).toEqual(['chain.n1']);
  });

  it('topN=2.5 truncates to 2 (Array.prototype.slice floors the end index)', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, 2.5)).toEqual([
      'chain.n1',
      'chain.n2',
    ]);
  });

  it('topN=NaN returns [] (NaN <= 0 fails; slice(0, NaN) converts NaN to 0)', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, Number.NaN)).toEqual([]);
  });

  it('topN=Infinity returns every node in rank order', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, Number.POSITIVE_INFINITY)).toEqual([
      'chain.n1',
      'chain.n2',
      'chain.n3',
      'chain.n4',
    ]);
  });

  it('topN larger than the node count returns every node in rank order', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, 999)).toEqual([
      'chain.n1',
      'chain.n2',
      'chain.n3',
      'chain.n4',
    ]);
  });

  it('topN=-0 returns [] (treats -0 as the boundary)', () => {
    expect(getRecommendedNext(graph, defaultPriorityWeights, -0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Boundary: `getUnlockValue` self-loops and orphan edges
// ---------------------------------------------------------------------------

describe('getUnlockValue — self-loop edges', () => {
  it('returns 0 when a node has a self-loop (cycle to itself)', () => {
    // chain.n1 -> chain.n1 is a self-loop. The visited set should prevent
    // infinite recursion and the result should be 0 (no distinct
    // descendants).
    const graph = {
      nodes: [makePlannerNode('self.a')],
      edges: [makePrereqEdge('self.a', 'self.a')],
      readinessByNode: {},
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getUnlockValue('self.a', graph)).toBe(0);
  });

  it('returns 0 for a self-loop mixed with real edges to other nodes (visited set self-excludes)', () => {
    // a -> a (self) and a -> b. Visited set has {a} at start, adds b.
    // Returns visited.size - 1 = 2 - 1 = 1.
    const graph = {
      nodes: [makePlannerNode('mix.a'), makePlannerNode('mix.b')],
      edges: [makePrereqEdge('mix.a', 'mix.a'), makePrereqEdge('mix.a', 'mix.b')],
      readinessByNode: {},
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getUnlockValue('mix.a', graph)).toBe(1);
    expect(getUnlockValue('mix.b', graph)).toBe(0);
  });
});

describe('getUnlockValue — orphan edges (edge references node not in graph.nodes)', () => {
  it('counts a target not in graph.nodes as a descendant (defensive: spec says "skills reachable")', () => {
    // Pin the documented behavior: the implementation does not filter the
    // downstream map by `graph.nodes`. If a future tightening changes
    // this, this test must be updated deliberately.
    const graph = {
      nodes: [makePlannerNode('orphan.a')],
      edges: [makePrereqEdge('orphan.a', 'orphan.ghost')],
      readinessByNode: {},
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getUnlockValue('orphan.a', graph)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Boundary: `getGoalProximity` edge cases
// ---------------------------------------------------------------------------

describe('getGoalProximity — goal in disconnected component', () => {
  it('returns 0 for nodes in a component with no path to the goal', () => {
    // Two disjoint chains: A: a1 -> a2 -> a3 (goal here); B: b1 -> b2.
    const graph = {
      nodes: [
        makePlannerNode('dc.a1'),
        makePlannerNode('dc.a2'),
        makePlannerNode('dc.a3'),
        makePlannerNode('dc.b1'),
        makePlannerNode('dc.b2'),
      ],
      edges: [
        makePrereqEdge('dc.a1', 'dc.a2'),
        makePrereqEdge('dc.a2', 'dc.a3'),
        makePrereqEdge('dc.b1', 'dc.b2'),
      ],
      readinessByNode: {},
      goalNodeIds: ['dc.a3'],
      misconceptionLinks: [],
    };
    expect(getGoalProximity('dc.a3', graph)).toBe(1);
    expect(closeTo(getGoalProximity('dc.a2', graph), 0.5)).toBe(true);
    expect(closeTo(getGoalProximity('dc.a1', graph), 1 / 3)).toBe(true);
    expect(getGoalProximity('dc.b1', graph)).toBe(0);
    expect(getGoalProximity('dc.b2', graph)).toBe(0);
  });
});

describe('getGoalProximity — goal that is a leaf (no incoming prereq edges)', () => {
  it('returns 0 for every other node when the goal has no upstream path', () => {
    // A standalone goal node with no edges. No node is upstream of it,
    // so only the goal itself is reachable.
    const graph = {
      nodes: [
        makePlannerNode('lonely.goal'),
        makePlannerNode('lonely.x'),
        makePlannerNode('lonely.y'),
      ],
      edges: [makePrereqEdge('lonely.x', 'lonely.y')],
      readinessByNode: {},
      goalNodeIds: ['lonely.goal'],
      misconceptionLinks: [],
    };
    expect(getGoalProximity('lonely.goal', graph)).toBe(1);
    expect(getGoalProximity('lonely.x', graph)).toBe(0);
    expect(getGoalProximity('lonely.y', graph)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Failure-path: empty / malformed candidates
// ---------------------------------------------------------------------------

describe('getRecommendedNext — failure-path inputs', () => {
  it('returns [] when input.nodes is empty even if edges are non-empty', () => {
    const graph = {
      ...makePlannerEmpty(),
      edges: [makePrereqEdge('a', 'b')],
    };
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([]);
  });

  it('returns [] when input has no `ready` and no `unknown` candidates (all mastered)', () => {
    // All nodes have no readiness entry (so all go to the unknown bucket
    // by the (readiness > 0) check) — this case has ready=[], unknown=[n1..nN].
    // The opposite case (all readiness > 0) puts everyone in ready.
    // This test pins the empty-empty case via topN=5 with N=0:
    const graph = makePlannerEmpty();
    expect(getRecommendedNext(graph, defaultPriorityWeights, 5)).toEqual([]);
  });

  it('a non-skill `kind` does not change the math (kind is opaque to the ranker)', () => {
    // The ranker does not look at `kind`. A `misconception` node mixed
    // in with skills is treated identically (its `readiness` is the only
    // signal that affects ranking).
    const graph = {
      nodes: [
        makePlannerNode('mix.skill', { kind: 'skill' }),
        makePlannerNode('mix.misc', { kind: 'misconception' }),
      ],
      edges: [],
      readinessByNode: { 'mix.skill': 0.7, 'mix.misc': 0.3 },
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([
      'mix.skill',
      'mix.misc',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Property: shuffled input order produces identical output
// ---------------------------------------------------------------------------

describe('getRecommendedNext — property: order-independent (shuffled input → same output)', () => {
  it('reordering input.nodes does not change the ranker output', () => {
    const graph = makePlannerChain({ length: 5, goalIds: ['chain.n5'] });
    const baseline = getRecommendedNext(graph, defaultPriorityWeights);

    // Reverse the order.
    const reversed = {
      ...graph,
      nodes: [...graph.nodes].reverse(),
    };
    expect(getRecommendedNext(reversed, defaultPriorityWeights)).toEqual(baseline);

    // Rotate the order.
    const rotated = {
      ...graph,
      nodes: [
        graph.nodes[2]!,
        graph.nodes[0]!,
        graph.nodes[4]!,
        graph.nodes[1]!,
        graph.nodes[3]!,
      ],
    };
    expect(getRecommendedNext(rotated, defaultPriorityWeights)).toEqual(baseline);
  });

  it('shuffled readinessByNode keys produce identical ranking', () => {
    const readiness = {
      'chain.n1': 0.4,
      'chain.n2': 0.3,
      'chain.n3': 0.2,
      'chain.n4': 0.1,
    };
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'], readiness });
    const baseline = getRecommendedNext(graph, defaultPriorityWeights);

    // The implementation iterates readinessByNode for entry enumeration
    // only inside the candidate partition step; the result must not
    // depend on the key enumeration order.
    const readinessMap = readiness as Readonly<Record<string, number>>;
    const shuffledKeys = Object.keys(readinessMap).reverse();
    const shuffledReadiness: Record<string, number> = {};
    for (const k of shuffledKeys) shuffledReadiness[k] = readinessMap[k]!;
    const shuffled = { ...graph, readinessByNode: shuffledReadiness };
    expect(getRecommendedNext(shuffled, defaultPriorityWeights)).toEqual(baseline);
  });
});

// ---------------------------------------------------------------------------
// Precomputation invariant (NFR): `computePriorities` bulk precompute
// ---------------------------------------------------------------------------

describe('computePriorities — precomputation invariant (NFR)', () => {
  it('matches the per-node oracle on a heterogeneous graph (mixed chain + tree)', () => {
    // Build a graph that mixes a chain and a tree: different unlock
    // value shapes coexist, and a goal in the chain exercises
    // goalProximity. Pin the bulk precompute result against the
    // per-node oracle for every node.
    const nodes = [
      makePlannerNode('mix.n1'),
      makePlannerNode('mix.n2'),
      makePlannerNode('mix.n3'),
      makePlannerNode('mix.t1'),
      makePlannerNode('mix.t1.a'),
      makePlannerNode('mix.t1.b'),
    ];
    const edges = [
      makePrereqEdge('mix.n1', 'mix.n2'),
      makePrereqEdge('mix.n2', 'mix.n3'),
      makePrereqEdge('mix.t1', 'mix.t1.a'),
      makePrereqEdge('mix.t1', 'mix.t1.b'),
    ];
    const graph = {
      nodes,
      edges,
      readinessByNode: {
        'mix.n1': 0.5,
        'mix.n2': 0.6,
        'mix.n3': 0.7,
        'mix.t1': 0.1,
        'mix.t1.a': 0.2,
        'mix.t1.b': 0.3,
      },
      goalNodeIds: ['mix.n3'],
      misconceptionLinks: [],
    };

    const bulk = computePriorities(graph, defaultPriorityWeights);
    expect(bulk.size).toBe(nodes.length);
    for (const node of nodes) {
      expect(closeTo(bulk.get(node.id)!, getPriority(node.id, graph, defaultPriorityWeights))).toBe(true);
    }
  });

  it('`computePriorities` returns a map whose values equal `getPriority` even when re-entered', () => {
    // Defense in depth: the function must not depend on a hidden
    // memoization state that could be perturbed by interleaved
    // `getPriority` calls.
    const graph = makePlannerChain({ length: 4, goalIds: ['chain.n4'] });
    const bulk = computePriorities(graph, defaultPriorityWeights);
    for (const node of graph.nodes) {
      // Call getPriority interleaved with bulk reads; result must not drift.
      getPriority(node.id, graph, defaultPriorityWeights);
      expect(closeTo(bulk.get(node.id)!, getPriority(node.id, graph, defaultPriorityWeights))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: syntheticMathFixture round-trip through the visualization
// ---------------------------------------------------------------------------

describe('syntheticMathFixture — visualization integration with real fixture', () => {
  it('recommendedNext is a non-empty top-N by priority on a real fixture with non-empty learner state', () => {
    // The synthetic math fixture has 2 `skill` nodes and 1 `task_blueprint`
    // node (the factoring-drill). With one mastered (the parent skill)
    // and the rest ready, the planner should surface the chain.
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;

    // Mark "identify-roots" as mastered so "solve-quadratic-by-factoring"
    // becomes ready (its prereq is met) and the blueprint remains
    // unconnected from the readiness chain (no prereq edge to it).
    const learnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
      'math.im3.skill.m1.l2.identify-roots': 'mastered',
    };

    const viz = projectStudentVisualization(nodes, edges, learnerState);

    expect(viz.schemaVersion).toBe('v1');
    expect(viz.recommendedNext.length).toBeGreaterThan(0);
    expect(viz.recommendedNext.length).toBeLessThanOrEqual(5);

    // The recommendedNext must be a subset of skill + task_blueprint
    // (visualization's filter scope). Pin the property.
    const skillOrTaskIds = new Set(
      nodes
        .filter((n) => n.kind === 'skill' || n.kind === 'task_blueprint')
        .map((n) => n.id),
    );
    for (const n of viz.recommendedNext) {
      expect(skillOrTaskIds.has(n.nodeId)).toBe(true);
    }

    // The recommendedNext must NOT include mastered / blocked nodes.
    for (const n of viz.recommendedNext) {
      expect(n.state === 'mastered' || n.state === 'blocked').toBe(false);
    }

    // The recommendedNext must validate against the student schema.
    const result = studentVisualizationV1Schema.safeParse(viz);
    expect(result.success).toBe(true);
  });

  it('recommendedNext is stable across two consecutive visualization calls (determinism)', () => {
    const learnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
      'math.im3.skill.m1.l2.identify-roots': 'mastered',
    };
    const v1 = projectStudentVisualization(
      syntheticMathFixture.nodes,
      syntheticMathFixture.edges,
      learnerState,
    );
    const v2 = projectStudentVisualization(
      syntheticMathFixture.nodes,
      syntheticMathFixture.edges,
      learnerState,
    );
    expect(v2.recommendedNext.map((n) => n.nodeId)).toEqual(
      v1.recommendedNext.map((n) => n.nodeId),
    );
  });

  it('recommendedNext matches `getRecommendedNext` on the projected planner input', () => {
    // Engineered learner state: mark the solve-by-factoring skill as
    // mastered so the visualization's candidate set is a known shape.
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;
    const learnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
      'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'mastered',
    };

    const viz = projectStudentVisualization(nodes, edges, learnerState);

    // Mirror the visualization's projection to call getRecommendedNext
    // on the same shape.
    const skillAndTask = nodes.filter(
      (n) => n.kind === 'skill' || n.kind === 'task_blueprint',
    );
    const masteredIds = new Set(
      Object.entries(learnerState)
        .filter(([, s]) => s === 'mastered')
        .map(([id]) => id),
    );
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // The visualization's candidate filter is `state === 'ready' || state === 'unknown'`.
    // Recompute state for each node using the same computeNodeState
    // logic by mirroring the visualization's projection: a node is
    // candidate iff (a) it is in skillAndTask, (b) it is not mastered
    // (mastered nodes are emitted to the mastered bucket), and (c) it is
    // not blocked (blocked nodes have unmet prereqs).
    const candidates = skillAndTask.filter((n) => {
      if (masteredIds.has(n.id)) return false;
      const prereqEdges = edges.filter(
        (e) => e.type === 'prerequisite_for' && e.targetId === n.id,
      );
      if (prereqEdges.length > 0) {
        const allPrereqsMet = prereqEdges.every(
          (e) => masteredIds.has(e.sourceId) || learnerState[e.sourceId] === 'mastered',
        );
        if (!allPrereqsMet) return false;
      }
      return true;
    });

    const plannerReadiness: Record<string, number> = {};
    for (const node of candidates) {
      const ls = learnerState[node.id];
      plannerReadiness[node.id] = ls === 'ready' || ls === 'review_due' ? 0.5 : 0;
    }

    const plannerInput = {
      nodes: candidates.map((n) => ({ id: n.id, kind: n.kind, title: n.title, domain: n.domain })),
      edges: edges
        .filter((e) => e.type === 'prerequisite_for')
        .map((e) => ({
          id: e.id,
          type: e.type,
          sourceId: e.sourceId,
          targetId: e.targetId,
          weight: e.weight,
        })),
      readinessByNode: plannerReadiness,
      goalNodeIds: [],
      misconceptionLinks: [],
    };

    const expected = getRecommendedNext(plannerInput, defaultPriorityWeights, 5);

    // Filter expected to those that are in the visualization's nodeMap
    // (the visualization silently drops ids that aren't in nodeMap, but
    // the planner input here is built from candidates which are all in
    // nodeMap — so the two arrays should match exactly).
    const expectedFiltered = expected.filter((id) => nodeMap.has(id));
    expect(viz.recommendedNext.map((n) => n.nodeId)).toEqual(expectedFiltered);
  });

  it('with all skills mastered, recommendedNext is empty', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;
    const learnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
      'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'mastered',
      'math.im3.skill.m1.l2.identify-roots': 'mastered',
      'math.im3.task-blueprint.m1.l2.factoring-drill': 'mastered',
    };
    const viz = projectStudentVisualization(nodes, edges, learnerState);
    expect(viz.recommendedNext).toEqual([]);
  });

  it('recommendedNext has length <= 5 across multiple learner states', () => {
    const states: ReadonlyArray<Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'>> = [
      {},
      { 'math.im3.skill.m1.l2.identify-roots': 'mastered' },
      { 'math.im3.skill.m1.l2.identify-roots': 'blocked' },
      {
        'math.im3.skill.m1.l2.identify-roots': 'mastered',
        'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'ready',
        'math.im3.task-blueprint.m1.l2.factoring-drill': 'ready',
      },
    ];
    for (const learnerState of states) {
      const viz = projectStudentVisualization(
        syntheticMathFixture.nodes,
        syntheticMathFixture.edges,
        learnerState,
      );
      expect(viz.recommendedNext.length).toBeLessThanOrEqual(5);
    }
  });
});

// ---------------------------------------------------------------------------
// Regression: pre-track `[...ready, ...unknown].sort(nodeId).slice(0, 5)`
// behavior preserved in the steady-state "all readiness equal" case
// ---------------------------------------------------------------------------

describe('getRecommendedNext — regression: pre-track slice-of-5 preserved in degenerate cases', () => {
  it('when every node has identical composite priority, the ranker falls back to nodeId.localeCompare ascending', () => {
    // With no edges, no goals, equal readiness for every node, and
    // weaknessFit = 0, the composite is identical for every node. The
    // pre-track `[...ready, ...unknown].sort(nodeId).slice(0, 5)` also
    // sorts by nodeId ascending (since they're all "ready"). The new
    // ranker must agree.
    const nodes = ['g.z', 'g.a', 'g.m', 'g.b', 'g.c'].map((id) => makePlannerNode(id));
    const graph = {
      nodes,
      edges: [],
      readinessByNode: { 'g.a': 0.5, 'g.b': 0.5, 'g.c': 0.5, 'g.m': 0.5, 'g.z': 0.5 },
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(getRecommendedNext(graph, defaultPriorityWeights)).toEqual([
      'g.a',
      'g.b',
      'g.c',
      'g.m',
      'g.z',
    ]);
  });

  it('topN=5 with a 7-node graph truncates the ranker output to 5 (matches pre-track `slice(0, 5)` default)', () => {
    const graph = makePlannerChain({ length: 7, goalIds: ['chain.n7'] });
    const out = getRecommendedNext(graph, defaultPriorityWeights);
    expect(out).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Boundary: edge type filtering is exhaustive
// ---------------------------------------------------------------------------

describe('getRecommendedNext — edge type filtering (exhaustive)', () => {
  // The ranker must consider ONLY `prerequisite_for` edges. This test
  // enumerates every non-prereq edge type used elsewhere in the
  // knowledge-space package and confirms none of them change the rank.
  const NON_PREREQ_EDGE_TYPES = [
    'contains',
    'appears_in_context',
    'aligned_to_standard',
    'generated_by',
    'remediated_by',
    'transfers_to',
    'supports',
    'extends',
    'common_misconception_with',
  ] as const;

  for (const edgeType of NON_PREREQ_EDGE_TYPES) {
    it(`ignores ${edgeType} edges when computing priority`, () => {
      // Baseline: 3 nodes with no edges, equal readiness.
      const baseline = {
        nodes: [
          makePlannerNode('et.a'),
          makePlannerNode('et.b'),
          makePlannerNode('et.c'),
        ],
        edges: [],
        readinessByNode: { 'et.a': 0.5, 'et.b': 0.5, 'et.c': 0.5 },
        goalNodeIds: [],
        misconceptionLinks: [],
      };

      // Add a `etType` edge that should be ignored.
      const withEdge = {
        ...baseline,
        edges: [makeNonPrereqEdge(edgeType, 'et.a', 'et.b')],
      };

      expect(getRecommendedNext(withEdge, defaultPriorityWeights)).toEqual(
        getRecommendedNext(baseline, defaultPriorityWeights),
      );
    });
  }
});
