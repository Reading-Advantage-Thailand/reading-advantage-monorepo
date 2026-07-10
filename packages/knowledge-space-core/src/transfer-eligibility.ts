// Transfer eligibility — Phase 2 (FR3 / AC3).
//
// Determines whether a target skill is eligible for transfer credit
// (i.e., already mastered in another course) and annotates a practice
// / next-skill path with that eligibility.
//
// Module surface:
//   - isTransferEligible(componentMastery, threshold) → boolean
//   - flagTransferEligible(candidateSkillIds, components, state, config?)
//       → TransferEligibleSkill[]          (deterministic, sorted by skillId)
//   - annotateNextSkillPath(path, eligibility) → AnnotatedPathEntry[]
//   - TRANSFER_ELIGIBILITY_DEFAULT (frozen)
//   - transferEligibilitySchema (z.strictObject — extra-key rejection)
//
// Pure + domain-neutral: reuses `./transfer-credit` (FR1 + FR2 pipeline)
// and `./cross-course-equivalence` types. No app, convex, curriculum,
// or srs-engine imports — boundary lint enforces it.
//
// This module does NOT import the IM3 practice resolver; the next-skill
// path is supplied as an argument. Wiring the resolver into the app seam
// is Phase 3 (app-local).

import { z } from 'zod';
import type { EquivalenceComponent } from './cross-course-equivalence.js';
import type { KnowledgeStateEntry } from './mastery-state.js';
import {
  aggregateComponentMastery,
  computeTransferCredit,
  resolveEquivalenceComponent,
  TRANSFER_POLICY_DEFAULT,
  transferPolicySchema,
} from './transfer-credit.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Eligibility config — threshold above which the source-course mastery
 * counts as transfer-eligible, plus the cross-course component-size guard
 * (`requireMinComponentSize >= 2`).
 *
 * `flagTransferEligible` accepts a `Partial<TransferEligibilityConfig>` and
 * merges it onto the frozen default via `transferEligibilitySchema.parse`.
 */
export interface TransferEligibilityConfig {
  /** Mean source-course mastery required for eligibility (>= semantics). */
  eligibilityThreshold: number;
  /** Minimum component size for eligibility (single-node false-positive guard). */
  requireMinComponentSize: number;
}

/**
 * Per-candidate eligibility record produced by `flagTransferEligible` and
 * consumed by `annotateNextSkillPath`.
 *
 * Ineligible records carry only `skillId`, `eligible: false`, and a `reason`
 * string. Eligible records carry the cross-course source course, the
 * component id, the discounted `seededMastery` (reused from
 * `computeTransferCredit`), and the raw `componentMastery` (source-course-only
 * mean) for diagnostics.
 */
export interface TransferEligibleSkill {
  /** Echo of the requested target skill id. */
  skillId: string;
  /** Whether this skill qualifies for transfer-credit skip. */
  eligible: boolean;
  /** Cross-course source label (e.g. `math.im2`). Set when `eligible === true`. */
  sourceCourse?: string;
  /** Discounted + capped mastery that would be seeded (FR2). */
  seededMastery?: number;
  /** Id of the equivalence component that granted eligibility. */
  componentId?: string;
  /** Mean mastery of contributing source-course (non-target) nodes. */
  componentMastery?: number;
  /**
   * Diagnostic reason string. `transfer-credit` when eligible; one of
   * `no-equivalence-component`, `component-too-small`, `already-mastered`,
   * `no-source-evidence`, `insufficient-mastery`, or `credit-not-applied`
   * when not.
   */
  reason: string;
}

/**
 * One entry on the practice/next-skill path. Carries a `skillId` plus any
 * caller-supplied extras (e.g. `readiness`, `readinessState`, `lessonId`).
 *
 * `annotateNextSkillPath` preserves the extras and adds the eligibility
 * fields (`transferEligible`, `sourceCourse`, `seededMastery`).
 */
export interface NextSkillPathItem {
  skillId: string;
  [key: string]: unknown;
}

/**
 * Output of `annotateNextSkillPath` — `NextSkillPathItem` augmented with
 * the eligibility fields. `transferEligible` is always present; `sourceCourse`
 * and `seededMastery` are present iff the skill was eligible.
 */
