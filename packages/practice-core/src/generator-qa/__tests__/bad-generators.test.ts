// Phase-2 consolidated negative test: each injected bad generator must
// fail exactly the property it violates, with a readable message.
//
// This file complements the per-property files (determinism, unique-answer,
// distractor-validity, invariants) by asserting the cross-cutting contract:
//   - The bad generator's report has a non-'pass' verdict.
//   - The report contains at least one named failed check.
//   - The named failed check matches the property the generator violates.
//   - The error message is readable (mentions the seed).
//
// Red-phase expectations (all FAIL today except determinism, which
// already has a check):
//   - FR2 non-determinism → report has a failing 'determinism' check.
//   - FR3 wrong answer    → report has a failing 'unique-answer' check.
//   - FR4 duplicate       → report has a failing 'distractor-validity' check.
//   - FR5 degenerate      → report has a failing 'invariants' check.

import { describe, it, expect } from 'vitest';

import { verifyGenerator } from '../verify-generator.js';
import { wellFormedStubOracle } from './fixtures/numericOracle.js';
import {
  createNonDeterministicGenerator,
  createWrongAnswerGenerator,
  createDuplicateDistractorGenerator,
  createDegenerateGenerator,
} from './fixtures/badGenerators.js';
import { DEFAULT_NUM_SEEDS } from './fixtures/seedCorpus.js';

/**
 * Find a failed check with the given name in a verification report.
 * @param {ReturnType<typeof verifyGenerator>} report - Verification report to search
 * @param {string} name - Check name to find
 * @returns {import("../verify-generator.js").VerifyGeneratorCheck | undefined} The failed check, or undefined if not found
 */
function failedCheckNamed(
  report: ReturnType<typeof verifyGenerator>,
  name: string,
) {
  return report.checks.find((c) => c.name === name && !c.passed);
}

/**
 * Assert that a report contains a readable failure for a named check.
 * @param {ReturnType<typeof verifyGenerator>} report - Verification report to inspect
 * @param {string} checkName - Name of the check expected to fail
 * @param {RegExp} messagePattern - Regex the failure message must match
 */
function expectReadableFailure(
  report: ReturnType<typeof verifyGenerator>,
  checkName: string,
  messagePattern: RegExp,
) {
  const failed = failedCheckNamed(report, checkName);
  expect(failed, `expected a failing '${checkName}' check`).toBeDefined();
  expect(failed?.message ?? '').toMatch(messagePattern);
  expect(report.verdict).toBe('fail');
  expect(report.errors.length).toBeGreaterThan(0);
  expect(report.errors.some((e) => e.checkName === checkName)).toBe(true);
}

describe('Injected bad generators — consolidated negative suite', () => {
  it('FR2 — nonDeterministicGen fails the determinism check (readable message, verdict=fail)', () => {
    const bad = createNonDeterministicGenerator();
    const report = verifyGenerator(bad, { numSeeds: DEFAULT_NUM_SEEDS });
    expectReadableFailure(report, 'determinism', /seed/i);
  });

  it('FR3 — wrongAnswerGen fails the unique-answer check when an oracle is supplied', () => {
    const bad = createWrongAnswerGenerator();
    const report = verifyGenerator(bad, {
      numSeeds: DEFAULT_NUM_SEEDS,
      oracle: wellFormedStubOracle,
    });
    expectReadableFailure(report, 'unique-answer', /seed/i);
  });

  it('FR4 — duplicateDistractorGen fails the distractor-validity check', () => {
    const bad = createDuplicateDistractorGenerator();
    const report = verifyGenerator(bad, { numSeeds: DEFAULT_NUM_SEEDS });
    expectReadableFailure(report, 'distractor-validity', /seed|duplicate|distinct|collide/i);
  });

  it('FR5 — degenerateGen fails the invariants check', () => {
    const bad = createDegenerateGenerator();
    const report = verifyGenerator(bad, { numSeeds: DEFAULT_NUM_SEEDS });
    expectReadableFailure(report, 'invariants', /seed|invariant|denominator|solvab/i);
  });
});
