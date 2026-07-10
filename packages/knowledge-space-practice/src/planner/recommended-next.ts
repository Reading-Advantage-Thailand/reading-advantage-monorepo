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
import { getWeaknessFit } from './weakness-fit.js';
import {
  evaluateDomainUtility,
  type DomainUtilityProvider,
  type EvaluatedDomainUtility,
} from './domain-utility.js';
import {
  computePrerequisiteDensity,
  computeUtilityLedScore,
  projectReviewLoad,
  type PrerequisiteDensityResult,
  type ReviewLoadInput,
  type ReviewLoadProjection,
} from './review-load.js';
import { z } from 'zod';

const DEFAULT_DIVERSITY_CAP = 2;
const DEFAULT_READY_THRESHOLD = 0.8;
const DEFAULT_NEAR_THRESHOLD = 0.5;

/** Runtime configuration for the v3.2 recommendation policy. */
export const recommendationPolicySchema = z
  .strictObject({
    readyThreshold: z.number().finite().min(0).max(1).default(DEFAULT_READY_THRESHOLD),
    nearThreshold: z.number().finite().min(0).max(1).default(DEFAULT_NEAR_THRESHOLD),
    topN: z.number().finite().int().min(0).default(5),
  })
  .refine((value) => value.readyThreshold >= value.nearThreshold, {
    message: 'readyThreshold must be greater than or equal to nearThreshold',
  });

/** Configurable candidate thresholds and result limit for the v3.2 planner. */
export interface RecommendationPolicy {
  readonly readyThreshold?: number;
  readonly nearThreshold?: number;
  readonly topN?: number;
}

/** Input for the integrated provider-neutral v3.2 recommendation planner. */
export interface PlanRecommendedNextInput<Context = unknown> {
  readonly input: PlannerInput;
  readonly weights?: PriorityWeightInput;
  readonly policy?: RecommendationPolicy;
  readonly utilityProvider?: DomainUtilityProvider<Context>;
  readonly utilityContext?: Context;
  readonly reviewLoad?: ReviewLoadInput;
}

/** Integrated v3.2 recommendation result with auditable policy state. */
export interface PlanRecommendedNextResult {
  readonly recommendedNext: readonly string[];
  readonly rankingMode: 'composite' | 'utility-led';
  readonly prerequisiteDensity: PrerequisiteDensityResult;
  readonly reviewLoad: ReviewLoadProjection;
  readonly utilityByNode: Readonly<Record<string, EvaluatedDomainUtility>>;
}

const readinessByNodeSchema = z.record(
  z.string().min(1),
  z.number().finite().min(0).max(1),
);

/**
 * Ranks candidates and applies the nearest-container diversity cap.
 * @param input Planner graph and learner signals.
 * @param weights Versioned five-term priority weights.
 * @param topN Maximum number of candidate identifiers to return.
 * @param policy Optional readiness thresholds for candidate eligibility.
 * @returns Deterministically ranked candidate identifiers.
 * @throws When readiness, weights, thresholds, or result limit are invalid.
 */
export function getRecommendedNext(
  input: PlannerInput,
  weights: PriorityWeightInput = DEFAULT_PRIORITY_WEIGHTS,
  topN = 5,
  policy: Omit<RecommendationPolicy, 'topN'> = {},
): readonly string[] {
  const validatedPolicy = recommendationPolicySchema.parse({ ...policy, topN });
  const readinessByNode = readinessByNodeSchema.parse(input.readinessByNode);
  if (validatedPolicy.topN === 0 || input.nodes.length === 0) return [];

  const priorityCache = new Map<string, number>();
  const candidates: string[] = [];

  for (const node of input.nodes) {
    const p = getPriority(node.id, input, weights);
    priorityCache.set(node.id, p);

    const readiness = readinessByNode[node.id];
    if (readiness !== undefined && readiness >= validatedPolicy.nearThreshold) {
      candidates.push(node.id);
    }
  }

  const comparator = (a: string, b: string): number => {
    const pa = priorityCache.get(a) ?? 0;
    const pb = priorityCache.get(b) ?? 0;
    if (pa !== pb) return pb - pa;
    return a.localeCompare(b);
  };

  candidates.sort(comparator);

  return applyDiversityCap(candidates, input, validatedPolicy.topN);
}

