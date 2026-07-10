// Phase-2 fixture: injected violators for FR2-FR5.
//
// Each factory returns a generator that LOOKS well-formed (same shape,
// satisfies the determinism check, conforms to the local `GeneratorLike`
// surface) but deliberately violates exactly one of the Phase-2
// properties. Phase-2 negative tests use these to assert the harness
// reports a *named*, *readable* failure for each property.
//
// Layout follows test-strategy.md §2 (badGenerators.ts).

import type { GeneratorCorrectnessContract } from '../../contract.js';

export interface BadGeneratorInput {
  readonly nodeId: string;
  readonly seed: number;
  readonly difficulty: number;
  readonly learnerContext?: Readonly<Record<string, unknown>>;
}

export interface BadGenerator {
  generate: (input: BadGeneratorInput) => GeneratorCorrectnessContract;
}

/**
 * FR2 violator — `generate(input)` returns a different value on every
 * call by injecting `Math.random()`. Same input → different output.
 * The determinism check must catch this.
 */
export function createNonDeterministicGenerator(): BadGenerator {
  return {
    generate: (input: BadGeneratorInput): GeneratorCorrectnessContract => {
      const noise = Math.random();
      return {
        problem: `non-deterministic (${input.seed}, ${noise})`,
        correctAnswer: input.seed + 1,
        distractors: [input.seed + 2, input.seed + 3, input.seed + 4],
        solutionSteps: [
          { description: 'add 1', expression: `${input.seed} + 1`, value: input.seed + 1 },
        ],
        invariants: [
          { name: 'noise < 1', passed: noise < 1 },
        ],
      };
    },
  };
}

/**
 * FR3 violator — every returned instance carries a `correctAnswer` that
 * is intentionally 2× the structurally-correct value (`seed + 1`).
 * The unique-correct-answer check must catch this.
 *
 * The generator is fully deterministic so the determinism check still
 * passes; only the unique-answer property fails.
 */
export function createWrongAnswerGenerator(): BadGenerator {
  return {
    generate: (input: BadGeneratorInput): GeneratorCorrectnessContract => {
      const structuralCorrect = input.seed + 1;
      const wrongAnswer = structuralCorrect * 2;
      return {
        problem: `Compute f(${input.seed}) where f(x) = x + 1.`,
        correctAnswer: wrongAnswer,
        distractors: [structuralCorrect, input.seed + 2, input.seed + 3],
        solutionSteps: [
          { description: 'claimed solution', expression: `f(${input.seed}) = ${wrongAnswer}`, value: wrongAnswer },
        ],
        invariants: [
          { name: 'a > 0', passed: true },
        ],
      };
    },
  };
}

/**
 * FR4 violator — the first distractor equals the correct answer. The
 * distractor-validity check must catch this ("wrong, distinct from
 * correct, distinct from siblings, plausibly typed").
 */
export function createDuplicateDistractorGenerator(): BadGenerator {
  return {
    generate: (input: BadGeneratorInput): GeneratorCorrectnessContract => {
      const correct = input.seed + 1;
      return {
        problem: `Compute f(${input.seed}) where f(x) = x + 1.`,
        correctAnswer: correct,
        // First distractor collides with the correct answer.
        distractors: [correct, correct + 1, correct + 2],
        solutionSteps: [
          { description: 'add 1', expression: `${input.seed} + 1`, value: correct },
        ],
        invariants: [
          { name: 'a > 0', passed: true },
        ],
      };
    },
  };
}

/**
 * FR5 violator — emits an "invariants" array whose single invariant
 * `result != 0` fails for the seed 0 (because `correct` = 0 + 1 = 1
 * actually, so this generator sets the invariant to `false` directly).
 *
 * The generator is deterministic and the correct answer is unique and
 * the distractors are valid — only the invariant property fails.
 */
export function createDegenerateGenerator(): BadGenerator {
  return {
    generate: (input: BadGeneratorInput): GeneratorCorrectnessContract => {
      const correct = input.seed + 1;
      return {
        problem: `Compute f(${input.seed}) where f(x) = x + 1.`,
        correctAnswer: correct,
        distractors: [correct + 1, correct + 2, correct + 3],
        solutionSteps: [
          { description: 'add 1', expression: `${input.seed} + 1`, value: correct },
        ],
        invariants: [
          // Forced failure: a degenerate "solvability" invariant.
          { name: 'denominator != 0', passed: false },
        ],
      };
    },
  };
}
