// Phase-2 property test: Solvability / range invariants (FR5).
//
// Contract: for every seed in the corpus, the generated instance
// must satisfy all declared invariants (`output.invariants[]`) and
// must not degenerate (no division by zero, no empty solution sets
// where a non-empty set is expected, no out-of-range coefficients).
//
// Invariants may be structural (e.g., "denominator != 0") or
// domain-specific (e.g., "vertexX is finite"); the harness must
// surface a failure for either kind when the generator emits one
// that does not hold.
//
// Red-phase expectations (all FAIL in the current state because the
// 'invariants' check does not exist in verifyGenerator yet):
//   - The report contains at least one check named 'invariants'.
//   - The check passes for the well-formed generator.
//   - The check fails for a generator whose emitted invariant is
//     false (createDegenerateGenerator), with a readable message.

import { describe, it, expect } from 'vitest';

import { verifyGenerator } from '../verify-generator.js';
import { createWellFormedGenerator } from './fixtures/wellFormedGenerator.js';
import { createDegenerateGenerator } from './fixtures/badGenerators.js';
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

describe('Solvability / range invariants (FR5)', () => {
  it('positive — well-formed generator passes invariants for every seed in the corpus', () => {
    const stub = createWellFormedGenerator();
    const report = verifyGenerator(stub, { numSeeds: DEFAULT_NUM_SEEDS });

    const invChecks = checksNamed(report, 'invariants');
    expect(invChecks.length).toBeGreaterThan(0);
    for (const check of invChecks) {
      expect(check.passed).toBe(true);
    }
    expect(report.errors).toHaveLength(0);
    expect(report.verdict).toBe('pass');
  });

  it('negative — degenerate generator (emits a failing invariant) is caught with a readable message', () => {
    const bad = createDegenerateGenerator();
    const report = verifyGenerator(bad, { numSeeds: DEFAULT_NUM_SEEDS });

    const invChecks = checksNamed(report, 'invariants');
    expect(invChecks.length).toBeGreaterThan(0);
    const failed = invChecks.filter((c) => !c.passed);
    expect(failed.length).toBeGreaterThan(0);
    // The message should mention the failing invariant name.
    expect(failed[0]?.message ?? '').toMatch(/seed|invariant|denominator|solvab/i);
    expect(report.verdict).toBe('fail');
  });

  it('direct property — every emitted invariant on the well-formed generator is true (per seed)', () => {
    const stub = createWellFormedGenerator();
    forEachSeed(({ seed }) => {
      const input = { nodeId: 'inv-prop', seed, difficulty: 1 };
      const output = stub.generate(input);
      // No invariants array → vacuously true; the harness will not
      // synthesise invariants. The contract intentionally types each
      // invariant entry as `unknown` (domain-neutral); the test knows
      // the well-formed fixture emits a `{ name, passed }` shape.
      if (!output.invariants) return;
      for (const raw of output.invariants) {
        const inv = raw as { readonly name: string; readonly passed: boolean };
        expect(inv.passed).toBe(true);
      }
    });
  });
});
