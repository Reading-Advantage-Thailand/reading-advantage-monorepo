// Knowledge state engine — Phase 2 hysteresis implementation (kst-srs.v2 §3).
//
// Implements the hysteresis enter/exit algorithm (§3.3), retention decay
// (§3.3), and the four-way state machine (§3.2). The misconception-lifecycle
// pinning (§3.7) is deferred to later phases.
//
// Domain-neutral boundary: no app, convex, curriculum, or srs-engine imports.

import type { KnowledgeSpace } from './types.js';
import type {
  KnowledgeStateEntry,
  MasteryThresholds,
  MasteryState,
} from './mastery-state.js';
import { MASTERY_THRESHOLDS_DEFAULT } from './mastery-state.js';

/**
 * Minimal student shape consumed by the engine. The structural `{ id: string }`
 * requirement lets callers pass either a domain-specific `StudentId` or a
 * richer student envelope — see kst-srs.v2 §3.5.
 */
export interface KnowledgeStateStudentRef {
  id: string;
}

/**
 * Generic evidence record. Carries per-skill SRS card state, proficiency
 * evidence, and optional pre-computed mastery/retention so the SRS→KST bridge
 * (Phase 3) and the engine itself can coexist on the same contract surface.
 *
 * Phase 2 adds `stability` and `lastReviewedAt` so `stabilityToRetention`
 * can compute retention from the FSRS-style per-card stability.
 */
export type KnowledgeStateEvidence = {
  /** Source identifier (objective id, card id, or external probe id). */
  sourceId: string;
  /** Optional observation timestamp (epoch ms). */
  observedAt?: number;
  /** Optional mastery contribution in [0, 1]. */
  mastery?: number;
  /** Optional pre-computed retention in [0, 1]. */
  retention?: number;
  /** Optional proficiency flag. */
  isProficient?: boolean;
  /** Optional FSRS-style card stability in days. */
  stability?: number;
  /** Optional timestamp of the last review (epoch ms). */
  lastReviewedAt?: number;
};

// ---------------------------------------------------------------------------
// Retention decay (kst-srs.v2 §3.3)
// ---------------------------------------------------------------------------

/**
 * Exponential decay model: `retention = exp(−deltaDays / (stability · scale))`.
 *
 * When `deltaDays = 0` (just reviewed), retention = 1.0. As time passes
 * relative to stability, retention drops toward 0 asymptotically. The
 * optional `scale` parameter (default 1) allows the bridge or calibration
 * to tune the decay speed without touching stability.
 *
 * Pure, deterministic, exported for testing and for the SRS→KST bridge.
 *
 * @param stability - FSRS-style stability in days (> 0)
 * @param deltaDays - Elapsed time in days since last review (≥ 0)
 * @param scale - Tuning factor for decay speed (default 1)
 * @returns retention ∈ [0, 1]
 */
export function stabilityToRetention(
  stability: number,
  deltaDays: number,
  scale: number = 1,
): number {
  if (stability <= 0) return 0;
  const exponent = -deltaDays / (stability * scale);
  const retention = Math.exp(exponent);
  return Math.max(0, Math.min(1, retention));
}

// ---------------------------------------------------------------------------
// State determination helper (hysteresis)
// ---------------------------------------------------------------------------

/**
 * Determine the four-way mastery state given proficiency, retention,
 * previous state, and thresholds.
 *
 * The hysteresis rules (kst-srs.v2 §3.3):
 *   1. `isProficient && retention ≥ masteryEnter` → `mastered`
 *   2. Previously `mastered` + `retention < masteryExit` → `decaying`
 *   3. Previously `decaying` + `retention ≥ masteryEnter` + `isProficient` → `mastered`
 *   4. Previously `decaying` + `retention < masteryExit * 0.5` → `inProgress` (deep decay)
 *   5. No evidence → `untouched`
 *   6. Has evidence but not proficient → `inProgress`
 *
 * The function is pure and exported for testability of the state machine
 * in isolation from the graph/evidence iteration.
 */
