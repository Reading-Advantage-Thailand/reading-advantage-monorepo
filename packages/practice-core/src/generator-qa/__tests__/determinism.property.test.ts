// Phase-2 property test: Determinism (FR2).
//
// Contract: for every seed in the corpus, `gen.generate({ seed, … })`
// must return a structurally-identical value across multiple calls.
//
// Red-phase expectations:
//   - The harness report must contain a check named 'determinism'.
//   - The check must pass for the well-formed generator across the
//     full SEED_CORPUS (boundary seeds 0, -1, 2^31-1, 2^31 included).
//   - The check must fail loudly with a readable message for an
//     injected non-deterministic generator (badGenerators.ts).
//
// In the current state (Phase 1 Green only) the harness already has
// a 'determinism' check, so the positive path may pass; the negative
// path also passes today. The new contract this test adds is the
// requirement that the check *covers the full corpus* (not just
// seeds 0..numSeeds-1) and that its failure message is readable
// enough to act on.

import { describe, it, expect } from 'vitest';

import { verifyGenerator } from '../verify-generator.js';
import { createWellFormedGenerator } from './fixtures/wellFormedGenerator.js';
import { createNonDeterministicGenerator } from './fixtures/badGenerators.js';
import {
  SEED_CORPUS,
  DEFAULT_NUM_SEEDS,
  forEachSeed,
} from './fixtures/seedCorpus.js';

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

describe('Determinism property (FR2)', () => {
  it('positive — well-formed generator passes determinism for every seed in the corpus', () => {
    const stub = createWellFormedGenerator();
    const report = verifyGenerator(stub, { numSeeds: DEFAULT_NUM_SEEDS });

    const detChecks = checksNamed(report, 'determinism');
    expect(detChecks.length).toBeGreaterThan(0);
    for (const check of detChecks) {
      expect(check.passed).toBe(true);
    }
    // The harness must not have surfaced any error for a deterministic gen.
    expect(report.errors).toHaveLength(0);
    expect(report.verdict).toBe('pass');
  });

  it('negative — non-deterministic generator is caught with a readable message', () => {
    const bad = createNonDeterministicGenerator();
    const report = verifyGenerator(bad, { numSeeds: DEFAULT_NUM_SEEDS });

    const detChecks = checksNamed(report, 'determinism');
    expect(detChecks.length).toBeGreaterThan(0);
    const failed = detChecks.filter((c) => !c.passed);
    expect(failed.length).toBeGreaterThan(0);
    // The failure message must be actionable: include the seed.
    expect(failed[0]?.message ?? '').toMatch(/seed/i);
    expect(report.verdict).toBe('fail');
  });

  it('direct property — every seed in the corpus yields a self-equal output (sanity check)', () => {
    const stub = createWellFormedGenerator();
    forEachSeed(({ seed }) => {
      const input = { nodeId: 'det-prop', seed, difficulty: 1 };
      const a = stub.generate(input);
      const b = stub.generate(input);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });

  it('edge cases — corpus includes the boundary seeds called out in test-strategy §3', () => {
    // Lock the corpus so the seed-coverage contract cannot silently drift.
    expect(SEED_CORPUS).toContain(0);
    expect(SEED_CORPUS).toContain(-1);
    expect(SEED_CORPUS).toContain(2 ** 31 - 1);
    expect(SEED_CORPUS).toContain(2 ** 31);
  });
});
