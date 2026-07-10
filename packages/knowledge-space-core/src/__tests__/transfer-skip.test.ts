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
// Helpers
// ---------------------------------------------------------------------------

function makePolicy(overrides?: Partial<TransferSkipPolicy>): TransferSkipPolicy {
  return {
    ...TRANSFER_SKIP_POLICY_DEFAULT,
    ...overrides,
  } as TransferSkipPolicy;
}

// ---------------------------------------------------------------------------
// Default policy
// ---------------------------------------------------------------------------

describe('TRANSFER_SKIP_POLICY_DEFAULT', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(TRANSFER_SKIP_POLICY_DEFAULT)).toBe(true);
  });

  it('throws on mutation attempt', () => {
    expect(() => {
      (TRANSFER_SKIP_POLICY_DEFAULT as unknown as Record<string, unknown>).confirmationThreshold = 0.99;
    }).toThrow();
  });

  it('has expected keys with values in valid ranges', () => {
    expect(TRANSFER_SKIP_POLICY_DEFAULT.confirmationThreshold).toBeGreaterThan(0);
    expect(TRANSFER_SKIP_POLICY_DEFAULT.confirmationThreshold).toBeLessThanOrEqual(1);
    expect(TRANSFER_SKIP_POLICY_DEFAULT.minCheckProblems).toBeGreaterThanOrEqual(1);
    expect(TRANSFER_SKIP_POLICY_DEFAULT.maxCheckProblems).toBeGreaterThanOrEqual(
      TRANSFER_SKIP_POLICY_DEFAULT.minCheckProblems,
    );
  });
});

// ---------------------------------------------------------------------------
// Policy schema
// ---------------------------------------------------------------------------

