// Phase-2 fixture: well-formed generator that satisfies every contract
// field required by FR1 and passes each property check when the harness
// is implemented in the Green phase.
//
// The output shape matches the local `GeneratorCorrectnessContract` from
// `../contract` (problem, correctAnswer, distractors, solutionSteps,
// invariants) so the new property checks can introspect the result
// structurally without depending on the real `GeneratorOutput` schema
// from `@reading-advantage/knowledge-space-practice`.

import type { GeneratorCorrectnessContract } from '../../contract.js';

export interface WellFormedGeneratorInput {
  readonly nodeId: string;
  readonly seed: number;
  readonly difficulty: number;
  readonly learnerContext?: Readonly<Record<string, unknown>>;
}

export interface WellFormedGenerator {
  generate: (input: WellFormedGeneratorInput) => GeneratorCorrectnessContract;
}

/**
 * Build a deterministic well-formed generator.
 *
 * For each seed, the generator emits a contract-shaped object whose:
 *  - `problem` references the seed (text).
 *  - `correctAnswer` is the unique numeric value `seed + 1`.
 *  - `distractors` are three wrong numbers, all distinct from correct and
 *    from each other, all numeric (typed).
 *  - `solutionSteps` describe the trivial derivation.
 *  - `invariants` declares one always-true structural invariant so the
 *    harness invariants check has work to do across the full corpus
 *    (including boundary seeds like -1 and 2^31-1 where value-derived
 *    invariants would naturally flip).
 */
export function createWellFormedGenerator(): WellFormedGenerator {
  return {
    generate: (input: WellFormedGeneratorInput): GeneratorCorrectnessContract => {
      const correct = input.seed + 1;
      const distractorA = correct + 1;
      const distractorB = correct - 1;
      const distractorC = correct + 2;

      return {
        problem: `Compute f(${input.seed}) where f(x) = x + 1.`,
        correctAnswer: correct,
        distractors: [distractorA, distractorB, distractorC],
        solutionSteps: [
          { description: 'Apply f(x) = x + 1', expression: `f(${input.seed}) = ${input.seed} + 1`, value: correct },
        ],
        invariants: [
          { name: 'a > 0', passed: true },
        ],
      };
    },
  };
}
