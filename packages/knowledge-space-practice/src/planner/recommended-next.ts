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

import {
  DEFAULT_PRIORITY_WEIGHTS,
  type PlannerInput,
  type PriorityWeightInput,
} from './types.js';
import { getPriority } from './priority.js';

const DEFAULT_DIVERSITY_CAP = 2;

/**
 * Ranks candidates and applies the nearest-container diversity cap.
 * @param input Planner graph and learner signals.
 * @param weights Versioned five-term priority weights.
 * @param topN Maximum number of candidate identifiers to return.
 * @returns Deterministically ranked candidate identifiers.
 */
export function getRecommendedNext(
  input: PlannerInput,
  weights: PriorityWeightInput = DEFAULT_PRIORITY_WEIGHTS,
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

  return applyDiversityCap([...ready, ...unknown], input, topN);
}

function applyDiversityCap(
  rankedNodeIds: readonly string[],
  input: PlannerInput,
  topN: number,
): string[] {
  const groupByNode = nearestContainsAncestorByNode(input);
  const countByGroup = new Map<string, number>();
  const selected: string[] = [];

  for (const nodeId of rankedNodeIds) {
    const groupId = groupByNode.get(nodeId) ?? `ungrouped:${nodeId}`;
    const currentCount = countByGroup.get(groupId) ?? 0;
    if (currentCount >= DEFAULT_DIVERSITY_CAP) continue;
    selected.push(nodeId);
    countByGroup.set(groupId, currentCount + 1);
    if (selected.length >= topN) break;
  }

  return selected;
}

function nearestContainsAncestorByNode(input: PlannerInput): ReadonlyMap<string, string> {
  const nodeKind = new Map(input.nodes.map((node) => [node.id, node.kind]));
  const parentsByNode = new Map<string, string[]>();
  for (const edge of input.edges) {
    if (edge.type !== 'contains') continue;
    const parents = parentsByNode.get(edge.targetId) ?? [];
    parents.push(edge.sourceId);
    parentsByNode.set(edge.targetId, parents);
  }

  const groups = new Map<string, string>();
  for (const node of input.nodes) {
    const directParents = [...(parentsByNode.get(node.id) ?? [])].sort();
    const instructionalUnit = directParents.find(
      (parentId) => nodeKind.get(parentId) === 'instructional_unit',
    );
    const contentGroup = directParents.find(
      (parentId) => nodeKind.get(parentId) === 'content_group',
    );
    const nearest = instructionalUnit ?? contentGroup ?? directParents[0];
    if (nearest) groups.set(node.id, nearest);
  }
  return groups;
}