/**
 * Plans recommendations with sparse-domain utility ranking and review-load gating.
 * @param request Graph input, provider injection, policy, and review-load context.
 * @returns Recommendations plus ranking, provenance, density, and load state.
 * @throws When readiness, provider output, policy, or review-load input is invalid.
 */
export function planRecommendedNext<Context>(
  request: PlanRecommendedNextInput<Context>,
): PlanRecommendedNextResult {
  const policy = recommendationPolicySchema.parse(request.policy ?? {});
  const readinessByNode = readinessByNodeSchema.parse(request.input.readinessByNode);
  const reviewLoad = projectReviewLoad(
    request.reviewLoad ?? { cardsDueWithinSevenDays: 0, maxReviewsPerDay: 20 },
  );
  const prerequisiteDensity = computePrerequisiteDensity(
    request.input.nodes,
    request.input.edges,
  );
  const eligibilityThreshold = prerequisiteDensity.prerequisiteSparse
    ? policy.readyThreshold
    : policy.nearThreshold;
  const utilityByNode: Record<string, EvaluatedDomainUtility> = {};
  const eligibleNodeIds = request.input.nodes
    .filter((node) => (readinessByNode[node.id] ?? 0) >= eligibilityThreshold)
    .map((node) => node.id);

  for (const nodeId of eligibleNodeIds) {
    utilityByNode[nodeId] = evaluateDomainUtility(
      request.utilityProvider,
      nodeId,
      request.utilityContext as Context,
    );
  }

  if (!reviewLoad.allowNewSkills) {
    return {
      recommendedNext: [],
      rankingMode: prerequisiteDensity.prerequisiteSparse ? 'utility-led' : 'composite',
      prerequisiteDensity,
      reviewLoad,
      utilityByNode,
    };
  }

  const utilityScores = Object.fromEntries(
    Object.entries(utilityByNode).map(([nodeId, value]) => [nodeId, value.utility]),
  );
  const plannerInput: PlannerInput = {
    ...request.input,
    readinessByNode,
    utilityByNode: utilityScores,
  };

  if (!prerequisiteDensity.prerequisiteSparse) {
    return {
      recommendedNext: getRecommendedNext(
        plannerInput,
        request.weights ?? DEFAULT_PRIORITY_WEIGHTS,
        policy.topN,
        {
          readyThreshold: policy.readyThreshold,
          nearThreshold: policy.nearThreshold,
        },
      ),
      rankingMode: 'composite',
      prerequisiteDensity,
      reviewLoad,
      utilityByNode,
    };
  }

  const scoreByNode = new Map<string, number>();
  for (const nodeId of eligibleNodeIds) {
    const score = computeUtilityLedScore(
      {
        readiness: readinessByNode[nodeId] ?? 0,
        utility: utilityByNode[nodeId]?.utility ?? 0,
        weaknessFit: getWeaknessFit(nodeId, plannerInput),
      },
      policy.readyThreshold,
    );
    if (score !== null) scoreByNode.set(nodeId, score);
  }
  const rankedNodeIds = [...scoreByNode.keys()].sort((a, b) => {
    const scoreDifference = (scoreByNode.get(b) ?? 0) - (scoreByNode.get(a) ?? 0);
    return scoreDifference === 0 ? a.localeCompare(b) : scoreDifference;
  });

  return {
    recommendedNext: applyDiversityCap(rankedNodeIds, plannerInput, policy.topN),
    rankingMode: 'utility-led',
    prerequisiteDensity,
    reviewLoad,
    utilityByNode,
  };
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
    const queue = directParents.map((parentId) => ({ parentId, distance: 1 }));
    const visited = new Set<string>([node.id]);
    let nearest: string | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.distance > nearestDistance) break;
      if (visited.has(current.parentId)) continue;
      visited.add(current.parentId);
      const kind = nodeKind.get(current.parentId);
      if (kind === 'instructional_unit' || kind === 'content_group') {
        nearest = nearest === undefined
          ? current.parentId
          : [nearest, current.parentId].sort()[0];
        nearestDistance = current.distance;
        continue;
      }
      for (const parentId of [...(parentsByNode.get(current.parentId) ?? [])].sort()) {
        queue.push({ parentId, distance: current.distance + 1 });
      }
    }

    nearest ??= directParents[0];
    if (nearest) groups.set(node.id, nearest);
  }
  return groups;
}
