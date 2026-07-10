// SRS → KST bridge — Phase 3 implementation (kst-srs.v2 §5 + §3).
//
// The structural type for `ObjectiveProficiencyResult` is **re-declared
// locally** to keep `knowledge-space-core` dependency-free — see
// test-strategy §1.4 risk #3. A Phase 3 round-trip test guards against drift.
//
// Domain-neutral boundary: no app, convex, curriculum, or srs-engine imports.

import type { KnowledgeSpace } from './types.js';
import type {
  KnowledgeStateEntry,
  MasteryThresholds,
} from './mastery-state.js';
import { MASTERY_THRESHOLDS_DEFAULT } from './mastery-state.js';
import { getKnowledgeState, stabilityToRetention } from './knowledge-state-engine.js';
import type { KnowledgeStateEvidence } from './knowledge-state-engine.js';
import { getOuterFringe } from './outer-fringe.js';
import type { FringeEntry } from './outer-fringe.js';

// Re-export stabilityToRetention for bridge consumers
export { stabilityToRetention };

// ---------------------------------------------------------------------------
// Structural SRS types — re-declared to avoid a runtime dependency on
// packages/srs-engine. Compatible with `ObjectiveProficiencyResult` from
// packages/srs-engine/src/srs/objective-proficiency.ts.
// ---------------------------------------------------------------------------

/**
 * Structural mirror of `ObjectiveProficiencyResult` from
 * `packages/srs-engine/src/srs/objective-proficiency.ts`. Kept narrow on
 * purpose — only the fields the bridge forwards.
 */
export interface ObjectiveProficiencyResult {
  objectiveId: string;
  /** Per-objective retention in [0, 1]. */
  retentionStrength: number;
  /** Per-objective practice coverage in [0, 1]. */
  practiceCoverage: number;
  /** Whether proficiency evidence meets the objective's policy. */
  isProficient: boolean;
}

/**
 * Structural mirror of an SRS card state. The shape matches the minimum
 * the v2 bridge needs; richer card fields are forwarded as opaque metadata.
 */
export interface SrsCardState {
  cardId: string;
  objectiveId: string;
  /** Optional FSRS-style stability in days. */
  stability?: number;
  /** Optional raw review state. */
  state?: 'new' | 'learning' | 'review' | 'relearning';
  /** Optional timestamp of the last review (epoch ms). Used for recency. */
  lastReviewedAt?: number;
}

// ---------------------------------------------------------------------------
// Bridge input/output
// ---------------------------------------------------------------------------

/**
 * Input to the SRS → KST bridge (kst-srs.v2 §5).
 */
export interface SrsBridgeInput {
  /** Per-card SRS state. */
  cards: readonly SrsCardState[];
  /** Per-objective proficiency results (structural mirror of srs-engine output). */
  proficiencyResults: readonly ObjectiveProficiencyResult[];
}

/**
 * Output of the SRS → KST bridge — the learner-state envelope consumed by
 * `getKnowledgeState`. The `evidence` field is the cross-module contract
 * seam.
 */
export interface LearnerStateOutput {
  /**
   * Evidence records consumable by `getKnowledgeState`'s `evidence`
   * parameter. The types are structurally compatible by construction.
   */
  evidence: ReadonlyArray<{
    sourceId: string;
    observedAt?: number;
    mastery?: number;
    retention?: number;
    isProficient?: boolean;
  }>;
  /** Optional reference timestamp emitted by the bridge. */
  generatedAt?: number;
}

// ---------------------------------------------------------------------------
// Bridge interface
// ---------------------------------------------------------------------------

/**
 * The SRS → KST bridge contract (kst-srs.v2 §5).
 */
export interface SrsToKstBridge {
  /**
   * Build a `LearnerStateOutput` from SRS card states and objective
   * proficiency results.
   *
   * @param input - Combined SRS card states + objective proficiency
   * @param now - Reference timestamp (epoch ms) injected by the caller
   */
  buildLearnerState(input: SrsBridgeInput, now: number): LearnerStateOutput;
}

// ---------------------------------------------------------------------------
// Convert arguments
// ---------------------------------------------------------------------------

/**
 * Arguments for the bridge's `convert` method.
 */
export interface ConvertArgs {
  cards: readonly SrsCardState[];
  proficiencies: readonly ObjectiveProficiencyResult[];
  graph: KnowledgeSpace;
  now: number;
  /** Optional previous knowledge state for hysteresis. */
  previousState?: Map<string, KnowledgeStateEntry> | null;
}

// ---------------------------------------------------------------------------
// DefaultSrsToKstBridge — concrete Phase 3 implementation
// ---------------------------------------------------------------------------

/**
 * Default SRS→KST bridge implementation.
 *
 * Converts SRS card states and objective-proficiency results into evidence
 * records for `getKnowledgeState`, then computes the full knowledge state.
 *
 * Pure, deterministic; no I/O, no Convex, no app imports.
 */
export class DefaultSrsToKstBridge implements SrsToKstBridge {
  private readonly thresholds: MasteryThresholds;

  constructor(thresholds?: Partial<MasteryThresholds>) {
    this.thresholds = { ...MASTERY_THRESHOLDS_DEFAULT, ...thresholds };
  }

  /**
   * Build a `LearnerStateOutput` from SRS card states and objective
   * proficiency results. Implements `SrsToKstBridge.buildLearnerState`.
   */
  buildLearnerState(input: SrsBridgeInput, now: number): LearnerStateOutput {
    const evidence = buildEvidence(input.cards, input.proficiencyResults, now);
    return {
      evidence,
      generatedAt: now,
    };
  }

