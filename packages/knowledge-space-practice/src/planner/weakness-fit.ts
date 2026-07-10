/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — weaknessFit scoring term.
 *
 * kst-srs.v2 §7.2: `weaknessFit(B)` is the boost applied to a node
 * that is linked to a recently-failed area or an active misconception.
 * Track 6 (misconception-loop) provides the full state machine that
 * surfaces those links; until Track 6 integrates with the planner,
 * `weaknessFit` is stubbed to return 0 for every node regardless of
 * `misconceptionLinks`.
 *
 * Pure functions, no I/O, no app imports, domain-neutral.
 * Boundary: does NOT import from `./misconception-loop`.
 */

import type { PlannerInput } from './types.js';

/**
 * Per-node oracle: returns 0 for every node in stub mode.
 * Track 6 integration will inject the full boost computation.
 */
export function getWeaknessFit(
  _nodeId: string,
  _graph: PlannerInput,
): number {
  return 0;
}

/**
 * Bulk precompute weaknessFit values for every node in the graph.
 * Returns a map keyed by every node id in `graph.nodes`.
 */
export function computeWeaknessFitMap(
  graph: PlannerInput,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const node of graph.nodes) {
    map.set(node.id, 0);
  }
  return map;
}
