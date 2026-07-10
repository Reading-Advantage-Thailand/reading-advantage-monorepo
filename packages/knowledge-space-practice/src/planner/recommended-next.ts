/**
 * Phase 3 (Track 4 next-skill-planner_20260521) — recommendedNext top-N ranker.
 *
 * kst-srs.v2 §7.2 / spec.md FR5: `recommendedNext` becomes top-N by
 * `priority`, replacing the pre-track `[...ready, ...unknown].slice(0, 5)`
 * placeholder. The ranker preserves the ready-before-unknown partitioning:
 * nodes with positive readiness come before nodes without, and within each
 * partition the ranker sorts by composite priority descending with
 * `nodeId.localeCompare` ascending as the tie-break.
 *
 * Pure functions, no I/O, no app imports, domain-neutral.
 */

import type { PlannerInput } from './types.js';
import { getPriority } from './priority.js';

export function getRecommendedNext(
  input: PlannerInput,
  weights: { a: number; b: number; c: number; d: number },
  topN = 5,
): readonly string[] {
  if (topN <= 0 || input.nodes.length === 0) return [];

  const priorityCache = new Map<string, number>();
  const ready: string[] = [];
  const unknown: string[] = [];

  for (const node of input.nodes) {
    const p = getPriority(node.id, input, weights);
    priorityCache.set(node.id, p);

    const readiness = input.readinessByNode[node.id];
    if (readiness !== undefined && readiness > 0) {
      ready.push(node.id);
    } else {
      unknown.push(node.id);
    }
  }

  const comparator = (a: string, b: string): number => {
    const pa = priorityCache.get(a) ?? 0;
    const pb = priorityCache.get(b) ?? 0;
    if (pa !== pb) return pb - pa;
    return a.localeCompare(b);
  };

  ready.sort(comparator);
  unknown.sort(comparator);

  return [...ready, ...unknown].slice(0, topN);
}