  /**
   * Convert SRS card states + objective-proficiency results → full
   * knowledge state map (one entry per graph node).
   *
   * Internally builds evidence records then delegates to `getKnowledgeState`
   * with the configured thresholds.
   */
  convert(args: ConvertArgs): Map<string, KnowledgeStateEntry> {
    const evidence = buildEvidence(args.cards, args.proficiencies, args.now);
    return getKnowledgeState(
      { id: 'bridge.anonymous' },
      evidence,
      args.graph,
      args.now,
      this.thresholds,
      args.previousState,
    );
  }
}

// ---------------------------------------------------------------------------
// Evidence building — shared between buildLearnerState and convert
// ---------------------------------------------------------------------------

/**
 * Build knowledge-state evidence records from SRS cards and proficiency
 * results.
 *
 * For each unique objective ID found in cards or proficiencies:
 *   - Picks the most recent card (by lastReviewedAt; falls back to highest
 *     stability; positional last-wins as final tiebreaker).
 *   - Picks the last proficiency result (positional last-wins).
 *   - Merges: stability/lastReviewedAt from card; isProficient from
 *     proficiency (if available) else from card state; retention from
 *     proficiency if available (else engine computes from stability).
 *
 * Returns one evidence record per unique objective ID, keyed by objectiveId
 * so the engine maps it to graph nodes.
 */
function buildEvidence(
  cards: readonly SrsCardState[],
  proficiencies: readonly ObjectiveProficiencyResult[],
  now: number,
): KnowledgeStateEvidence[] {
  // Group cards by objectiveId, keeping the best (most recent)
  const bestCardByObjective = new Map<string, SrsCardState>();
  for (const card of cards) {
    const existing = bestCardByObjective.get(card.objectiveId);
    if (!existing) {
      bestCardByObjective.set(card.objectiveId, card);
      continue;
    }
    // Pick the most recent: compare lastReviewedAt, then stability, then positional
    const existingLast = existing.lastReviewedAt ?? -Infinity;
    const cardLast = card.lastReviewedAt ?? -Infinity;
    if (cardLast > existingLast) {
      bestCardByObjective.set(card.objectiveId, card);
    } else if (cardLast === existingLast) {
      const existingStab = existing.stability ?? 0;
      const cardStab = card.stability ?? 0;
      if (cardStab > existingStab) {
        bestCardByObjective.set(card.objectiveId, card);
      }
      // else keep existing (positional first-wins when tie)
    }
  }

  // Proficiency results: positional last-wins per objective
  const lastProficiencyByObjective = new Map<string, ObjectiveProficiencyResult>();
  for (const prof of proficiencies) {
    lastProficiencyByObjective.set(prof.objectiveId, prof);
  }

  // Collect all objective IDs
  const allObjectiveIds = new Set<string>();
  for (const card of cards) allObjectiveIds.add(card.objectiveId);
  for (const prof of proficiencies) allObjectiveIds.add(prof.objectiveId);

  const evidence: KnowledgeStateEvidence[] = [];
  for (const objId of allObjectiveIds) {
    const card = bestCardByObjective.get(objId);
    const prof = lastProficiencyByObjective.get(objId);

    const entry: KnowledgeStateEvidence = {
      sourceId: objId,
    };

    if (card) {
      if (card.stability != null) entry.stability = card.stability;
      if (card.lastReviewedAt != null) entry.lastReviewedAt = card.lastReviewedAt;
    }

    // Card stability takes priority for retention computation.
    // Pre-compute retention from card stability when available.
    let cardRetention: number | undefined;
    if (card?.stability != null && card?.lastReviewedAt != null) {
      const deltaMs = now - card.lastReviewedAt;
      const deltaDays = Math.max(0, deltaMs / (1000 * 60 * 60 * 24));
      cardRetention = stabilityToRetention(card.stability, deltaDays);
    }

    if (cardRetention != null) {
      // Card-based retention is the primary signal
      entry.retention = cardRetention;
    } else if (prof) {
      // Fall back to proficiency retentionStrength
      entry.retention = prof.retentionStrength;
    }

    if (prof) {
      // Proficiency isProficient takes priority
      entry.isProficient = prof.isProficient;
    } else if (card) {
      // Card state drives isProficient when no proficiency result
      entry.isProficient = card.state === 'review';
    }

    evidence.push(entry);
  }

  return evidence;
}

// ---------------------------------------------------------------------------
// buildKstState — convenience export (bridge → engine → fringe)
// ---------------------------------------------------------------------------

/**
 * Convenience function: run the full SRS→KST pipeline.
 *
 *   cards + proficiencies → bridge → getKnowledgeState → getOuterFringe
 *
 * Returns the complete knowledge state map and outer fringe in a single call.
 *
 * @param cards - SRS card states
 * @param proficiencies - Objective proficiency results
 * @param graph - Knowledge space graph
 * @param now - Reference timestamp (epoch ms)
 * @param thresholds - Optional per-call override of mastery thresholds
 * @param previousState - Optional previous knowledge state for hysteresis
 */
export function buildKstState(
  cards: readonly SrsCardState[],
  proficiencies: readonly ObjectiveProficiencyResult[],
  graph: KnowledgeSpace,
  now: number,
  thresholds?: Partial<MasteryThresholds>,
  previousState?: Map<string, KnowledgeStateEntry> | null,
): { state: Map<string, KnowledgeStateEntry>; fringe: FringeEntry[] } {
  const bridge = new DefaultSrsToKstBridge(thresholds);
  const state = bridge.convert({ cards, proficiencies, graph, now, previousState });
  const fringe = getOuterFringe(state, graph);
  return { state, fringe };
}