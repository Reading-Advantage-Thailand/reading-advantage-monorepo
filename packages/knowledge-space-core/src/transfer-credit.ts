// Transfer credit — domain-neutral logic for transferring cross-course
// mastery between equivalent skills (FR1, FR2, AC1, AC2, NFR-2, NFR-3).
//
// Module surface:
//   - resolveEquivalenceComponent(skillId, components) → EquivalenceComponent | undefined
//   - aggregateComponentMastery(component, state)        → ComponentMasteryResult
//   - seedTransferMastery(componentMastery, policy)      → number
//   - revertTransferMastery(seeded)                     → KnowledgeStateEntry
//   - computeTransferCredit(...)                        → TransferCreditResult
//   - batchComputeTransferCredit(...)                   → TransferCreditResult[]
//
// Pure + domain-neutral: only imports types from `./mastery-state` and
// `./cross-course-equivalence`. No app, convex, curriculum, or srs-engine
// imports — boundary lint enforces it.

import { z } from 'zod';
import type { EquivalenceComponent } from './cross-course-equivalence.js';
import type { KnowledgeStateEntry } from './mastery-state.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Per-call transfer-policy overrides. Same shape as `TRANSFER_POLICY_DEFAULT`;
 * `computeTransferCredit` accepts a `Partial<TransferPolicyConfig>` and merges
 * it onto the frozen default.
 */
export interface TransferPolicyConfig {
  /** Multiplier applied to the aggregate component mastery. */
  confidenceDiscount: number;
  /** Hard cap on seeded mastery (must be < 1.0 — credit is never 100%). */
  maxSeededMastery: number;
  /** Minimum component size for credit to apply (single-node false-positive guard). */
  minNodesForTransfer: number;
}

/**
 * Resolved transfer policy — `computeTransferCredit` always works against
 * the merged config: `transferPolicySchema.parse({ ...DEFAULT, ...overrides })`.
 */
export type TransferPolicy = TransferPolicyConfig;

/**
 * Result of resolving + aggregating a single equivalence component.
 */
export interface ComponentMasteryResult {
  /** Id of the source component. */
  componentId: string;
  /** Mean of contributing nodes' mastery, or `0` when no node has evidence. */
  mastery: number;
  /** Mean of contributing nodes' retention, or `0` when no node has evidence. */
  retention: number;
  /** Node ids in the component that have evidence in the state map (sorted). */
  contributingNodeIds: string[];
  /** Sorted, unique course prefixes of the component's nodes. */
  courses: string[];
}

/**
 * Result of computing transfer credit for a single target skill id.
 */
export interface TransferCreditResult {
  /** Echo of the requested target skill id (batch ordering preserved). */
  targetSkillId: string;
  /** `true` iff credit was applied (component found, meets size, has evidence). */
  applied: boolean;
  /** Discounted + capped seeded mastery. `0` when `applied === false`. */
  seededMastery: number;
  /** Course prefix the credit was sourced from (never the target's own course). */
  sourceCourse?: string;
  /** Id of the component that granted the credit. */
  componentId?: string;
}

/**
 * Output of `batchComputeTransferCredit` — array of per-target results in
 * the same order as the input skill ids.
 */
export type BatchTransferCreditResult = TransferCreditResult[];

// ---------------------------------------------------------------------------
// Default policy
// ---------------------------------------------------------------------------

/**
 * Default transfer policy — frozen to defend against runtime drift (AD12).
 *
 * - `confidenceDiscount = 0.8` — 20% confidence penalty on cross-course mastery.
 * - `maxSeededMastery   = 0.8` — hard cap strictly below 1.0 (FR2 / never 100%).
 * - `minNodesForTransfer = 2` — single-node false-positive guard (AD5).
 */
export const TRANSFER_POLICY_DEFAULT: TransferPolicyConfig = Object.freeze({
  confidenceDiscount: 0.8,
  maxSeededMastery: 0.8,
  minNodesForTransfer: 2,
});

/**
 * Zod schema for `TransferPolicyConfig`. Uses `strictObject` to reject extra
 * keys at parse time (AD11 defense), and clamps `maxSeededMastery` to `< 1.0`
 * so transfer credit can never silently inflate to 100% (AD7).
 */