describe('transferSkipPolicySchema', () => {
  it('accepts a valid full policy', () => {
    const parsed = transferSkipPolicySchema.parse({
      confirmationThreshold: 0.85,
      minCheckProblems: 2,
      maxCheckProblems: 4,
    });
    expect(parsed.confirmationThreshold).toBe(0.85);
  });

  it('rejects extra keys', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0.85,
        minCheckProblems: 2,
        maxCheckProblems: 4,
        bogus: 1,
      }),
    ).toThrow();
  });

  it('rejects minCheckProblems greater than maxCheckProblems', () => {
    expect(() =>
      transferSkipPolicySchema.parse({
        confirmationThreshold: 0.85,
        minCheckProblems: 5,
        maxCheckProblems: 2,
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyTransferSkip
// ---------------------------------------------------------------------------

describe('applyTransferSkip', () => {
  it('returns a reversible skip record with required fields', () => {
    const now = Date.now();
    const record = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
      now,
    );
    expect(record.skillId).toBe('math.im3.skill.solve-quadratic');
    expect(record.sourceCourse).toBe('math.im2');
    expect(record.seededMastery).toBe(0.72);
    expect(record.skippedAt).toBe(now);
    expect(record.reversible).toBe(true);
    expect(record.state).toBe('skipped');
  });

  it('defaults skippedAt to Date.now() when omitted', () => {
    const before = Date.now();
    const record = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
    );
    const after = Date.now();
    expect(record.skippedAt).toBeGreaterThanOrEqual(before);
    expect(record.skippedAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// revertTransferSkip
// ---------------------------------------------------------------------------

describe('revertTransferSkip', () => {
  it('returns a reverted record preserving identifying fields', () => {
    const skipped = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
      1_000_000,
    );
    const reverted = revertTransferSkip(skipped, 2_000_000);
    expect(reverted.skillId).toBe(skipped.skillId);
    expect(reverted.sourceCourse).toBe(skipped.sourceCourse);
    expect(reverted.seededMastery).toBe(skipped.seededMastery);
    expect(reverted.reversible).toBe(true);
    expect(reverted.state).toBe('reverted');
    expect(reverted.revertedAt).toBe(2_000_000);
  });

  it('is idempotent: revert(revert(record)) equals revert(record)', () => {
    const skipped = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
      1_000_000,
    );
    const once = revertTransferSkip(skipped);
    const twice = revertTransferSkip(once);
    expect(twice).toEqual(once);
  });
});

// ---------------------------------------------------------------------------
// Skip state machine
// ---------------------------------------------------------------------------

describe('skip state machine', () => {
  it('transitions not-skipped -> skipped -> reverted', () => {
    const skillId = 'math.im3.skill.solve-quadratic';
    const sourceCourse = 'math.im2';
    const seededMastery = 0.72;

    const skipped = applyTransferSkip(skillId, sourceCourse, seededMastery, 1_000_000);
    expect(skipped.state).toBe('skipped');

    const reverted = revertTransferSkip(skipped, 2_000_000);
    expect(reverted.state).toBe('reverted');
  });

  it('re-applying skip after revert returns a fresh skipped record', () => {
    const skillId = 'math.im3.skill.solve-quadratic';
    const sourceCourse = 'math.im2';
    const seededMastery = 0.72;

    const skipped = applyTransferSkip(skillId, sourceCourse, seededMastery, 1_000_000);
    const reverted = revertTransferSkip(skipped, 2_000_000);
    const reSkipped = applyTransferSkip(
      reverted.skillId,
      reverted.sourceCourse,
      reverted.seededMastery,
      3_000_000,
    );
    expect(reSkipped.state).toBe('skipped');
    expect(reSkipped.skippedAt).toBe(3_000_000);
  });

  it('does not mutate the input record', () => {
    const skipped = applyTransferSkip(
      'math.im3.skill.solve-quadratic',
      'math.im2',
      0.72,
      1_000_000,
    );
    const snapshot = JSON.stringify(skipped);
    revertTransferSkip(skipped);
    expect(JSON.stringify(skipped)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// buildConfirmationCheck
// ---------------------------------------------------------------------------

describe('buildConfirmationCheck', () => {
  const skillId = 'math.im3.skill.solve-quadratic';
  const problems = ['p1', 'p2', 'p3', 'p4', 'p5'];

  it('returns a deterministic sample for the same inputs', () => {
    const policy = makePolicy({ minCheckProblems: 2, maxCheckProblems: 3 });
    const a = buildConfirmationCheck(skillId, problems, policy);
    const b = buildConfirmationCheck(skillId, problems, policy);
    expect(a.problems).toEqual(b.problems);
  });

  it('returns only problems from the available pool', () => {
    const policy = makePolicy({ minCheckProblems: 2, maxCheckProblems: 3 });
    const check = buildConfirmationCheck(skillId, problems, policy);
    for (const problem of check.problems) {
      expect(problems).toContain(problem);
    }
  });

  it('respects the maxCheckProblems bound', () => {
    const policy = makePolicy({ minCheckProblems: 2, maxCheckProblems: 3 });
    const check = buildConfirmationCheck(skillId, problems, policy);
    expect(check.problems.length).toBeLessThanOrEqual(policy.maxCheckProblems);
    expect(check.problems.length).toBeGreaterThanOrEqual(policy.minCheckProblems);
  });

  it('returns all problems when the pool is smaller than the minimum', () => {
    const policy = makePolicy({ minCheckProblems: 3, maxCheckProblems: 5 });
    const check = buildConfirmationCheck(skillId, ['p1', 'p2'], policy);
    expect(check.problems).toEqual(['p1', 'p2']);
  });

  it('returns an empty problem list when the pool is empty', () => {
    const policy = makePolicy({ minCheckProblems: 2, maxCheckProblems: 3 });
    const check = buildConfirmationCheck(skillId, [], policy);
    expect(check.problems).toEqual([]);
  });

  it('does not mutate the input problems array', () => {
    const policy = makePolicy({ minCheckProblems: 2, maxCheckProblems: 3 });
    const snapshot = JSON.stringify(problems);
    buildConfirmationCheck(skillId, problems, policy);
    expect(JSON.stringify(problems)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// shouldRequireConfirmationCheck
// ---------------------------------------------------------------------------

describe('shouldRequireConfirmationCheck', () => {
  it('returns true when componentMastery is below the confirmation threshold', () => {
    const policy = makePolicy({ confirmationThreshold: 0.85 });
    expect(shouldRequireConfirmationCheck(policy, 0.84)).toBe(true);
  });

  it('returns false when componentMastery is at the confirmation threshold', () => {
    const policy = makePolicy({ confirmationThreshold: 0.85 });
    expect(shouldRequireConfirmationCheck(policy, 0.85)).toBe(false);
  });

  it('returns false when componentMastery is above the confirmation threshold', () => {
    const policy = makePolicy({ confirmationThreshold: 0.85 });
    expect(shouldRequireConfirmationCheck(policy, 0.95)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// grantSkipAfterCheck
// ---------------------------------------------------------------------------

describe('grantSkipAfterCheck', () => {
  it('grants skip when the check passed', () => {
    const result: ConfirmationCheckResult = {
      skillId: 'math.im3.skill.solve-quadratic',
      passed: true,
      confidence: 'medium',
    };
    expect(grantSkipAfterCheck(result)).toEqual({ granted: true });
  });

  it('does not grant skip when the check failed', () => {
    const result: ConfirmationCheckResult = {
      skillId: 'math.im3.skill.solve-quadratic',
      passed: false,
      confidence: 'low',
    };
    const outcome = grantSkipAfterCheck(result);
    expect(outcome.granted).toBe(false);
    if (!outcome.granted) {
      expect(outcome.reason).toBeDefined();
    }
  });

  it('grants skip on a low-confidence pass (the check itself is the gate)', () => {
    const result: ConfirmationCheckResult = {
      skillId: 'math.im3.skill.solve-quadratic',
      passed: true,
      confidence: 'low',
    };
    expect(grantSkipAfterCheck(result)).toEqual({ granted: true });
  });
});

// ---------------------------------------------------------------------------
// Compile-time type assertions
// ---------------------------------------------------------------------------

function _typeChecks() {
  const _policy: TransferSkipPolicy = TRANSFER_SKIP_POLICY_DEFAULT;
  const _record: TransferSkipRecord | undefined = undefined;
  void _policy;
  void _record;
}
void _typeChecks;
