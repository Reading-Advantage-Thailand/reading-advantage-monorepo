// Weighted readiness — Phase 2 implementation (kst-srs.v2 §5).
//
// Pure, deterministic computation of prerequisite-weighted readiness.
// Domain-neutral: no app, convex, or curriculum imports.

import type { KnowledgeSpace } from "./types.js";
import type {
  KnowledgeStateEntry,
  MasteryThresholds,
  ReadinessState,
} from "./mastery-state.js";
import { MASTERY_THRESHOLDS_DEFAULT } from "./mastery-state.js";

/**
 * Result of a weighted readiness computation.
 */
export interface ReadinessResult {
  /** Weighted readiness score in [0, 1] (kst-srs.v2 §5.1). */
  score: number;
  /** Three-way readiness state (kst-srs.v2 §5.2). */
  state: ReadinessState;
}

/**
 * Compute the weighted readiness score for a node given the current knowledge
 * state and the prerequisite structure.
 *
 * Formula (kst-srs.v3 §2.5):
 *   readiness(B) = min(hard prerequisite mastery) × weighted soft mastery
 *
 * Where wᵢ is edge weight and mᵢ is the student mastery level of prerequisite i.
 * readiness = 1 if B has no prerequisites or if all edge weights sum to zero.
 *
 * @param nodeId - The target node whose readiness is being computed
 * @param state - Current knowledge state (per-node entries)
 * @param graph - Knowledge space graph with typed edges
 * @param thresholds - Optional per-call override of readiness thresholds
 * @returns ReadinessResult with score and state label
 */
export function computeWeightedReadiness(
  nodeId: string,
  state: Map<string, KnowledgeStateEntry>,
  graph: KnowledgeSpace,
  thresholds?: Partial<MasteryThresholds>,
): ReadinessResult {
  const t: MasteryThresholds = { ...MASTERY_THRESHOLDS_DEFAULT, ...thresholds };

  // Filter prerequisite edges targeting this node
  const prereqEdges = graph.edges.filter(
    (e) => e.type === "prerequisite_for" && e.targetId === nodeId,
  );

  // No prerequisites → full readiness
  if (prereqEdges.length === 0) {
    return { score: 1, state: "ready" };
  }

  const hard = prereqEdges.filter((edge) => edge.weight >= t.hardGateThreshold);
  const soft = prereqEdges.filter((edge) => edge.weight < t.hardGateThreshold);
  const masteryFor = (sourceId: string): number =>
    state.get(sourceId)?.mastery ?? 0;

  const gate =
    hard.length > 0
      ? Math.min(...hard.map((edge) => masteryFor(edge.sourceId)))
      : 1;
  const totalSoftWeight = soft.reduce((sum, edge) => sum + edge.weight, 0);
  const component =
    soft.length === 0 || totalSoftWeight === 0
      ? 1
      : soft.reduce(
          (sum, edge) => sum + edge.weight * masteryFor(edge.sourceId),
          0,
        ) / totalSoftWeight;
  const score = gate * component;

  // Map to readiness state band (kst-srs.v2 §5.2)
  let s: ReadinessState;
  if (score >= t.readyThreshold) {
    s = "ready";
  } else if (score >= t.nearThreshold) {
    s = "nearly_ready";
  } else {
    s = "blocked";
  }

  return { score, state: s };
}

/**
 * Default weighted readiness function conforming to the `ReadinessFn` seam
 * contract (outer-fringe.ts). Wraps `computeWeightedReadiness` into a
 * `(nodeId, state) => number` signature.
 *
 * The graph context is captured via closure — callers must create a bound
 * instance by closing over a `KnowledgeSpace` reference.
 *
 * @param graph - Knowledge space graph to use for prerequisite lookups
 * @returns A `ReadinessFn`-compatible function
 */
export function createDefaultWeightedReadinessFn(
  graph: KnowledgeSpace,
): (nodeId: string, state: Map<string, KnowledgeStateEntry>) => number {
  return (nodeId: string, state: Map<string, KnowledgeStateEntry>): number => {
    return computeWeightedReadiness(nodeId, state, graph).score;
  };
}
