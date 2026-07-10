/**
 * Canonical version identifier for the generator-correctness contract.
 */
export const GENERATOR_CORRECTNESS_CONTRACT_VERSION =
  'generator-correctness.v1' as const;

/**
 * Correctness contract for a math problem generator.
 *
 * Every generator must produce these fields for a given seed.
 * The contract is intentionally domain-neutral — math-specific
 * oracles live in math-content/app.
 */
export interface GeneratorCorrectnessContract {
  /** The problem statement presented to the learner. */
  readonly problem: unknown;
  /** The correct answer(s) to the problem. */
  readonly correctAnswer: unknown;
  /** Plausible but incorrect answer choices. */
  readonly distractors: readonly unknown[];
  /** Optional step-by-step solution walkthrough. */
  readonly solutionSteps?: readonly unknown[];
  /** Optional structural or domain invariants the output must satisfy. */
  readonly invariants?: readonly unknown[];
}
