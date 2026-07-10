// Misconception remediation loop — severity, lifecycle, and per-student state.
//
// kst-srs.v2 §9.1 + spec.md FR2/FR3: severity determines rating-cap behavior;
// lifecycle status tracks active/resolved transitions; per-student state
// persists the full misconception lifecycle record. The transition function
// `runRealT6Loop` (kst-srs.v2 §9.3) is the pure state machine that turns a
// practice submission + prior per-student state into the new state, the
// detected / active / resolved bucket splits, and a refreshed state record.

import type { PracticeSubmissionEnvelope } from '@reading-advantage/practice-core/contract';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. MisconceptionSeverity — closed-set enum
// ---------------------------------------------------------------------------

export const misconceptionSeveritySchema = z.enum(['minor', 'severe']);

export type MisconceptionSeverity = z.infer<typeof misconceptionSeveritySchema>;

// ---------------------------------------------------------------------------
// 2. MisconceptionLifecycleStatus — closed-set enum
// ---------------------------------------------------------------------------

export const misconceptionLifecycleStatusSchema = z.enum(['active', 'resolved']);

export type MisconceptionLifecycleStatus = z.infer<typeof misconceptionLifecycleStatusSchema>;

// ---------------------------------------------------------------------------
// 3. StudentMisconceptionState — domain-neutral state record
// ---------------------------------------------------------------------------

export const studentMisconceptionStateSchema = z.object({
  studentId: z.string().min(1),
  misconceptionId: z.string().min(1),
  status: misconceptionLifecycleStatusSchema,
  severity: misconceptionSeveritySchema,
  cleanStreak: z.number().int().min(0),
  firstDetectedAt: z.number(),
  lastUpdatedAt: z.number(),
  affectedSkills: z.array(z.string().min(1)).min(1),
});

export type StudentMisconceptionState = z.infer<typeof studentMisconceptionStateSchema>;

// ---------------------------------------------------------------------------
// 4. getMisconceptionSeverity — canonical accessor
// ---------------------------------------------------------------------------

/**
 * Canonical severity accessor for a misconception node's metadata.
 *
 * Takes `metadata: Record<string, unknown>` (not a full KnowledgeSpaceNode)
 * so it stays a pure function with no cross-package dependency. Returns
 * 'minor' when metadata.severity is absent, undefined, or not a valid
 * MisconceptionSeverity value — this invariant is critical for Phase 2's
 * computeBaseRating truth table.
 */
export function getMisconceptionSeverity(
  metadata: Record<string, unknown>,
): MisconceptionSeverity {
  const result = misconceptionSeveritySchema.safeParse(metadata.severity);
  return result.success ? result.data : 'minor';
}

// ---------------------------------------------------------------------------
// 5. runRealT6Loop — pure active→resolved transition function
// ---------------------------------------------------------------------------
//
// Domain-neutral per-student misconception lifecycle machine. Given a
// practice submission and a prior per-student state, it computes:
//
//   1. **Detection** — collect every misconception tag emitted by any
//      part of the submission, deduped, in the order of first appearance.
//   2. **Active transition** — any detected slug is added to the active
//      set (a wrong-answer pattern refreshes the active flag and resets
//      the clean streak to 0).
//   3. **Resolution** — for every slug currently active that did NOT
//      appear in this submission's detected set, increment the clean
//      streak. When the streak meets the resolution threshold, the slug
//      transitions from `active` to `resolved` and the streak resets.
//   4. **Stale state tolerance** — `cleanStreaks` entries for slugs no
//      longer in the active set are ignored (the caller is responsible
//      for evicting them across calls).
//
// Pure: no I/O, no mutation of the input. Returns a fresh output record.
// Domain-neutral: no IM3 imports; the Convex persistence layer wraps
// this function for IM3's `student_misconception_state` table.

/**
 * Domain-neutral per-student misconception lifecycle state.
 * The `active` list preserves insertion order; `cleanStreaks` is keyed by
 * the misconception slug.
 */
export interface StudentMisconceptionLoopState {
  readonly active: readonly string[];
  readonly cleanStreaks: Readonly<Record<string, number>>;
}

/** Input to the transition function. */
export interface RunRealT6LoopInput {
  readonly submission: PracticeSubmissionEnvelope;
  readonly state: StudentMisconceptionLoopState;
  readonly resolutionThreshold: number;
}

/** Output from the transition function. */
export interface RunRealT6LoopOutput {
  readonly detected: readonly string[];
  readonly active: readonly string[];
  readonly resolved: readonly string[];
  readonly updatedState: StudentMisconceptionLoopState;
}

export function runRealT6Loop(
  input: RunRealT6LoopInput,
): RunRealT6LoopOutput {
  const { submission, state, resolutionThreshold } = input;

  if (!Number.isInteger(resolutionThreshold) || resolutionThreshold <= 0) {
    throw new Error(
      `runRealT6Loop: resolutionThreshold must be a positive integer, received ${resolutionThreshold}`,
    );
  }

  const detectedSet = new Set<string>();
  const detected: string[] = [];
  for (const part of submission.parts) {
    for (const tag of part.misconceptionTags ?? []) {
      if (!detectedSet.has(tag)) {
        detectedSet.add(tag);
        detected.push(tag);
      }
    }
  }

  const newActiveOrdered: string[] = [];
  const seen = new Set<string>();
  for (const slug of state.active) {
    if (!seen.has(slug)) {
      seen.add(slug);
      newActiveOrdered.push(slug);
    }
  }
  for (const slug of detected) {
    if (!seen.has(slug)) {
      seen.add(slug);
      newActiveOrdered.push(slug);
    }
  }

  const resolved: string[] = [];
  const finalActive: string[] = [];
  const newCleanStreaks: Record<string, number> = {};

  for (const slug of newActiveOrdered) {
    if (detectedSet.has(slug)) {
      newCleanStreaks[slug] = 0;
      finalActive.push(slug);
      continue;
    }
    const prevStreak = state.cleanStreaks[slug] ?? 0;
    const nextStreak = prevStreak + 1;
    if (nextStreak >= resolutionThreshold) {
      resolved.push(slug);
      newCleanStreaks[slug] = 0;
    } else {
      finalActive.push(slug);
      newCleanStreaks[slug] = nextStreak;
    }
  }

  return {
    detected,
    active: finalActive,
    resolved,
    updatedState: {
      active: finalActive,
      cleanStreaks: newCleanStreaks,
    },
  };
}
