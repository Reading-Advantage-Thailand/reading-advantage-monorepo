// Phase-2 property test: Distractor validity (FR4).
//
// Contract: for every seed in the corpus, every distractor in
// `output.distractors` must be:
//   1. wrong (does not match the oracle's `correctAnswer`),
//   2. distinct from the correct answer (no collisions),
//   3. distinct from sibling distractors (no duplicates),
//   4. plausibly typed (not the wrong type — e.g., a string where
//      the correct answer is a number would fail this).
//
// Red-phase expectations (all FAIL in the current state because the
// 'distractor-validity' check does not exist in verifyGenerator yet):
//   - The report contains at least one check named
//     'distractor-validity'.
//   - The check passes for the well-formed generator.
//   - The check fails for a generator whose first distractor equals
//     the correct answer (createDuplicateDistractorGenerator).

import { describe, it, expect } from 'vitest';

import { verifyGenerator } from '../verify-generator.js';
import { createWellFormedGenerator } from './fixtures/wellFormedGenerator.js';
import { createDuplicateDistractorGenerator } from './fixtures/badGenerators.js';
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

describe('Distractor validity (FR4)', () => {
  it('positive — well-formed generator passes distractor-validity for every seed in the corpus', () => {
    const stub = createWellFormedGenerator();
    const report = verifyGenerator(stub, { numSeeds: DEFAULT_NUM_SEEDS });

    const dvChecks = checksNamed(report, 'distractor-validity');
    expect(dvChecks.length).toBeGreaterThan(0);
    for (const check of dvChecks) {
      expect(check.passed).toBe(true);
    }
    expect(report.errors).toHaveLength(0);
    expect(report.verdict).toBe('pass');
  });

  it('negative — duplicate-distractor generator is caught with a readable message', () => {
    const bad = createDuplicateDistractorGenerator();
    const report = verifyGenerator(bad, { numSeeds: DEFAULT_NUM_SEEDS });

    const dvChecks = checksNamed(report, 'distractor-validity');
    expect(dvChecks.length).toBeGreaterThan(0);
    const failed = dvChecks.filter((c) => !c.passed);
    expect(failed.length).toBeGreaterThan(0);
    // The message should mention the collision — either 'duplicate',
    // 'collide', 'distinct', or a seed reference.
    expect(failed[0]?.message ?? '').toMatch(/seed|duplicate|distinct|collide/i);
    expect(report.verdict).toBe('fail');
  });

  it('direct property — every distractor in the well-formed generator is wrong, distinct, and typed (per seed)', () => {
    // Underlying invariant the harness-level check enforces.
    const stub = createWellFormedGenerator();
    forEachSeed(({ seed }) => {
      const input = { nodeId: 'dv-prop', seed, difficulty: 1 };
      const output = stub.generate(input);
      const correct = output.correctAnswer;
      const seen = new Set<unknown>([correct]);
      for (const d of output.distractors) {
        expect(d).not.toBe(correct);
        expect(seen.has(d)).toBe(false);
        seen.add(d);
        expect(typeof d).toBe(typeof correct);
      }
    });
  });
});
