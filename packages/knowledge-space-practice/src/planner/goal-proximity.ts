/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — goalProximity scoring term.
 *
 * kst-srs.v2 §7.2: `goalProximity(B)` = inverse graph distance from `B`
 * to the learner's goal node(s). Distance is measured along the reversed
 * prerequisite chain: an edge `A → B` means `A` is a prerequisite for
 * `B`, so a prerequisite of the goal is "nearer" to the goal.
 *
 * Distance = number of reverse-edge hops from the goal to the node.
 * Proximity = 1 / (distance + 1), bounded to [0, 1].
 * Unreachable nodes and nodes when no goal is set return 0.
 *
 * Pure functions, no I/O, no app imports, domain-neutral.
 */

import type { PlannerInput } from './types.js';

/**
 * Build a reverse adjacency map: `targetId → sourceId[]` for
 * each `prerequisite_for` edge. This lets us BFS outward from
 * the goal node(s) to discover upstream prerequisites.
 */
function buildReverseMap(
  edges: PlannerInput['edges'],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== 'prerequisite_for') continue;
    let sources = map.get(edge.targetId);
    if (!sources) {
      sources = [];
      map.set(edge.targetId, sources);
    }
    sources.push(edge.sourceId);
  }
  return map;
}

/**
 * Compute the graph distance from each reachable node to the
 * nearest goal node via reverse `prerequisite_for` edges.
 * Returns `Map<nodeId, distance>` where distance is the number
 * of reverse hops from the goal to the node.
 */
function computeDistancesToGoals(
  graph: PlannerInput,
  reverseMap: Map<string, string[]>,
): Map<string, number> {
  const nodeIndex = new Set(graph.nodes.map((n) => n.id));
  const goalSet = new Set(graph.goalNodeIds);

  const distance = new Map<string, number>();

  if (goalSet.size === 0 || graph.nodes.length === 0) return distance;

  const queue: string[] = [];

  for (const goalId of graph.goalNodeIds) {
    if (nodeIndex.has(goalId)) {
      distance.set(goalId, 0);
      queue.push(goalId);
    }
  }

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    const currentDist = distance.get(current)!;
    const prerequisites = reverseMap.get(current);
    if (prerequisites) {
      for (const prereq of prerequisites) {
        if (!distance.has(prereq) && nodeIndex.has(prereq)) {
          distance.set(prereq, currentDist + 1);
          queue.push(prereq);
        }
      }
    }
  }

  return distance;
}

/**
 * Per-node oracle: inverse distance from `nodeId` to the nearest
 * goal, or 0 if unreachable / no goal set.
 */
export function getGoalProximity(
  nodeId: string,
  graph: PlannerInput,
): number {
  const reverseMap = buildReverseMap(graph.edges);
  const distances = computeDistancesToGoals(graph, reverseMap);
  const d = distances.get(nodeId);
  if (d === undefined) return 0;
  return 1 / (d + 1);
}

/**
 * Bulk precompute goal proximities for every node in the graph.
 * Returns a map keyed by every node id in `graph.nodes`.
 */
export function computeGoalProximities(
  graph: PlannerInput,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  if (graph.nodes.length === 0) return map;

  const reverseMap = buildReverseMap(graph.edges);
  const distances = computeDistancesToGoals(graph, reverseMap);

  for (const node of graph.nodes) {
    const d = distances.get(node.id);
    map.set(node.id, d !== undefined ? 1 / (d + 1) : 0);
  }

  return map;
}
