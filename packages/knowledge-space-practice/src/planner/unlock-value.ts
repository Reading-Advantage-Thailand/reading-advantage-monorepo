/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — unlockValue scoring term.
 *
 * kst-srs.v2 §7.2: `unlockValue(B)` = count of distinct skills reachable
 * downstream from `B` via `prerequisite_for` edges. A high unlock value
 * means learning this skill opens many downstream opportunities.
 *
 * Pure functions, no I/O, no app imports, domain-neutral.
 */

import type { PlannerInput } from './types.js';

/**
 * Build a downstream adjacency map from prerequisite_for edges only.
 * Each entry maps `sourceId → targetId[]`, following the natural
 * edge direction (prerequisite → dependent).
 */
function buildDownstreamMap(
  edges: PlannerInput['edges'],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== 'prerequisite_for') continue;
    let targets = map.get(edge.sourceId);
    if (!targets) {
      targets = [];
      map.set(edge.sourceId, targets);
    }
    targets.push(edge.targetId);
  }
  return map;
}

/**
 * Computes normalized downstream reach for one node using
 * `ln(1 + reach) / ln(1 + maxReach)` from kst-srs.v3.2 §10.1.
 * @param nodeId Candidate node identifier.
 * @param graph Planner graph containing prerequisite edges.
 * @returns Normalized unlock value in the zero-to-one range.
 */
export function getUnlockValue(
  nodeId: string,
  graph: PlannerInput,
): number {
  const downstream = buildDownstreamMap(graph.edges);
  const reachByNode = computeRawReachByNode(graph, downstream);
  return normalizeReach(reachByNode.get(nodeId) ?? 0, maximumReach(reachByNode));
}

/**
 * Bulk precomputes normalized unlock values for every node in the graph.
 * @param graph Planner graph containing candidate nodes and prerequisite edges.
 * Returns a map keyed by every node id in `graph.nodes`.
 * @returns Read-only map of normalized unlock values.
 */
export function computeUnlockValues(
  graph: PlannerInput,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  if (graph.nodes.length === 0) return map;

  const reachByNode = computeRawReachByNode(graph, buildDownstreamMap(graph.edges));
  const maxReach = maximumReach(reachByNode);
  for (const node of graph.nodes) {
    map.set(node.id, normalizeReach(reachByNode.get(node.id) ?? 0, maxReach));
  }

  return map;
}

function computeRawReachByNode(
  graph: PlannerInput,
  downstream: ReadonlyMap<string, string[]>,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  for (const node of graph.nodes) {
    const visited = new Set<string>([node.id]);
    const stack = [...(downstream.get(node.id) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...(downstream.get(current) ?? []));
    }
    result.set(node.id, visited.size - 1);
  }
  return result;
}

function maximumReach(reachByNode: ReadonlyMap<string, number>): number {
  return Math.max(0, ...reachByNode.values());
}

function normalizeReach(reach: number, maxReach: number): number {
  if (reach <= 0 || maxReach <= 0) return 0;
  return Math.log1p(reach) / Math.log1p(maxReach);
}
