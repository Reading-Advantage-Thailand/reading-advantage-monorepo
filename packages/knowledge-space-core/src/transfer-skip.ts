// Transfer skip + confirmation check — Phase 3 (FR4, FR5, AC4).
//
// Module surface (all domain-neutral, all pure):
//   - applyTransferSkip(skillId, sourceCourse, seededMastery, skippedAt?)
//       → TransferSkipRecord                       (state: 'skipped')
//   - revertTransferSkip(record, revertedAt?)
//       → TransferSkipRecord                       (state: 'reverted')
//   - buildConfirmationCheck(skillId, problems, policy)
//       → ConfirmationCheck                        (deterministic sample)
//   - shouldRequireConfirmationCheck(policy, componentMastery)
//       → boolean
//   - grantSkipAfterCheck(checkResult)
//       → { granted: true } | { granted: false, reason }
//   - TRANSFER_SKIP_POLICY_DEFAULT (frozen)
//   - transferSkipPolicySchema (z.strictObject — extra-key rejection)
//
// Pure + domain-neutral: reuses `./transfer-credit` / `./transfer-eligibility`
// types indirectly through the caller's seededMastery value. No app, convex,
// curriculum, or srs-engine imports — boundary lint enforces it.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Skip / confirmation-check policy (Phase 3 UX gate).
 *
 *   - `confirmationThreshold` — component mastery (0..1) above which the
 *     student may skip without a confirmation check. Below the threshold, a
 *     short verification is required to guard against stale/over-credited
 *     transfer (FR5).
 *   - `minCheckProblems` / `maxCheckProblems` — bounds for the
 *     `buildConfirmationCheck` sampler. Invariant: `max >= min >= 1`.
 */
export interface TransferSkipPolicy {
  /** Component mastery above which no confirmation check is required. */
  confirmationThreshold: number;
  /** Minimum number of problems in a confirmation check. */
  minCheckProblems: number;
  /** Maximum number of problems in a confirmation check. */
  maxCheckProblems: number;
}

/**
 * State of a single transfer-skip record.
 *
 *   - `skipped`   — skip applied; the student is bypassing the target skill.
 *   - `reverted`  — skip was undone; the student is eligible again.
 */
export type TransferSkipState = 'skipped' | 'reverted';

/**
 * Reversible skip record. Identifies the target skill, the source course the
 * mastery came from, the seeded mastery that was applied, and timestamps.
 *
 * `reversible: true` is a constant — every skip created by `applyTransferSkip`
 * is reversible via `revertTransferSkip`. The state field records whether the
 * record is currently `skipped` or has been `reverted`.
 */
export interface TransferSkipRecord {
  /** Target skill id the skip applies to. */
  skillId: string;
  /** Cross-course source label (e.g. `math.im2`). */
  sourceCourse: string;
  /** Discounted + capped mastery seeded by the FR2 pipeline. */
  seededMastery: number;
  /** Timestamp (epoch ms) the skip was applied. */
  skippedAt: number;
  /** Always `true` — every skip is reversible. */
  reversible: true;
  /** Current state of the record. */
  state: TransferSkipState;
  /** Timestamp (epoch ms) the skip was reverted. Undefined until reverted. */
  revertedAt?: number;
}

/**
 * Result of a short confirmation check. `passed` is the gate; `confidence`
 * is diagnostic and does not block the grant (the check itself is the gate —
 * see `grantSkipAfterCheck`).
 */
export interface ConfirmationCheckResult {
  /** Target skill id the check was administered for. */
  skillId: string;
  /** Whether the student passed the confirmation check. */
  passed: boolean;
  /** Diagnostic confidence of the check result. */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Built confirmation check — a deterministic sample of problems for the
 * student to verify the seeded mastery.
 */
export interface ConfirmationCheck {
  /** Target skill id this check was built for. */
  skillId: string;
  /** Sampled problem ids. Length is bounded by the policy. */
  problems: string[];
}

// ---------------------------------------------------------------------------
// Default policy
// ---------------------------------------------------------------------------

/**
 * Default transfer-skip policy — frozen to defend against runtime drift
 * (AD12). The threshold is conservative; cross-course mastery below
 * 0.85 should generally require a confirmation check before granting the
 * skip (stale/over-credit guard, FR5).
 */
export const TRANSFER_SKIP_POLICY_DEFAULT: TransferSkipPolicy = Object.freeze({
  confirmationThreshold: 0.85,
  minCheckProblems: 2,
  maxCheckProblems: 4,
});

/**
 * Zod schema for `TransferSkipPolicy`. Uses `strictObject` to reject extra
 * keys (AD11), bounds `confirmationThreshold` to `(0, 1]`, and enforces
 * `minCheckProblems <= maxCheckProblems` via a superRefine check.
 */
export const transferSkipPolicySchema = z.strictObject({
  confirmationThreshold: z.number().gt(0).max(1),
  minCheckProblems: z.number().int().min(1),
  maxCheckProblems: z.number().int().min(1),
}).superRefine((value, ctx) => {
  if (value.minCheckProblems > value.maxCheckProblems) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'minCheckProblems must be less than or equal to maxCheckProblems',
      path: ['minCheckProblems'],
    });
  }
});

// ---------------------------------------------------------------------------
// Skip / revert state machine
// ---------------------------------------------------------------------------

