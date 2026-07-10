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
 * Count distinct descendants reachable from `nodeId` via
 * `prerequisite_for` edges. Uses iterative DFS with a visited set
 * to handle cycles safely.
 */
export function getUnlockValue(
  nodeId: string,
  graph: PlannerInput,
): number {
  const downstream = buildDownstreamMap(graph.edges);

  const visited = new Set<string>();
  const stack: string[] = [];

  const initials = downstream.get(nodeId);
  if (!initials || initials.length === 0) return 0;

  visited.add(nodeId);
  for (const child of initials) {
    if (!visited.has(child)) {
      visited.add(child);
      stack.push(child);
    }
  }

  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = downstream.get(current);
    if (children) {
      for (const child of children) {
        if (!visited.has(child)) {
          visited.add(child);
          stack.push(child);
        }
      }
    }
  }

  return visited.size - 1;
}

/**
 * Bulk precompute unlock values for every node in the graph.
 * Returns a map keyed by every node id in `graph.nodes`.
 */
export function computeUnlockValues(
  graph: PlannerInput,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  if (graph.nodes.length === 0) return map;

  const downstream = buildDownstreamMap(graph.edges);

  for (const node of graph.nodes) {
    const visited = new Set<string>();
    const stack: string[] = [];

    visited.add(node.id);
    const initials = downstream.get(node.id);
    if (initials) {
      for (const child of initials) {
        if (!visited.has(child)) {
          visited.add(child);
          stack.push(child);
        }
      }
    }

    while (stack.length > 0) {
      const current = stack.pop()!;
      const children = downstream.get(current);
      if (children) {
        for (const child of children) {
          if (!visited.has(child)) {
            visited.add(child);
            stack.push(child);
          }
        }
      }
    }

    map.set(node.id, visited.size - 1);
  }

  return map;
}
