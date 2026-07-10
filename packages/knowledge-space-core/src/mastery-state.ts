// Mastery state — Phase 1 contract types & schemas (kst-srs.v2 §3).
//
// This module owns the named, configurable thresholds (FR2) and the four-way
// state union plus the per-node KnowledgeStateEntry. It is intentionally
// domain-neutral — no app, convex, or curriculum imports allowed (boundary
// rule, see measure/knowledge-space.md Implementation Rule 6).

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/**
 * Configurable mastery thresholds (kst-srs.v2 §3.4).
 *
 * Defaults are exported as a frozen, readonly constant — see
 * `MASTERY_THRESHOLDS_DEFAULT` — so callers can derive `Partial<MasteryThresholds>`
 * overrides without mutating the global default.
 */
export interface MasteryThresholds {
  /** Minimum retention to enter the `mastered` state (default 0.90). */
  masteryEnter: number;
  /** Retention below which a previously-mastered skill falls to `decaying` (default 0.70). */
  masteryExit: number;
  /** Composite readiness at or above which a node is `ready` (default 0.80). */
  readyThreshold: number;
  /** Composite readiness at or above which a node is `nearly_ready` (default 0.50). */
  nearThreshold: number;
}

/**
 * Default mastery thresholds — frozen to defend against runtime drift
 * (anti-pattern A4: no parallel threshold literals).
 */
export const MASTERY_THRESHOLDS_DEFAULT: MasteryThresholds = Object.freeze({
  masteryEnter: 0.9,
  masteryExit: 0.7,
  readyThreshold: 0.8,
  nearThreshold: 0.5,
});

/**
 * Zod schema for `MasteryThresholds`. Uses `strictObject` so accidental extra
 * keys are rejected at parse time (defends A7 — silent extra-key drift).
 */
export const masteryThresholdsSchema = z.strictObject({
  masteryEnter: z.number().min(0).max(1),
  masteryExit: z.number().min(0).max(1),
  readyThreshold: z.number().min(0).max(1),
  nearThreshold: z.number().min(0).max(1),
});

// ---------------------------------------------------------------------------
// Four-way state union (kst-srs.v2 §3.2)
// ---------------------------------------------------------------------------

/**
 * Four-way mastery state per skill node.
 *
 * - `mastered` — `isProficient && retention ≥ masteryEnter`
 * - `decaying` — previously mastered, retention < masteryExit
 * - `inProgress` — has evidence but not proficient
 * - `untouched` — no evidence
 */
export type MasteryState = 'mastered' | 'decaying' | 'inProgress' | 'untouched';

const masteryStateValues = ['mastered', 'decaying', 'inProgress', 'untouched'] as const;

// ---------------------------------------------------------------------------
// Three-way readiness state (kst-srs.v2 §5.2)
// ---------------------------------------------------------------------------

/**
 * Three-way readiness state per skill node, derived from weighted
 * prerequisite readiness against `MasteryThresholds` (kst-srs.v2 §5.2).
 *
 * - `ready`      — `readiness ≥ readyThreshold` (default 0.80)
 * - `nearly_ready` — `readiness ≥ nearThreshold` (default 0.50)
 * - `blocked`    — otherwise
 */
export type ReadinessState = 'ready' | 'nearly_ready' | 'blocked';

const readinessStateValues = ['ready', 'nearly_ready', 'blocked'] as const;

// ---------------------------------------------------------------------------
// KnowledgeStateEntry (per-node entry in the v2 state map, kst-srs.v2 §3.5)
// ---------------------------------------------------------------------------

/**
 * Evidence reference attached to a KnowledgeStateEntry (kst-srs.v2 §3.5).
 *
 * The shape is intentionally minimal in Phase 1; richer evidence fields are
 * added by the engine (Phase 2) and the SRS→KST bridge (Phase 3).
 */
export interface KnowledgeStateEvidence {
  /** Source identifier (objective id, card id, or external probe id). */
  sourceId: string;
  /** Optional observation timestamp (epoch ms). */
  observedAt?: number;
}

/**
 * Per-node entry in the v2 knowledge state map. Distinct from
 * `KnowledgeState` (the flat-list projection type consumed by
 * `projectDisplayLevel`) — see test-strategy §0.2.
 */
export interface KnowledgeStateEntry {
  nodeId: string;
  /** Per-skill mastery in [0, 1] (kst-srs.v2 §3.1). */
  mastery: number;
  /** Per-skill retention in [0, 1] (kst-srs.v2 §3.3). */
  retention: number;
  /** Whether proficiency evidence meets the configured threshold. */
  isProficient: boolean;
  /** Current four-way state (kst-srs.v2 §3.2). */
  state: MasteryState;
  /** Optional evidence references (kst-srs.v2 §3.5). */
  evidence?: KnowledgeStateEvidence[];
  /** Optional last-update timestamp (epoch ms). */
  lastUpdated?: number;
  /** Optional weighted readiness score in [0, 1] (kst-srs.v2 §5.1). */
  readinessScore?: number;
  /** Optional three-way readiness state (kst-srs.v2 §5.2). */
  readinessState?: ReadinessState;
}

/**
 * Zod schema for `KnowledgeStateEntry`. Rejects invalid mastery/retention
 * ranges, unknown state strings, and missing nodeId (positive + negative
 * assertions per anti-pattern A4).
 */
export const knowledgeStateEntrySchema = z.object({
  nodeId: z.string().min(1),
  mastery: z.number().min(0).max(1),
  retention: z.number().min(0).max(1),
  isProficient: z.boolean(),
  state: z.enum(masteryStateValues),
  evidence: z.array(z.object({
    sourceId: z.string().min(1),
    observedAt: z.number().optional(),
  })).optional(),
  lastUpdated: z.number().optional(),
  readinessScore: z.number().min(0).max(1).optional(),
  readinessState: z.enum(readinessStateValues).optional(),
});