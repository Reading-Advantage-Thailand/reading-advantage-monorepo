// Phase-2 fixture: a domain oracle that re-derives the correct answer
// for the well-formed stub generator. The unique-correct-answer check
// (FR3) and downstream property checks accept the oracle via
// `verifyGenerator(gen, { oracle })`.
//
// Real Module-1 oracles (for `quadratic-graph-analysis`,
// `average-rate-of-change`, `solve-quadratic-by-graphing`) live in
// `packages/math-content/src/knowledge-space/generators/__tests__/oracles/`
// per test-strategy.md §4 and are out of scope for Phase-2 Red — this
// stub oracle is what the harness will fall back to when no domain
// oracle is supplied.

import type { GeneratorCorrectnessContract } from '../../contract.js';

export type NumericOracle = (
  output: GeneratorCorrectnessContract,
) => boolean;

/**
 * Stub oracle for the well-formed generator.
 *
 * Re-derives the correct answer from the problem string (which encodes
 * `f(${seed})` for the stub) and returns `true` iff the contract's
 * `correctAnswer` matches that derivation.
 *
 * Lives in `practice-core` only because it is harness-test plumbing
 * (verifies the harness accepts an injected oracle); real domain
 * oracles live in math-content.
 */
export function wellFormedStubOracle(
  output: GeneratorCorrectnessContract,
): boolean {
  const match = /f\((-?\d+)\)/.exec(String(output.problem));
  if (!match) return false;
  const seed = Number(match[1]);
  const expected = seed + 1;
  return output.correctAnswer === expected;
}

/**
 * Returns the named error message a Phase-2 failure should produce.
 *
 * Centralizes the expected failure-string shape so Red and Green
 * phases agree on the contract — Green must emit messages that include
 * this substring (or the assertion in the corresponding test will
 * fail and signal a regression in error quality).
 */
export function expectedPropertyFailureMessage(
  checkName: 'determinism' | 'unique-answer' | 'distractor-validity' | 'invariants',
  detail: string,
): string {
  return `${checkName}: ${detail}`;
}
