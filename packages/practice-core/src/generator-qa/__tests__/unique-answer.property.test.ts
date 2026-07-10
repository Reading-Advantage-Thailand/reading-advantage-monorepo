// Phase-2 property test: Unique correct answer (FR3).
//
// Contract: for every seed in the corpus, the `correctAnswer` returned
// by the generator must be verifiably correct (oracle says so) AND
// unique (no other returned value is also correct).
//
// Red-phase expectations (all FAIL in the current state because the
// 'unique-answer' check does not exist in verifyGenerator yet):
//   - The report contains at least one check named 'unique-answer'.
//   - The check passes for the well-formed generator (with an
//     injected `wellFormedStubOracle`).
//   - The check fails for the wrong-answer generator, with a
//     readable message identifying the bad seed.
//
// The structural fallback (no oracle) is asserted in a separate
// `it` — Phase-2 Green decides whether structural checks are
// sufficient or an oracle is required.

import { describe, it, expect } from 'vitest';

import { verifyGenerator } from '../verify-generator.js';
import { createWellFormedGenerator } from './fixtures/wellFormedGenerator.js';
import { createWrongAnswerGenerator } from './fixtures/badGenerators.js';
import { wellFormedStubOracle } from './fixtures/numericOracle.js';
import { DEFAULT_NUM_SEEDS, forEachSeed } from './fixtures/seedCorpus.js';

/**
 * Filter checks in a report by name.
 * @param {ReturnType<typeof verifyGenerator>} report - Verification report to search
 * @param {string} name - Check name to filter by
 * @returns {import("../verify-generator.js").VerifyGeneratorCheck[]} Array of matching checks
 */
function checksNamed(
  report: ReturnType<typeof verifyGenerator>,
  name: string,
) {
  return report.checks.filter((c) => c.name === name);
}

describe('Unique correct answer (FR3)', () => {
  it('positive — well-formed generator passes unique-answer for every seed in the corpus (with injected oracle)', () => {
    const stub = createWellFormedGenerator();
    const report = verifyGenerator(stub, {
      numSeeds: DEFAULT_NUM_SEEDS,
      oracle: wellFormedStubOracle,
    });

    const uaChecks = checksNamed(report, 'unique-answer');
    expect(uaChecks.length).toBeGreaterThan(0);
    for (const check of uaChecks) {
      expect(check.passed).toBe(true);
    }
    expect(report.errors).toHaveLength(0);
    expect(report.verdict).toBe('pass');
  });

  it('negative — wrong-answer generator is caught with a readable message', () => {
    const bad = createWrongAnswerGenerator();
    const report = verifyGenerator(bad, {
      numSeeds: DEFAULT_NUM_SEEDS,
      oracle: wellFormedStubOracle,
    });

    const uaChecks = checksNamed(report, 'unique-answer');
    expect(uaChecks.length).toBeGreaterThan(0);
    const failed = uaChecks.filter((c) => !c.passed);
    expect(failed.length).toBeGreaterThan(0);
    // The failure message must reference the seed so the author can
    // reproduce the failing instance.
    expect(failed[0]?.message ?? '').toMatch(/seed/i);
    expect(report.verdict).toBe('fail');
  });

  it('structural fallback — without an oracle, the well-formed generator still produces a passing unique-answer check', () => {
    const stub = createWellFormedGenerator();
    const report = verifyGenerator(stub, { numSeeds: DEFAULT_NUM_SEEDS });
    const uaChecks = checksNamed(report, 'unique-answer');
    expect(uaChecks.length).toBeGreaterThan(0);
    for (const check of uaChecks) {
      expect(check.passed).toBe(true);
    }
  });

  it('direct property — for every corpus seed the well-formed generator returns the structurally-correct answer', () => {
    // This is the underlying invariant: re-derive the answer from the
    // problem and assert equality. The harness-level check above is the
    // contract; this is the local sanity check.
    const stub = createWellFormedGenerator();
    forEachSeed(({ seed }) => {
      const input = { nodeId: 'ua-prop', seed, difficulty: 1 };
      const output = stub.generate(input);
      expect(wellFormedStubOracle(output)).toBe(true);
    });
  });
});
