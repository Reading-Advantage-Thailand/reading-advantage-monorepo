/**
 * Phase 3 (Track 4 next-skill-planner_20260521) — composite priority scoring.
 *
 * kst-srs.v2 §7.2 / spec.md FR4:
 *   priority(B) = a·readiness(B) + b·unlockValue(B) + c·goalProximity(B)
 *                 + d·weaknessFit(B) + e·utility(B)
 * with normalized terms and configurable engine weights a, b, c, d, e.
 *
 * Pure functions, no I/O, no app imports, domain-neutral.
 */

import {
  DEFAULT_PRIORITY_WEIGHTS,
  type PlannerInput,
  type PriorityWeightInput,
  type PriorityWeights,
} from './types.js';
import { getUnlockValue, computeUnlockValues } from './unlock-value.js';
import { getGoalProximity, computeGoalProximities } from './goal-proximity.js';
import { getWeaknessFit } from './weakness-fit.js';

export function getPriority(
  nodeId: string,
  input: PlannerInput,
  weights: PriorityWeightInput = DEFAULT_PRIORITY_WEIGHTS,
): number {
  const resolvedWeights = resolveWeights(weights);
  const readiness = normalizeTerm(input.readinessByNode[nodeId] ?? 0);
  const unlockValue = normalizeTerm(getUnlockValue(nodeId, input));
  const goalProximity = normalizeTerm(getGoalProximity(nodeId, input));
  const weaknessFit = normalizeTerm(getWeaknessFit(nodeId, input));
  const utility = normalizeTerm(input.utilityByNode?.[nodeId] ?? 0);

  return (
    resolvedWeights.a * readiness +
    resolvedWeights.b * unlockValue +
    resolvedWeights.c * goalProximity +
    resolvedWeights.d * weaknessFit +
    resolvedWeights.e * utility
  );
}

/**
 * Computes normalized priority scores for every node in one planner input.
 * @param input Planner graph and learner signals.
 * @param weights Versioned five-term planner weights.
 * @returns A read-only map from node identifier to composite priority.
 */
export function computePriorities(
  input: PlannerInput,
  weights: PriorityWeightInput = DEFAULT_PRIORITY_WEIGHTS,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  if (input.nodes.length === 0) return map;

  const unlockValues = computeUnlockValues(input);
  const goalProximities = computeGoalProximities(input);
  const resolvedWeights = resolveWeights(weights);

  for (const node of input.nodes) {
    const readiness = normalizeTerm(input.readinessByNode[node.id] ?? 0);
    map.set(
      node.id,
      resolvedWeights.a * readiness +
        resolvedWeights.b * normalizeTerm(unlockValues.get(node.id) ?? 0) +
        resolvedWeights.c * normalizeTerm(goalProximities.get(node.id) ?? 0) +
        resolvedWeights.d * normalizeTerm(getWeaknessFit(node.id, input)) +
        resolvedWeights.e * normalizeTerm(input.utilityByNode?.[node.id] ?? 0),
    );
  }

  return map;
}

function resolveWeights(weights: PriorityWeightInput): PriorityWeights {
  return { ...weights, e: weights.e ?? 0 };
}

/** Clamps a planner term to its normative zero-to-one range. */
function normalizeTerm(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