export const transferPolicySchema = z.strictObject({
  confidenceDiscount: z.number().gt(0).max(1),
  maxSeededMastery: z.number().gt(0).lt(1),
  minNodesForTransfer: z.number().int().min(2),
});

// ---------------------------------------------------------------------------
// Helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Extract the course-level prefix (first two dot-separated segments) from a
 * node id. Mirrors `courseFromId` in `cross-course-equivalence.ts` so the
 * behavior is identical at the app seam.
 */
function courseFromId(nodeId: string): string {
  return nodeId.split('.').slice(0, 2).join('.');
}

/**
 * Determine whether a state-map entry has evidence for mastery aggregation.
 * Missing entries and `untouched` entries are treated as 0-evidence: they
 * neither contribute to the mean nor appear in `contributingNodeIds`.
 */
function hasEvidence(entry: KnowledgeStateEntry | undefined): boolean {
  return entry != null && entry.state !== 'untouched';
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a skill id to its equivalence component, if any.
 *
 * Returns `undefined` when the skill is not present in any component, when
 * `components` is empty, or when `components` is `undefined`. Pure — does
 * not mutate `components` or its members (AD13).
 */
export function resolveEquivalenceComponent(
  skillId: string,
  components: EquivalenceComponent[],
): EquivalenceComponent | undefined {
  for (const component of components) {
    if (component.nodeIds.includes(skillId)) {
      return component;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate mastery across all nodes in an equivalence component.
 *
 * Only considers nodes with evidence (present in the state map and not
 * `untouched`) for the mean mastery/retention. 0-evidence nodes are
 * excluded from `contributingNodeIds` and do not zero the aggregate (AD3).
 *
 * Reads exclusively from the supplied `state` map. Never calls
 * `getKnowledgeState` (AD1: batched read / N+1 resistance).
 */
export function aggregateComponentMastery(
  component: EquivalenceComponent,
  state: Map<string, KnowledgeStateEntry>,
): ComponentMasteryResult {
  const contributingNodeIds: string[] = [];
  let masterySum = 0;
  let retentionSum = 0;

  for (const nodeId of component.nodeIds) {
    const entry = state.get(nodeId);
    if (!hasEvidence(entry)) continue;
    contributingNodeIds.push(nodeId);
    masterySum += entry!.mastery;
    retentionSum += entry!.retention;
  }

  const count = contributingNodeIds.length;
  const mastery = count === 0 ? 0 : masterySum / count;
  const retention = count === 0 ? 0 : retentionSum / count;
  const courses = [...new Set(component.nodeIds.map(courseFromId))].sort();

  return {
    componentId: component.componentId,
    mastery,
    retention,
    contributingNodeIds: contributingNodeIds.sort(),
    courses,
  };
}

// ---------------------------------------------------------------------------
// Seed helper
// ---------------------------------------------------------------------------

/**
 * Compute the seeded mastery for a target skill from a discounted, capped
 * aggregate component mastery (FR2).
 *
 * `seededMastery = min(componentMastery * confidenceDiscount, maxSeededMastery)`
 *
 * Invariants (verified by AD6, AD7):
 *   - The cap binds whenever `componentMastery * discount > maxSeededMastery`.
 *   - `seededMastery < 1.0` for every input in `[0, 1]` (never blindly 100%).
 *   - `seededMastery >= 0` for every non-negative input.
 */
export function seedTransferMastery(
  componentMastery: number,
  policy: TransferPolicy,
): number {
  const discounted = componentMastery * policy.confidenceDiscount;
  return Math.min(discounted, policy.maxSeededMastery);
}

// ---------------------------------------------------------------------------
// Revert helper
// ---------------------------------------------------------------------------

/**
 * Revert a seeded transfer-credit state to its pre-seed form (FR4 reversibility).
 *
 * Idempotent (AD8): `revertTransferMastery(revertTransferMastery(e))` returns a
 * structurally identical result to `revertTransferMastery(e)`. The canonical
 * "no-credit" form of the entry is returned so repeated calls produce the
 * same shape.
 *
 * The revert discards the seeded mastery/retention/isProficient and resets the
 * state machine to `inProgress` so the target can be re-seeded by a future
 * `computeTransferCredit` call.
 */
export function revertTransferMastery(
  entry: KnowledgeStateEntry,
): KnowledgeStateEntry {
  return {
    nodeId: entry.nodeId,
    mastery: 0,
    retention: 0,
    isProficient: false,
    state: 'inProgress',
  };
}

// ---------------------------------------------------------------------------
// Core credit computation
// ---------------------------------------------------------------------------

/**
 * Compute the transfer credit for a target skill (FR1 + FR2).
 *
 * Pipeline:
 *   1. Resolve the skill to its equivalence component (`resolveEquivalenceComponent`).
 *   2. Merge `config` onto `TRANSFER_POLICY_DEFAULT` (parsed via `transferPolicySchema`).
 *   3. Reject components smaller than `minNodesForTransfer` (AD5).
 *   4. Aggregate component mastery (`aggregateComponentMastery`).
 *   5. Reject components with no contributing (evidenced) nodes.
 *   6. Apply the seed policy (`seedTransferMastery`).
 *   7. Pick the source course from non-target contributing nodes (AD9).
 *
 * Pure: does not mutate `components`, `state`, or `config` (AD13).
 */
export function computeTransferCredit(
  targetSkillId: string,
  components: EquivalenceComponent[],
  state: Map<string, KnowledgeStateEntry>,
  config?: Partial<TransferPolicyConfig>,
): TransferCreditResult {
  const noCredit = (): TransferCreditResult => ({
    targetSkillId,
    applied: false,
    seededMastery: 0,
  });

  const component = resolveEquivalenceComponent(targetSkillId, components);
  if (!component) return noCredit();

  // Merge overrides onto the frozen default. The spread creates a new object,
  // so `config` is never mutated (defense for AD13 / `does not mutate input arguments`).
  const merged: TransferPolicyConfig = transferPolicySchema.parse({
    ...TRANSFER_POLICY_DEFAULT,
    ...(config ?? {}),
  });

  if (component.nodeIds.length < merged.minNodesForTransfer) {
    return noCredit();
  }

  const aggregate = aggregateComponentMastery(component, state);
  if (aggregate.contributingNodeIds.length === 0) {
    return noCredit();
  }

  const seededMastery = seedTransferMastery(aggregate.mastery, merged);

  const targetCourse = courseFromId(targetSkillId);
  const sourceNodeId = pickSourceNodeId(
    aggregate.contributingNodeIds,
    state,
    targetCourse,
  );

  return {
    targetSkillId,
    applied: true,
    seededMastery,
    sourceCourse: courseFromId(sourceNodeId),
    componentId: component.componentId,
  };
}

/**
 * Pick the source-course node id from the contributing nodes, preferring the
 * highest-mastery non-target contributing node. Deterministic via a tie-break
 * on sorted node id.
 *
 * Returns the first contributing node id as a final fallback (should be
 * unreachable in practice since `contributingNodeIds.length > 0`; we only
 * reach this function after that check passes).
 */
function pickSourceNodeId(
  contributingNodeIds: readonly string[],
  state: Map<string, KnowledgeStateEntry>,
  targetCourse: string,
): string {
  const candidates: Array<{ id: string; mastery: number }> = [];
  for (const id of contributingNodeIds) {
    if (courseFromId(id) === targetCourse) continue;
    candidates.push({ id, mastery: state.get(id)?.mastery ?? 0 });
  }

  if (candidates.length > 0) {
    candidates.sort(
      (a, b) => b.mastery - a.mastery || a.id.localeCompare(b.id),
    );
    return candidates[0].id;
  }

  // No non-target contributing node — fall back to the first contributing id
  // by deterministic order. This branch is exercised when (pathologically)
  // every contributing node happens to be in the target course.
  const sorted = [...contributingNodeIds].sort();
  return sorted[0];
}

/**
 * Compute transfer credit for multiple target skills in a single batch (NFR-3).
 *
 * Returns results in the same order as the input skill ids. Empty input → `[]`.
 *
 * Each result is independent — a failure in one target's component does not
 * short-circuit the others.
 */
export function batchComputeTransferCredit(
  targetSkillIds: readonly string[],
  components: EquivalenceComponent[],
  state: Map<string, KnowledgeStateEntry>,
  config?: Partial<TransferPolicyConfig>,
): BatchTransferCreditResult {
  const results: TransferCreditResult[] = [];
  for (const skillId of targetSkillIds) {
    results.push(
      computeTransferCredit(skillId, components, state, config),
    );
  }
  return results;
}
