// Phase-1 contract fixture: minimal well-formed deterministic generator.
//
// Used by `verify-generator.test.ts` as the stub passed to `verifyGenerator`.
// Phase-1 only asserts the harness accepts a generator and returns a stable
// report shape; full property checks (determinism, uniqueness, distractor
// validity, invariants) land in Phase-2.
//
// The shape mirrors the public boundary types from
// `@reading-advantage/knowledge-space-practice` (`GeneratorInput`,
// `GeneratorOutput`). We use local structural types here so this fixture
// stays decoupled from any package-internal dep changes.

export interface StubGeneratorInput {
  readonly nodeId: string;
  readonly seed: number;
  readonly difficulty: number;
  readonly learnerContext?: Readonly<Record<string, unknown>>;
}

export interface StubGeneratorOutput {
  readonly prompt: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly expectedAnswer: Readonly<Record<string, unknown>>;
  readonly solutionSteps: ReadonlyArray<{
    readonly description: string;
    readonly expression?: string;
    readonly value?: unknown;
  }>;
  readonly gradingMetadata: {
    readonly partAnswers: Readonly<Record<string, unknown>>;
    readonly partMaxScores: Readonly<Record<string, number>>;
    readonly partGradingRules: Readonly<
      Record<string, 'exact_match' | 'numeric_tolerance' | 'expression_equivalence'>
    >;
    readonly partTolerances?: Readonly<Record<string, number>>;
  };
}

export interface StubGenerator {
  generate: (input: StubGeneratorInput) => StubGeneratorOutput;
}

/**
 * Create a minimal well-formed deterministic stub generator for testing.
 * @returns {StubGenerator} - Stub generator that produces fixed-output contract-shaped objects
 */
export function createStubGenerator(): StubGenerator {
  return {
    generate: (input: StubGeneratorInput): StubGeneratorOutput => ({
      prompt: `Stub problem (seed=${input.seed})`,
      data: { seed: input.seed, difficulty: input.difficulty },
      expectedAnswer: { result: 42 },
      solutionSteps: [
        { description: 'Stub step', expression: '42', value: 42 },
      ],
      gradingMetadata: {
        partAnswers: { result: 42 },
        partMaxScores: { result: 5 },
        partGradingRules: { result: 'numeric_tolerance' },
        partTolerances: { result: 0.01 },
      },
    }),
  };
}
