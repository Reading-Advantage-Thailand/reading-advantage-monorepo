/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — shared planner test
 * fixtures.
 *
 * Per test-strategy.md §2, this file is the source for hand-rolled
 * graph builders that produce `PlannerInput` shape (the narrow,
 * domain-neutral subset the planner scoring terms consume). It
 * mirrors the `prereqEdge` factory pattern from
 * `packages/knowledge-space-core/src/placement-fixtures.ts` but
 * projects to `PlannerEdgeView` (no `confidence`, `sourceRefs`,
 * `reviewStatus`).
 *
 * Pure, deterministic, no shared mutable state across calls: each
 * builder returns a fresh `PlannerInput`. Node IDs are stable across
 * calls of the same builder (deterministic for property tests and
 * snapshot stability) but do not collide across builders (each
 * builder uses a distinct id prefix).
 *
 * Reuses `KnowledgeSpaceNode` / `KnowledgeSpaceEdge` semantics from
 * `knowledge-space-core/src/types.ts` (the underlying edge `type`
 * literals: `prerequisite_for`, `supports`, `common_misconception_with`,
 * etc.) so a future widening of the planner input to the canonical
 * types is a mechanical change.
 */

import type {
  PlannerInput,
  PlannerNodeView,
  PlannerEdgeView,
  PlannerMisconceptionLink,
} from '../planner/types.js';

// ---------------------------------------------------------------------------
// Node / edge / link factories
// ---------------------------------------------------------------------------

/**
 * Build a single PlannerNodeView with sensible defaults.
 *
 * `id` is the only required argument. Defaults: `kind='skill'`,
 * `title=id`, `domain='math.test.planner'`.
 */
export function makePlannerNode(
  id: string,
  overrides: Partial<PlannerNodeView> = {},
): PlannerNodeView {
  return {
    id,
    kind: 'skill',
    title: id,
    domain: 'math.test.planner',
    ...overrides,
  };
}

/**
 * Build a single `prerequisite_for` edge in the narrow
 * `PlannerEdgeView` shape. Mirrors the `prereqEdge` factory in
 * `placement-fixtures.ts` but emits the planner-edge subset.
 */
export function makePrereqEdge(
  sourceId: string,
  targetId: string,
  weight = 1,
): PlannerEdgeView {
  return {
    id: `${sourceId}->${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight,
  };
}

/**
 * Build a non-prerequisite edge (e.g. `supports`, `extends`,
 * `common_misconception_with`). Used to assert that scoring terms
 * ignore edge types other than `prerequisite_for`.
 */
export function makeNonPrereqEdge(
  type: string,
  sourceId: string,
  targetId: string,
  weight = 1,
): PlannerEdgeView {
  return {
    id: `${sourceId}->${targetId}#${type}`,
    type,
    sourceId,
    targetId,
    weight,
  };
}

/**
 * Build a `PlannerMisconceptionLink` (Phase 2 stub-mode input; not
 * consumed by `weaknessFit` until Track 6 lands). Default severity
 * is `'minor'`.
 */
export function makeMisconceptionLink(
  skillId: string,
  severity: 'minor' | 'severe' = 'minor',
  misconceptionId = 'm.test',
): PlannerMisconceptionLink {
  return { skillId, misconceptionId, severity };
}

// ---------------------------------------------------------------------------
// Graph builders
// ---------------------------------------------------------------------------

export interface MakeChainOptions {
  /** Number of nodes in the chain. Default 5. Must be >= 1. */
  length?: number;
  /** Optional goal node IDs (default: empty). */
  goalIds?: readonly string[];
  /** Optional readiness values keyed by node id. */
  readiness?: Readonly<Record<string, number>>;
}

/**
 * Build a linear prerequisite_for chain of `n` nodes:
 *   chain.n1 -> chain.n2 -> ... -> chain.nN
 * Used to test degenerate chain semantics for `unlockValue` and
 * `goalProximity` (inverse distance to the tail).
 */
export function makePlannerChain(opts: MakeChainOptions = {}): PlannerInput {
  const length = opts.length ?? 5;
  if (length < 1) {
    throw new Error('makePlannerChain requires length >= 1');
  }
  const nodes: PlannerNodeView[] = [];
  const edges: PlannerEdgeView[] = [];
  for (let i = 1; i <= length; i++) {
    nodes.push(makePlannerNode(`chain.n${i}`));
    if (i > 1) {
      edges.push(makePrereqEdge(`chain.n${i - 1}`, `chain.n${i}`));
    }
  }
  return {
    nodes,
    edges,
    readinessByNode: opts.readiness ?? {},
    goalNodeIds: [...(opts.goalIds ?? [])],
    misconceptionLinks: [],
  };
}

export interface MakeTreeOptions {
  /** Depth of the tree (root at level 1, leaves at level `depth`). */
  depth: number;
  /** Branching factor: each non-leaf has this many children. Default 2. */
  branching?: number;
  goalIds?: readonly string[];
  readiness?: Readonly<Record<string, number>>;
}