export interface AnnotatedPathEntry extends NextSkillPathItem {
  /** Whether this path entry is transfer-eligible. */
  transferEligible: boolean;
  /** Cross-course source label. Present iff `transferEligible === true`. */
  sourceCourse?: string;
  /** Discounted + capped mastery. Present iff `transferEligible === true`. */
  seededMastery?: number;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

/**
 * Default eligibility config — frozen to defend against runtime drift (AD12).
 *
 * - `eligibilityThreshold = 0.75` — must hit ~mastery in the source course.
 * - `requireMinComponentSize = 2` — single-node false-positive guard (AD5).
 */
export const TRANSFER_ELIGIBILITY_DEFAULT: TransferEligibilityConfig = Object.freeze({
  eligibilityThreshold: 0.75,
  requireMinComponentSize: 2,
});

/**
 * Zod schema for `TransferEligibilityConfig`. Uses `strictObject` to reject
 * extra keys at parse time (AD11 defense) and clamps `eligibilityThreshold`
 * to `[0, 1]` so threshold drift into nonsense ranges is caught at parse time.
 */
export const transferEligibilitySchema = z.strictObject({
  eligibilityThreshold: z.number().min(0).max(1),
  requireMinComponentSize: z.number().int().min(2),
});

// ---------------------------------------------------------------------------
// Helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Extract the course-level prefix (first two dot-separated segments) from a
 * node id. Mirrors `courseFromId` in `cross-course-equivalence.ts` and
 * `transfer-credit.ts` so the behavior is identical at the app seam.
 */
function courseFromId(nodeId: string): string {
  return nodeId.split('.').slice(0, 2).join('.');
}

/**
 * Filter out non-contributing nodes — missing from the state map or
 * `untouched`. Mirrors the `hasEvidence` predicate in `transfer-credit.ts`
 * (kept private here to avoid expanding the FR1 surface).
 */
function hasEvidence(entry: KnowledgeStateEntry | undefined): boolean {
  return entry != null && entry.state !== 'untouched';
}

// ---------------------------------------------------------------------------
// Core eligibility predicate
// ---------------------------------------------------------------------------

/**
 * Return `true` iff `componentMastery >= threshold` (inclusive boundary —
 * AD4: a skill at exactly the threshold is eligible). Pure.
 */
export function isTransferEligible(
  componentMastery: number,
  threshold: number,
): boolean {
  return componentMastery >= threshold;
}

// ---------------------------------------------------------------------------
// Per-candidate eligibility
// ---------------------------------------------------------------------------

/**
 * Flag a batch of candidate skill ids with their transfer-eligibility status.
 *
 * Pipeline (per candidate, after sorting):
 *   1. Resolve to equivalence component (`resolveEquivalenceComponent`).
 *   2. Reject components smaller than `requireMinComponentSize` (AD5).
 *   3. Reject already-mastered target skills (no point skipping).
 *   4. Compute mean mastery over **source-course (non-target) contributing
 *      nodes** — eligibility is based on cross-course evidence, not the
 *      target's own (possibly empty) state.
 *   5. Reject when source mastery is below `eligibilityThreshold` (AD4).
 *   6. Reuse `computeTransferCredit` to populate `seededMastery`,
 *      `sourceCourse`, and `componentId` (FR2 pipeline).
 *
 * Output is sorted by `skillId` (localeCompare) for deterministic ordering
 * across calls (test-strategy AD3 defense).
 *
 * Pure: does not mutate `components`, `state`, `config`, or any nested
 * members (AD13).
 */
export function flagTransferEligible(
  candidateSkillIds: readonly string[],
  components: EquivalenceComponent[],
  state: Map<string, KnowledgeStateEntry>,
  config?: Partial<TransferEligibilityConfig>,
): TransferEligibleSkill[] {
  // Merge + parse via the strict schema. The spread creates a new object,
  // so `config` is never mutated (AD13).
  const merged: TransferEligibilityConfig = transferEligibilitySchema.parse({
    ...TRANSFER_ELIGIBILITY_DEFAULT,
    ...(config ?? {}),
  });

  const sortedIds = [...candidateSkillIds].sort((a, b) => a.localeCompare(b));
  const results: TransferEligibleSkill[] = [];
  for (const skillId of sortedIds) {
    results.push(flagOne(skillId, components, state, merged));
  }
  return results;
}

/**
 * Flag a single candidate. Internal — `flagTransferEligible` owns ordering
 * and the config merge.
 */
function flagOne(
  skillId: string,
  components: EquivalenceComponent[],
  state: Map<string, KnowledgeStateEntry>,
  config: TransferEligibilityConfig,
): TransferEligibleSkill {
  // 1. Resolve component.
  const component = resolveEquivalenceComponent(skillId, components);
  if (!component) {
    return { skillId, eligible: false, reason: 'no-equivalence-component' };
  }

  // 2. Size guard (AD5 — single-node false positive).
  if (component.nodeIds.length < config.requireMinComponentSize) {
    return { skillId, eligible: false, reason: 'component-too-small' };
  }

  // 3. Already mastered? Skip is meaningless (the student has it).
  const targetEntry = state.get(skillId);
  if (targetEntry && targetEntry.state === 'mastered') {
    return { skillId, eligible: false, reason: 'already-mastered' };
  }

  // 4. Source-course-only mastery mean. Excludes the target itself and any
  //    same-course non-target node — eligibility is about the **other** course's
  //    evidence, not a diluted average with the target's empty state.
  const targetCourse = courseFromId(skillId);
  let sourceSum = 0;
  let sourceCount = 0;
  for (const nodeId of component.nodeIds) {
    if (nodeId === skillId) continue;
    if (courseFromId(nodeId) === targetCourse) continue;
    const entry = state.get(nodeId);
    if (!hasEvidence(entry)) continue;
    sourceSum += entry!.mastery;
    sourceCount += 1;
  }

  if (sourceCount === 0) {
    return { skillId, eligible: false, reason: 'no-source-evidence' };
  }

  const componentMastery = sourceSum / sourceCount;

  // 5. Threshold gate (AD4 inclusive boundary).
  if (!isTransferEligible(componentMastery, config.eligibilityThreshold)) {
    return { skillId, eligible: false, reason: 'insufficient-mastery' };
  }

  // 6. Reuse FR2 pipeline for the seeded mastery + source-course label.
  //    `computeTransferCredit` uses the **full** component aggregate for the
  //    discount; that's fine because the eligibility gate above already
  //    locked in cross-course sufficiency.
  const credit = computeTransferCredit(skillId, components, state);
  if (!credit.applied) {
    return { skillId, eligible: false, reason: 'credit-not-applied' };
  }

  return {
    skillId,
    eligible: true,
    sourceCourse: credit.sourceCourse,
    componentId: credit.componentId,
    seededMastery: credit.seededMastery,
    componentMastery,
    reason: 'transfer-credit',
  };
}

// ---------------------------------------------------------------------------
// Path annotation
// ---------------------------------------------------------------------------

/**
 * Annotate a practice / next-skill path with transfer-eligibility flags.
 *
 * For each path entry, looks up the matching `TransferEligibleSkill` record
 * (matched by `skillId`) and adds:
 *   - `transferEligible: boolean` — always present
 *   - `sourceCourse?: string`    — present iff the skill was eligible
 *   - `seededMastery?: number`   — present iff the skill was eligible
 *
 * Pure: input `path` and `eligibility` are not mutated (AD13). Unknown path
 * skills are flagged `transferEligible: false` without throwing (AD10).
 * Empty input returns `[]`.
 */
export function annotateNextSkillPath(
  path: readonly NextSkillPathItem[],
  eligibility: readonly TransferEligibleSkill[],
): AnnotatedPathEntry[] {
  // Build the eligibility index once (deterministic, preserves caller order
  // for the lookup — Map iteration is insertion-order, and we never re-read).
  const eligibilityById = new Map<string, TransferEligibleSkill>();
  for (const record of eligibility) {
    eligibilityById.set(record.skillId, record);
  }

  const annotated: AnnotatedPathEntry[] = [];
  for (const item of path) {
    const record = eligibilityById.get(item.skillId);
    const eligible = record?.eligible === true;

    const entry: AnnotatedPathEntry = {
      ...item,
      transferEligible: eligible,
    };

    if (eligible) {
      if (record?.sourceCourse !== undefined) {
        entry.sourceCourse = record.sourceCourse;
      }
      if (record?.seededMastery !== undefined) {
        entry.seededMastery = record.seededMastery;
      }
    }

    annotated.push(entry);
  }

  return annotated;
}

// ---------------------------------------------------------------------------
// Re-exports (for callers that want the FR1/FR2 pipeline nearby)
// ---------------------------------------------------------------------------

export {
  aggregateComponentMastery,
  resolveEquivalenceComponent,
  TRANSFER_POLICY_DEFAULT,
  transferPolicySchema,
};