/**
 * Apply a transfer skip to a target skill (FR4, AC4).
 *
 * Returns a `TransferSkipRecord` with `state: 'skipped'`. The `skippedAt`
 * timestamp defaults to `Date.now()` when omitted; callers may pass a
 * deterministic timestamp for test fixtures.
 *
 * Pure — does not touch any external store. The caller owns persistence.
 */
export function applyTransferSkip(
  skillId: string,
  sourceCourse: string,
  seededMastery: number,
  skippedAt?: number,
): TransferSkipRecord {
  return {
    skillId,
    sourceCourse,
    seededMastery,
    skippedAt: skippedAt ?? Date.now(),
    reversible: true,
    state: 'skipped',
  };
}

/**
 * Revert a previously-applied skip (FR4 reversibility, AC4).
 *
 * Preserves the identifying fields (`skillId`, `sourceCourse`,
 * `seededMastery`) and sets `state: 'reverted'` with a `revertedAt` timestamp.
 *
 * Idempotent (AD8): `revertTransferSkip(revertTransferSkip(r))` is
 * structurally equal to `revertTransferSkip(r)`. When the input record is
 * already in the `reverted` state, the existing `revertedAt` is preserved
 * so repeated calls return a deeply-equal result. When an explicit
 * `revertedAt` is provided, it overrides the preserved value.
 *
 * Pure — does not mutate the input record (AD13).
 */
export function revertTransferSkip(
  record: TransferSkipRecord,
  revertedAt?: number,
): TransferSkipRecord {
  const resolvedRevertedAt =
    revertedAt ?? record.revertedAt ?? Date.now();
  return {
    skillId: record.skillId,
    sourceCourse: record.sourceCourse,
    seededMastery: record.seededMastery,
    skippedAt: record.skippedAt,
    reversible: true,
    state: 'reverted',
    revertedAt: resolvedRevertedAt,
  };
}

// ---------------------------------------------------------------------------
// Confirmation check (deterministic sampler)
// ---------------------------------------------------------------------------

/**
 * Build a small, deterministic confirmation check for the target skill.
 *
 * The sampler is **stable** for the same `(skillId, problems, policy)`
 * triple — calling it twice yields identical `problems` arrays. This
 * matters because the check is shown to the student; a non-deterministic
 * sample would re-shuffle on every render.
 *
 * The output respects the policy's `minCheckProblems` and `maxCheckProblems`
 * bounds:
 *   - When the input pool is empty, returns an empty `problems` array.
 *   - When the pool is smaller than `minCheckProblems`, returns the entire
 *     pool (no padding, no error — there is nothing more to sample).
 *   - Otherwise returns a deterministic window of size
 *     `min(policy.maxCheckProblems, pool.length)`.
 *
 * Pure — does not mutate the input `problems` array (AD13).
 */
export function buildConfirmationCheck(
  skillId: string,
  problems: readonly string[],
  policy: TransferSkipPolicy,
): ConfirmationCheck {
  if (problems.length === 0) {
    return { skillId, problems: [] };
  }

  // Cap the sample to the policy's max, but also to the available pool.
  const max = Math.min(policy.maxCheckProblems, problems.length);
  // Honor the policy's min when the pool allows it; otherwise the entire pool.
  const desired = Math.max(Math.min(policy.minCheckProblems, max), 1);
  const sampleSize = Math.max(Math.min(desired, problems.length), 1);

  // Deterministic sample: sort by a hash of (skillId, problem) so the same
  // inputs always pick the same subset. We pick the first `sampleSize` entries
  // of the sorted list — that gives a stable window without mutating the
  // caller's array.
  const ranked = [...problems]
    .map((p) => ({ p, key: hashKey(skillId, p) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const sampled = ranked.slice(0, sampleSize).map((entry) => entry.p);

  return { skillId, problems: sampled };
}

/**
 * Deterministic 32-bit-style hash folded to a hex string. Used to order
 * `problems` for a stable `buildConfirmationCheck` sample. Not cryptographic
 * — only needs to be deterministic across calls.
 */
function hashKey(a: string, b: string): string {
  const combined = `${a}::${b}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < combined.length; i += 1) {
    h ^= combined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Unsigned 32-bit hex, padded.
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Confirmation gate
// ---------------------------------------------------------------------------

/**
 * Decide whether a confirmation check is required before granting the skip
 * (FR5).
 *
 *   - `componentMastery < policy.confirmationThreshold`  → `true` (require check)
 *   - `componentMastery >= policy.confirmationThreshold` → `false` (skip freely)
 *
 * The boundary is **inclusive** — at exactly the threshold, the source
 * mastery is high enough to skip without a check. The threshold is the
 * "free-skip" line, not the "no-skip" line.
 */
export function shouldRequireConfirmationCheck(
  policy: TransferSkipPolicy,
  componentMastery: number,
): boolean {
  return componentMastery < policy.confirmationThreshold;
}

/**
 * Process a confirmation-check result into a skip-grant decision.
 *
 * The check **itself** is the gate: a `passed: true` result grants the skip
 * regardless of `confidence`. A `passed: false` result does NOT grant skip
 * and returns a `{ granted: false, reason }` object describing the failure.
 *
 * Pure (AD13 / no input mutation). Deterministic — same input always yields
 * the same output.
 */
export function grantSkipAfterCheck(
  checkResult: ConfirmationCheckResult,
): { granted: true } | { granted: false; reason: string } {
  if (checkResult.passed) {
    return { granted: true };
  }
  return {
    granted: false,
    reason: 'confirmation-check-failed',
  };
}
