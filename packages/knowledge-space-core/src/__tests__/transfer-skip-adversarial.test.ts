// Adversarial tests — Transfer Skip & Confirmation Check
// Track: transfer-credit-runtime_20260605
//
// Covers AD cases from test-strategy.md §2 (Phase 3 surface).
//
// Coverage map:
//   AD8  Reversibility idempotence  .... covered in transfer-skip.test.ts
//                                       ('is idempotent: revert(revert(record)) equals revert(record)');
//                                       THIS file adds triple-idempotence and a structured
//                                       deep-equal assertion.
//   AD10 buildConfirmationCheck  ....... covered in transfer-skip.test.ts
//                                       ('returns a deterministic sample for the same inputs');
//                                       THIS file adds a stability sweep with multiple
//                                       skill-id + problem combinations.
//   AD11 strictObject rejects extras ... covered in transfer-skip.test.ts
//   AD12 TRANSFER_SKIP_POLICY_DEFAULT frozen — covered in transfer-skip.test.ts;
//                                       THIS file confirms the schema's superRefine check
//                                       across all rejection paths.

import { describe, it, expect } from 'vitest';
import {
  applyTransferSkip,
  revertTransferSkip,
  buildConfirmationCheck,
  shouldRequireConfirmationCheck,
  grantSkipAfterCheck,
  TRANSFER_SKIP_POLICY_DEFAULT,
  transferSkipPolicySchema,
} from '../transfer-skip.js';
import type {
  TransferSkipPolicy,
  TransferSkipRecord,
  ConfirmationCheckResult,
} from '../transfer-skip.js';

// ---------------------------------------------------------------------------
// AD8 — Triple idempotence + structured deep-equal
// ---------------------------------------------------------------------------

describe('AD8 — revertTransferSkip is idempotent across N applications', () => {
  it('revert(revert(revert(r))) deep-equals revert(r)', () => {
    // AD8 says `revert(revert(r)) == revert(r)`. The defense here lifts that
    // to N applications: applying revert any number of times after the
    // first yields the same record.
    const skipped = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
      1_000_000,
    );
    const once = revertTransferSkip(skipped, 2_000_000);
    const twice = revertTransferSkip(once);
    const triple = revertTransferSkip(twice);

    expect(twice).toEqual(once);
    expect(triple).toEqual(once);
    // Explicit field-level verification (defense against an idempotent
    // comparison that missed a field drift).
    expect(triple.skillId).toBe(once.skillId);
    expect(triple.sourceCourse).toBe(once.sourceCourse);
    expect(triple.seededMastery).toBe(once.seededMastery);
    expect(triple.skippedAt).toBe(once.skippedAt);
    expect(triple.revertedAt).toBe(once.revertedAt);
    expect(triple.reversible).toBe(once.reversible);
    expect(triple.state).toBe(once.state);
  });

  it('revert preserves the EXISTING revertedAt when no explicit timestamp is passed', () => {
    // The first revert sets revertedAt = 2_000_000. The second revert
    // without an explicit timestamp must preserve that exact value
    // (it does NOT advance to Date.now()).
    const skipped = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
      1_000_000,
    );
    const once = revertTransferSkip(skipped, 2_000_000);
    const twice = revertTransferSkip(once); // no explicit revertedAt

    expect(twice.revertedAt).toBe(2_000_000);
  });
});

// ---------------------------------------------------------------------------
// AD10 — buildConfirmationCheck determinism across skill/policy combinations
// ---------------------------------------------------------------------------

