/**
 * Phase 3 (Track 4 next-skill-planner_20260521) — composite priority scoring.
 *
 * kst-srs.v2 §7.2 / spec.md FR4:
 *   priority(B) = a·readiness(B) + b·unlockValue(B) + c·goalProximity(B)
 *                 + d·weaknessFit(B)
 * with configurable engine weights a, b, c, d.
 *
 * Pure functions, no I/O, no app imports, domain-neutral.
 */

import type { PlannerInput } from './types.js';
import { getUnlockValue, computeUnlockValues } from './unlock-value.js';
import { getGoalProximity, computeGoalProximities } from './goal-proximity.js';
import { getWeaknessFit } from './weakness-fit.js';

export function getPriority(
  nodeId: string,
  input: PlannerInput,
  weights: { a: number; b: number; c: number; d: number },
): number {
  const readiness = input.readinessByNode[nodeId] ?? 0;
  const unlockValue = getUnlockValue(nodeId, input);
  const goalProximity = getGoalProximity(nodeId, input);
  const weaknessFit = getWeaknessFit(nodeId, input);

  return (
    weights.a * readiness +
    weights.b * unlockValue +
    weights.c * goalProximity +
    weights.d * weaknessFit
  );
}

export function computePriorities(
  input: PlannerInput,
  weights: { a: number; b: number; c: number; d: number },
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  if (input.nodes.length === 0) return map;

  const unlockValues = computeUnlockValues(input);
  const goalProximities = computeGoalProximities(input);

  for (const node of input.nodes) {
    const readiness = input.readinessByNode[node.id] ?? 0;
    map.set(
      node.id,
      weights.a * readiness +
        weights.b * (unlockValues.get(node.id) ?? 0) +
        weights.c * (goalProximities.get(node.id) ?? 0) +
        weights.d * getWeaknessFit(node.id, input),
    );
  }

  return map;
}
