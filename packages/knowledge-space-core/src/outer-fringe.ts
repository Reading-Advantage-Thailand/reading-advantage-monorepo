// Outer fringe — Phase 2 implementation (kst-srs.v2 §4).
//
// Implements weighted readiness as the default prerequisite gating strategy
// with the readinessFn seam for custom overrides. Standalone exported
// function (FR3 — not buried in the visualization projection).

import type { KnowledgeSpace } from './types.js';
import type { KnowledgeStateEntry, ReadinessState } from './mastery-state.js';
import { MASTERY_THRESHOLDS_DEFAULT } from './mastery-state.js';
import { computeWeightedReadiness } from './weighted-readiness.js';

/**
 * A single outer-fringe entry (kst-srs.v2 §4).
 *
 * - `nodeId` — the fringe candidate.
 * - `readiness` — composite readiness score in [0, 1].
 * - `readinessState` — three-way label derived from `readiness`
 *   against `MasteryThresholds`.
 */
export interface FringeEntry {
  nodeId: string;
  readiness?: number;
  readinessState?: ReadinessState;
}

/**
 * Optional readiness seam. Returns a composite readiness score in [0, 1] for
 * the given node, given the current learner state. Track 2 (Weighted
 * Readiness) plugs a weighted-prerequisite implementation into this seam.
 */
export type ReadinessFn = (
  nodeId: string,
  state: Map<string, KnowledgeStateEntry>,
) => number;

/**
 * Get the outer fringe: nodes that are not yet mastered whose prerequisites
 * are sufficiently satisfied (weighted readiness by default, custom via
 * optional `readinessFn`).
 *
 * **Default behavior (no readinessFn):** Uses `computeWeightedReadiness`.
 * Fringe = ready ∪ nearly_ready (blocked nodes are excluded). Each entry
 * carries its readiness score and state label.
 *
 * **Custom readinessFn:** All non-mastered nodes are included regardless
 * of readiness score. Readiness state is derived from the score against
 * `MasteryThresholds`.
 *
 * Standalone exported function (FR3).
 *
 * @param state - Current knowledge state (per-node entries)
 * @param graph - Knowledge space graph
 * @param readinessFn - Optional custom readiness function (default: weighted readiness)
 * @returns FringeEntry[] — candidate nodes for the planner
 */
export function getOuterFringe(
  state: Map<string, KnowledgeStateEntry>,
  graph: KnowledgeSpace,
  readinessFn?: ReadinessFn,
): FringeEntry[] {
  const thresholds = MASTERY_THRESHOLDS_DEFAULT;

  const result: FringeEntry[] = [];

  for (const node of graph.nodes) {
    const entry = state.get(node.id);

    // Already mastered → exclude from fringe
    if (entry && entry.state === 'mastered') continue;

    if (readinessFn) {
      // Custom readiness function: include ALL non-mastered nodes
      const readinessScore = readinessFn(node.id, state);

      // Coarse label from threshold band
      const readinessState: FringeEntry['readinessState'] =
        readinessScore >= thresholds.readyThreshold
          ? 'ready'
          : readinessScore >= thresholds.nearThreshold
            ? 'nearly_ready'
            : 'blocked';

      result.push({
        nodeId: node.id,
        readiness: readinessScore,
        readinessState,
      });
    } else {
      // Default: weighted readiness. Only include ready ∪ nearly_ready.
      const { score, state: readinessState } =
        computeWeightedReadiness(node.id, state, graph);

      if (readinessState === 'blocked') continue;

      result.push({
        nodeId: node.id,
        readiness: score,
        readinessState,
      });
    }
  }

  return result;
}
