/** Minimal node shape needed for prerequisite-density computation. */
export interface DensityNode {
  id: string;
  kind: string;
}

/** Minimal edge shape needed for prerequisite-density computation. */
export interface DensityEdge {
  type: string;
  targetId: string;
}

/** Static graph-release prerequisite-density result. */
export interface PrerequisiteDensityResult {
  density: number;
  prerequisiteSparse: boolean;
}

/** Utility-led ranking inputs after provider validation. */
export interface UtilityLedTerms {
  readiness: number;
  utility: number;
  weaknessFit: number;
}

/** Inputs for projecting the next seven days of review load. */
export interface ReviewLoadInput {
  cardsDueWithinSevenDays: number;
  maxReviewsPerDay: number;
  loadBudgetFactor?: number;
}

/** Review-load state surfaced to planners and projections. */
export interface ReviewLoadProjection {
  projectedDailyLoad: number;
  budget: number;
  reviewLoadState: 'normal' | 'elevated' | 'saturated';
  allowNewSkills: boolean;
}

/**
 * Computes the fraction of skill nodes with a prerequisite in-edge.
 * @param nodes Graph nodes for one domain release.
 * @param edges Graph edges for the same release.
 * @returns Density plus the strict less-than-five-percent sparse flag.
 */
export function computePrerequisiteDensity(
  nodes: readonly DensityNode[],
  edges: readonly DensityEdge[],
): PrerequisiteDensityResult {
  const skillIds = new Set(nodes.filter((node) => node.kind === 'skill').map((node) => node.id));
  const withPrerequisite = new Set(
    edges
      .filter((edge) => edge.type === 'prerequisite_for' && skillIds.has(edge.targetId))
      .map((edge) => edge.targetId),
  );
  const density = skillIds.size === 0 ? 0 : withPrerequisite.size / skillIds.size;
  return { density, prerequisiteSparse: density < 0.05 };
}

/**
 * Applies the prerequisite-sparse readiness gate and utility-led score.
 * @param terms Readiness, validated utility, and weakness signals.
 * @param readyThreshold Minimum readiness required to remain a candidate.
 * @returns The utility-led score, or null when the readiness gate is unmet.
 */
export function computeUtilityLedScore(
  terms: UtilityLedTerms,
  readyThreshold: number,
): number | null {
  if (terms.readiness < readyThreshold) return null;
  return 0.7 * clamp01(terms.utility) + 0.3 * clamp01(terms.weaknessFit);
}

/**
 * Projects daily review debt and classifies the planner load state.
 * @param input Seven-day due count and session budget configuration.
 * @returns Projected load, budget, state, and new-skill allowance.
 */
export function projectReviewLoad(input: ReviewLoadInput): ReviewLoadProjection {
  const factor = input.loadBudgetFactor ?? 0.8;
  const projectedDailyLoad = input.cardsDueWithinSevenDays / 7;
  const budget = input.maxReviewsPerDay * factor;
  const saturated = projectedDailyLoad > budget;
  const elevated = projectedDailyLoad >= budget * 0.6;
  return {
    projectedDailyLoad,
    budget,
    reviewLoadState: saturated ? 'saturated' : elevated ? 'elevated' : 'normal',
    allowNewSkills: !saturated,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