export function determineState(
  isProficient: boolean,
  retention: number,
  prevState: MasteryState | undefined,
  thresholds: MasteryThresholds,
): MasteryState {
  // Re-enter / enter mastered on proficiency + high retention
  if (isProficient && retention >= thresholds.masteryEnter) {
    return 'mastered';
  }

  // Not proficient → inProgress if there's any evidence
  if (!isProficient) {
    return 'inProgress';
  }

  // Proficient but retention is below masteryEnter
  if (prevState === 'mastered') {
    if (retention < thresholds.masteryExit) {
      return 'decaying';
    }
    // Between exit and enter: hysteresis keeps us in mastered
    return 'mastered';
  }

  if (prevState === 'decaying') {
    if (retention < thresholds.masteryExit * 0.5) {
      // Deep decay: fall to inProgress
      return 'inProgress';
    }
    // Still decaying
    return 'decaying';
  }

  // No meaningful previous state or previous was inProgress/untouched
  return 'inProgress';
}

// ---------------------------------------------------------------------------
// getKnowledgeState — main entry point
// ---------------------------------------------------------------------------

/**
 * Compute the knowledge state for a student over a knowledge space graph.
 *
 * Pure, deterministic, time-aware. The `now` timestamp is injected by the
 * caller (never `Date.now()`). The optional `previousState` parameter
 * enables hysteresis: the caller passes the result of the previous
 * computation, and the engine uses it to decide whether to downgrade a
 * previously-mastered skill to `decaying` or to allow re-entry to
 * `mastered` on recovery.
 *
 * @param student - Student reference (structural `{ id: string }`)
 * @param evidence - Read-only evidence list with per-skill SRS state
 * @param graph - Knowledge space graph whose nodes define the output keys
 * @param now - Reference timestamp (epoch ms)
 * @param thresholds - Optional per-call override of mastery thresholds
 * @param previousState - Optional previous knowledge state for hysteresis
 * @returns Map<NodeId, KnowledgeStateEntry> — one entry per graph node
 */
export function getKnowledgeState(
  _student: KnowledgeStateStudentRef,
  evidence: readonly KnowledgeStateEvidence[],
  graph: KnowledgeSpace,
  now: number,
  thresholds?: Partial<MasteryThresholds>,
  previousState?: Map<string, KnowledgeStateEntry> | null,
): Map<string, KnowledgeStateEntry> {
  const t: MasteryThresholds = { ...MASTERY_THRESHOLDS_DEFAULT, ...thresholds };

  // Index evidence by sourceId for O(1) lookup per node
  const evidenceByNode = new Map<string, KnowledgeStateEvidence>();
  for (const ev of evidence) {
    evidenceByNode.set(ev.sourceId, ev);
  }

  const result = new Map<string, KnowledgeStateEntry>();

  for (const node of graph.nodes) {
    const ev = evidenceByNode.get(node.id);
    const prev = previousState?.get(node.id);

    if (!ev) {
      // No evidence at all → untouched
      result.set(node.id, {
        nodeId: node.id,
        mastery: 0,
        retention: 0,
        isProficient: false,
        state: 'untouched',
      });
      continue;
    }

    // Compute retention from stability + time delta,
    // or use the pre-computed value if provided
    let retention: number;
    if (ev.retention != null) {
      retention = ev.retention;
    } else if (ev.stability != null && ev.lastReviewedAt != null) {
      const deltaMs = now - ev.lastReviewedAt;
      const deltaDays = Math.max(0, deltaMs / (1000 * 60 * 60 * 24));
      retention = stabilityToRetention(ev.stability, deltaDays);
    } else {
      // No stability info and no pre-computed retention — default to 0
      retention = 0;
    }
    retention = Math.max(0, Math.min(1, retention));

    const isProficient = ev.isProficient ?? false;

    /**
     * Mastery is a monotonic mapping from retention weighted by proficiency.
     *
     * JSDoc per Phase 2 plan: `mastery = retention * (isProficient ? 1.0 : 0.6)`.
     * Track 3 (calibration) may tune this formula; the contract is that mastery
     * is always in [0, 1] and is monotonic in retention.
     */
    const proficiencyFactor = isProficient ? 1.0 : 0.6;
    const mastery = Math.max(0, Math.min(1, retention * proficiencyFactor));

    const state = determineState(isProficient, retention, prev?.state, t);

    result.set(node.id, {
      nodeId: node.id,
      mastery,
      retention,
      isProficient,
      state,
      lastUpdated: now,
    });
  }

  return result;
}