describe('AD10 — buildConfirmationCheck is deterministic across many inputs', () => {
  const skillIds = [
    'math.im3.skill.solve-quadratic',
    'math.im3.skill.factored-form',
    'math.im3.skill.vertex-form',
    'math.im3.skill.linear-functions',
  ];
  const problems = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

  it('returns the same sample for the same (skillId, problems, policy) on 50 calls', () => {
    const policy: TransferSkipPolicy = {
      ...TRANSFER_SKIP_POLICY_DEFAULT,
      minCheckProblems: 3,
      maxCheckProblems: 5,
    };
    const baseline = buildConfirmationCheck(skillIds[0], problems, policy);
    for (let i = 0; i < 50; i += 1) {
      const next = buildConfirmationCheck(skillIds[0], problems, policy);
      expect(next).toEqual(baseline);
      expect(next.problems).toEqual(baseline.problems);
    }
  });

  it('different skillIds can yield different samples (the hash is skill-dependent)', () => {
    // This is the structural defense: if the sample were derived only
    // from `problems`, then two different skillIds fed the same problems
    // would have identical outputs. That would be a degenerate deterministic
    // sampler. Verify different skillIds do NOT collapse to the same sample.
    const policy: TransferSkipPolicy = {
      ...TRANSFER_SKIP_POLICY_DEFAULT,
      minCheckProblems: 3,
      maxCheckProblems: 3,
    };
    // We don't require strict pairwise inequality (could happen to match
    // by hash collision), but for these four diverse skill ids the
    // sampler must produce at least one divergent result across the
    // pairwise combinations — i.e. the sampler is skill-dependent.
    const allFour = skillIds.map((id) =>
      buildConfirmationCheck(id, problems, policy).problems.join(','),
    );
    const distinct = new Set(allFour).size;
    expect(distinct).toBeGreaterThan(1);
  });

  it('does not mutate the caller-provided problems array across many calls', () => {
    const policy: TransferSkipPolicy = {
      ...TRANSFER_SKIP_POLICY_DEFAULT,
      minCheckProblems: 2,
      maxCheckProblems: 3,
    };
    const problemsLocal = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const snapshot = JSON.stringify(problemsLocal);
    for (let i = 0; i < 20; i += 1) {
      buildConfirmationCheck(skillIds[i % skillIds.length], problemsLocal, policy);
    }
    expect(JSON.stringify(problemsLocal)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// AD11 — Schema rejects every known invalid input shape
// ---------------------------------------------------------------------------

describe('AD11 — transferSkipPolicySchema rejects every invalid input', () => {
  it('rejects extra keys (strictObject)', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0.85,
        minCheckProblems: 2,
        maxCheckProblems: 4,
        sneaky: 'extra',
      }),
    ).toThrow();
  });

  it('rejects confirmationThreshold at 0 (must be > 0)', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0,
        minCheckProblems: 2,
        maxCheckProblems: 4,
      }),
    ).toThrow();
  });

  it('rejects confirmationThreshold above 1', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 1.5,
        minCheckProblems: 2,
        maxCheckProblems: 4,
      }),
    ).toThrow();
  });

  it('rejects minCheckProblems: 0', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0.85,
        minCheckProblems: 0,
        maxCheckProblems: 4,
      }),
    ).toThrow();
  });

  it('rejects maxCheckProblems: 0', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0.85,
        minCheckProblems: 2,
        maxCheckProblems: 0,
      }),
    ).toThrow();
  });

  it('rejects min > max (superRefine guard)', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0.85,
        minCheckProblems: 5,
        maxCheckProblems: 2,
      }),
    ).toThrow();
  });

  it('accepts min === max (boundary)', () => {
    // Same value for min and max is degenerate but valid.
    const parsed = transferSkipPolicySchema.parse({
      confirmationThreshold: 0.85,
      minCheckProblems: 3,
      maxCheckProblems: 3,
    });
    expect(parsed.minCheckProblems).toBe(3);
    expect(parsed.maxCheckProblems).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// FR5 — Pure output for grantSkipAfterCheck (defense for AD13)
// ---------------------------------------------------------------------------

describe('grantSkipAfterCheck — pure output, no undefined fields', () => {
  it('granted=false branch returns a defined reason string', () => {
    const result: ConfirmationCheckResult = {
      skillId: 'math.im3.skill.solve-quadratic',
      passed: false,
      confidence: 'low',
    };
    const outcome = grantSkipAfterCheck(result);
    if (outcome.granted) {
      throw new Error('expected not-granted outcome');
    }
    expect(outcome.reason).toBe('confirmation-check-failed');
    // No undefined fields in the failure payload.
    expect(outcome).toEqual({ granted: false, reason: 'confirmation-check-failed' });
  });
});

// ---------------------------------------------------------------------------
// shouldRequireConfirmationCheck — boundary cases (defense for FR5)
// ---------------------------------------------------------------------------

describe('shouldRequireConfirmationCheck — boundary cases', () => {
  it('returns true at componentMastery = threshold - 1e-9', () => {
    const policy: TransferSkipPolicy = {
      ...TRANSFER_SKIP_POLICY_DEFAULT,
      confirmationThreshold: 0.85,
    };
    expect(shouldRequireConfirmationCheck(policy, 0.85 - 1e-9)).toBe(true);
  });

  it('returns false at componentMastery = threshold exactly (inclusive boundary)', () => {
    const policy: TransferSkipPolicy = {
      ...TRANSFER_SKIP_POLICY_DEFAULT,
      confirmationThreshold: 0.85,
    };
    expect(shouldRequireConfirmationCheck(policy, 0.85)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyTransferSkip — record state invariants
// ---------------------------------------------------------------------------

describe('applyTransferSkip — record shape invariants', () => {
  it('reversible is always true (every skip is reversible)', () => {
    const record = applyTransferSkip(
      'math.im3.skill.foo',
      'math.im2',
      0.5,
      1_000_000,
    );
    const _exhaustive: TransferSkipRecord = record;
    void _exhaustive;
    expect(record.reversible).toBe(true);
  });

  it('skippedAt defaults to a numeric value within the call window', () => {
    const before = Date.now();
    const record = applyTransferSkip('math.im3.skill.foo', 'math.im2', 0.5);
    const after = Date.now();
    expect(typeof record.skippedAt).toBe('number');
    expect(record.skippedAt).toBeGreaterThanOrEqual(before);
    expect(record.skippedAt).toBeLessThanOrEqual(after);
  });
});