/**
 * Build a balanced tree of `prerequisite_for` edges.
 * Root is `tree.root`. Children are generated depth-first with
 * stable IDs `tree.n{level}.{branch}.{counter}`.
 */
export function makePlannerTree(opts: MakeTreeOptions): PlannerInput {
  const { depth, branching = 2, goalIds = [], readiness = {} } = opts;
  if (depth < 1) {
    throw new Error('makePlannerTree requires depth >= 1');
  }
  const nodes: PlannerNodeView[] = [makePlannerNode('tree.root')];
  const edges: PlannerEdgeView[] = [];
  const queue: { id: string; level: number }[] = [
    { id: 'tree.root', level: 1 },
  ];
  let counter = 0;
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (level >= depth) continue;
    for (let b = 0; b < branching; b++) {
      counter += 1;
      const childId = `tree.n${level}.${b}.${counter}`;
      nodes.push(makePlannerNode(childId));
      edges.push(makePrereqEdge(id, childId));
      queue.push({ id: childId, level: level + 1 });
    }
  }
  return {
    nodes,
    edges,
    readinessByNode: readiness,
    goalNodeIds: [...goalIds],
    misconceptionLinks: [],
  };
}

export interface MakeCyclicOptions {
  goalIds?: readonly string[];
  readiness?: Readonly<Record<string, number>>;
}

/**
 * Build a small graph with a single `prerequisite_for` cycle:
 *   cyc.a -> cyc.b -> cyc.c -> cyc.a
 *
 * Used to assert that the `unlockValue` traversal terminates on
 * cyclic input (defense-in-depth — Track 1 forbids cycles via
 * `getPrerequisiteCycles`, but the planner must not assume it).
 */
export function makePlannerCyclic(opts: MakeCyclicOptions = {}): PlannerInput {
  return {
    nodes: [
      makePlannerNode('cyc.a'),
      makePlannerNode('cyc.b'),
      makePlannerNode('cyc.c'),
    ],
    edges: [
      makePrereqEdge('cyc.a', 'cyc.b'),
      makePrereqEdge('cyc.b', 'cyc.c'),
      makePrereqEdge('cyc.c', 'cyc.a'),
    ],
    readinessByNode: opts.readiness ?? {},
    goalNodeIds: [...(opts.goalIds ?? [])],
    misconceptionLinks: [],
  };
}

export interface MakeDisconnectedOptions {
  goalIds?: readonly string[];
  readiness?: Readonly<Record<string, number>>;
}

/**
 * Build two disconnected prerequisite_for chains:
 *   chain A: disc.a1 -> disc.a2 -> disc.a3
 *   chain B: disc.b1 -> disc.b2
 *
 * Used to assert `goalProximity` = 0 for unreachable nodes and
 * `unlockValue` accounting is per-connected-component.
 */
export function makePlannerDisconnected(
  opts: MakeDisconnectedOptions = {},
): PlannerInput {
  return {
    nodes: [
      makePlannerNode('disc.a1'),
      makePlannerNode('disc.a2'),
      makePlannerNode('disc.a3'),
      makePlannerNode('disc.b1'),
      makePlannerNode('disc.b2'),
    ],
    edges: [
      makePrereqEdge('disc.a1', 'disc.a2'),
      makePrereqEdge('disc.a2', 'disc.a3'),
      makePrereqEdge('disc.b1', 'disc.b2'),
    ],
    readinessByNode: opts.readiness ?? {},
    goalNodeIds: [...(opts.goalIds ?? [])],
    misconceptionLinks: [],
  };
}

export interface MakePlannerGraphOptions {
  goalIds?: readonly string[];
  readiness?: Readonly<Record<string, number>>;
  misconceptionLinks?: readonly PlannerMisconceptionLink[];
  /** Extra nodes to append (id, defaults). */
  extraNodes?: readonly PlannerNodeView[];
  /** Extra edges to append. */
  extraEdges?: readonly PlannerEdgeView[];
}

/**
 * Build an empty `PlannerInput` with optional overlay
 * (readiness, goals, misconception links, extra nodes/edges).
 * The scoring terms must handle the no-nodes / no-edges case
 * without throwing.
 */
export function makePlannerEmpty(opts: MakePlannerGraphOptions = {}): PlannerInput {
  return {
    nodes: [...(opts.extraNodes ?? [])],
    edges: [...(opts.extraEdges ?? [])],
    readinessByNode: opts.readiness ?? {},
    goalNodeIds: [...(opts.goalIds ?? [])],
    misconceptionLinks: [...(opts.misconceptionLinks ?? [])],
  };
}

// ---------------------------------------------------------------------------
// Default priority weights — for Phase 3 use
// ---------------------------------------------------------------------------

/**
 * Baseline equal weights for the a/b/c/d composite priority. Frozen
 * to prevent accidental mutation across tests.
 */
export const defaultPriorityWeights = Object.freeze({
  a: 1,
  b: 1,
  c: 1,
  d: 1,
});
