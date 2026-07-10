// Blueprint schema and generator contract tests
import { describe, expect, it } from 'vitest';
import {
  knowledgeBlueprintSchema,
  workedExampleSpecSchema,
  guidedPracticeSpecSchema,
  generatorInputSchema,
  generatorOutputSchema,
  genericEvidencePartSchema,
  genericEvidenceResultSchema,
  validateGeneratorOutput,
  validateBlueprintGeneratorReadiness,
  validateRendererCompatibility,
  validateModeSupport,
  validateGradingCompatibility,
} from '../blueprints/schemas.js';
import type {
  KnowledgeBlueprint,
  GeneratorInput,
  GeneratorOutput,
  GenericEvidencePart,
  GenericEvidenceResult,
  SchemaAdapter,
  DeterministicGenerator,
} from '../blueprints/types.js';
import {
  syntheticAlgebraicBlueprint,
  syntheticGraphingBlueprint,
  syntheticEnglishBlueprint,
  syntheticGeneratorOutput,
} from '../blueprints/fixtures.js';
import { genericEvidenceToSubmissionParts } from '../blueprints/evidence.js';
import type { EvidenceAdapter } from '../blueprints/evidence.js';

// ---------------------------------------------------------------------------
// Task 1.1 — Blueprint schema tests
// ---------------------------------------------------------------------------

describe('knowledgeBlueprintSchema', () => {
  it('accepts a valid synthetic algebraic blueprint', () => {
    const result = knowledgeBlueprintSchema.safeParse(syntheticAlgebraicBlueprint);
    expect(result.success).toBe(true);
  });

  it('accepts a valid synthetic graphing blueprint', () => {
    const result = knowledgeBlueprintSchema.safeParse(syntheticGraphingBlueprint);
    expect(result.success).toBe(true);
  });

  it('accepts a valid synthetic English/GSE-style blueprint', () => {
    const result = knowledgeBlueprintSchema.safeParse(syntheticEnglishBlueprint);
    expect(result.success).toBe(true);
  });

  it('rejects a blueprint with rendererKey not accepted by schema adapter', () => {
    const adapter: SchemaAdapter = {
      acceptRendererKey: (key: string) => key === 'algebraic-solver',
      validateProps: () => true,
    };
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      rendererKey: 'unsupported-renderer',
    };
    const result = validateRendererCompatibility(blueprint, adapter);
    expect(result.valid).toBe(false);
  });

  it('rejects an independent-practice blueprint missing generatorKey', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      independentPracticeSpec: {
        variantParameters: {
          a: { type: 'integer', min: 1, max: 5, description: 'Coefficient a' },
        },
        answerSchema: {},
        gradingRules: [],
        replayPolicy: 'any_seed',
      },
      generatorKey: undefined,
    };
    const result = validateBlueprintGeneratorReadiness(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'MISSING_GENERATOR')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 1.2 — Deterministic generator tests
// ---------------------------------------------------------------------------

describe('deterministicGenerator', () => {
  // A simple deterministic generator implementation for testing
  const testGenerator: DeterministicGenerator = {
    generate: (input: GeneratorInput): GeneratorOutput => {
      const { seed } = input;
      const difficulty = input.difficulty;
      const a = seed % 5 + 1;
      const b = seed % 7 + 2;
      const c = a * b;
      const root1 = -a;
      const root2 = -b;

      return {
        prompt: `Factor x^2 + ${a + b}x + ${c} (difficulty: ${difficulty})`,
        data: { a, b, c, difficulty },
        expectedAnswer: { roots: [root1, root2], factoredForm: `(x+${a})(x+${b})` },
        solutionSteps: [
          { description: `Find two numbers that multiply to ${c} and add to ${a + b}` },
          { description: `The numbers are ${a} and ${b}` },
          { description: `So the factored form is (x+${a})(x+${b})` },
        ],
        gradingMetadata: {
          partAnswers: { factoredForm: `(x+${a})(x+${b})` },
          partMaxScores: { factoredForm: 1 },
          partGradingRules: { factoredForm: 'expression_equivalence' },
        },
      };
    },
  };

  it('returns identical output for same nodeId + seed + difficulty', () => {
    const input: GeneratorInput = { nodeId: 'math.im3.skill.m1.test', seed: 42, difficulty: 0.5 };
    const output1 = testGenerator.generate(input);
    const output2 = testGenerator.generate(input);
    expect(output1).toEqual(output2);
  });

  it('returns different output for different seed', () => {
    const input1: GeneratorInput = { nodeId: 'math.im3.skill.m1.test', seed: 42, difficulty: 0.5 };
    const input2: GeneratorInput = { nodeId: 'math.im3.skill.m1.test', seed: 99, difficulty: 0.5 };
    const a = testGenerator.generate(input1);
    const b = testGenerator.generate(input2);
    expect(a.prompt).not.toEqual(b.prompt);
    expect(a.data).not.toEqual(b.data);
    expect(a.expectedAnswer).not.toEqual(b.expectedAnswer);
  });

  it('interface accepts different nodeIds without error (simple test generator ignores nodeId)', () => {
    const input1: GeneratorInput = { nodeId: 'math.im3.skill.m1.a', seed: 42, difficulty: 0.5 };
    const input2: GeneratorInput = { nodeId: 'math.im3.skill.m1.b', seed: 42, difficulty: 0.5 };
    const a = testGenerator.generate(input1);
    const b = testGenerator.generate(input2);
    // The simple test generator only branches on seed, not nodeId.
    // Real implementations must incorporate nodeId into output computation.
    expect(a.prompt).toEqual(b.prompt);
  });

  it('validates generator output against the output schema', () => {
    const output = syntheticGeneratorOutput;
    const result = validateGeneratorOutput(output, generatorOutputSchema);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 1.3 — Practice.v1 compatibility tests
// ---------------------------------------------------------------------------

describe('genericEvidenceToSubmissionParts', () => {
  const sampleResult: GenericEvidenceResult = {
    parts: [
      { partId: 'factoredForm', rawAnswer: '(x+2)(x+3)', isCorrect: true, score: 1, maxScore: 1 },
      { partId: 'roots', rawAnswer: [-2, -3], isCorrect: true, score: 1, maxScore: 1 },
    ],
    totalScore: 2,
    maxTotalScore: 2,
    passed: true,
  };

  it('converts generic evidence to submission parts without adapter', () => {
    const parts = genericEvidenceToSubmissionParts(sampleResult);
    expect(parts).toHaveLength(2);
    expect(parts[0].partId).toBe('factoredForm');
    expect(parts[0].rawAnswer).toBe('(x+2)(x+3)');
    expect(parts[0].isCorrect).toBe(true);
    expect(parts[0].score).toBe(1);
    expect(parts[0].maxScore).toBe(1);
    expect(parts[1].partId).toBe('roots');
  });

  it('converts generic evidence to submission parts with custom EvidenceAdapter', () => {
    const adapter: EvidenceAdapter = {
      mapPart(part: GenericEvidencePart) {
        return {
          partId: part.partId,
          rawAnswer: part.rawAnswer,
          normalizedAnswer: String(part.rawAnswer),
          isCorrect: part.isCorrect,
          score: part.score,
          maxScore: part.maxScore,
          misconceptionTags: part.misconceptionTags,
          hintsUsed: 0,
          revealStepsSeen: 0,
        };
      },
    };
    const parts = genericEvidenceToSubmissionParts(sampleResult, adapter);
    expect(parts).toHaveLength(2);
    expect(parts[0].normalizedAnswer).toBe('(x+2)(x+3)');
    expect(parts[0].hintsUsed).toBe(0);
    expect(parts[0].revealStepsSeen).toBe(0);
  });

  it('handles empty evidence parts', () => {
    const emptyResult: GenericEvidenceResult = { parts: [] };
    const parts = genericEvidenceToSubmissionParts(emptyResult);
    expect(parts).toHaveLength(0);
  });

  it('preserves misconception tags in submission parts', () => {
    const resultWithMisconceptions: GenericEvidenceResult = {
      parts: [
        {
          partId: 'answer',
          rawAnswer: 'wrong',
          isCorrect: false,
          score: 0,
          maxScore: 1,
          misconceptionTags: ['sign-error'],
        },
      ],
    };
    const parts = genericEvidenceToSubmissionParts(resultWithMisconceptions);
    expect(parts[0].misconceptionTags).toEqual(['sign-error']);
  });
});

// ---------------------------------------------------------------------------
// Task 3.1 — Component compatibility validation
// ---------------------------------------------------------------------------

describe('validateRendererCompatibility', () => {
  const adapter: SchemaAdapter = {
    acceptRendererKey: (key: string) => ['algebraic-solver', 'coordinate-plane'].includes(key),
    validateProps: () => true,
  };

  it('accepts a blueprint with a known rendererKey', () => {
    const result = validateRendererCompatibility(syntheticAlgebraicBlueprint, adapter);
    expect(result.valid).toBe(true);
  });

  it('rejects a blueprint with an unknown rendererKey', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      rendererKey: 'quantum-tunneling-visualizer',
    };
    const result = validateRendererCompatibility(blueprint, adapter);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0].code).toBe('UNKNOWN_RENDERER');
  });

  it('accepts a blueprint with no rendererKey', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      rendererKey: '',
    };
    const result = validateRendererCompatibility(blueprint, adapter);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3.2 — Mode support validation
// ---------------------------------------------------------------------------

describe('validateModeSupport', () => {
  it('passes for a blueprint with worked, guided, and independent specs', () => {
    const result = validateModeSupport(syntheticAlgebraicBlueprint);
    expect(result.valid).toBe(true);
  });

  it('passes when no rendererModeMap is set (no modes to validate)', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      workedExampleSpec: undefined,
      guidedPracticeSpec: undefined,
      independentPracticeSpec: undefined,
      generatorKey: undefined,
      rendererModeMap: {},
    };
    const result = validateModeSupport(blueprint);
    expect(result.valid).toBe(true);
  });

  it('flags missing workedExampleSpec when rendererModeMap includes "worked"', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      workedExampleSpec: undefined,
      rendererModeMap: { worked: 'algebraic-solver' },
    };
    const result = validateModeSupport(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'MISSING_WORKED_SPEC')).toBe(true);
  });

  it('flags missing independentPracticeSpec when rendererModeMap includes "independentPractice"', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      independentPracticeSpec: undefined,
      generatorKey: undefined,
      rendererModeMap: { independentPractice: 'algebraic-solver' },
    };
    const result = validateModeSupport(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'MISSING_INDEPENDENT_SPEC')).toBe(true);
  });

  it('flags missing guidedPracticeSpec when rendererModeMap includes "guidedPractice"', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      guidedPracticeSpec: undefined,
      rendererModeMap: { guidedPractice: 'algebraic-solver' },
    };
    const result = validateModeSupport(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'MISSING_GUIDED_SPEC')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3.3 — Grading compatibility validation
// ---------------------------------------------------------------------------

describe('validateGradingCompatibility', () => {
  it('passes when grading spec partIds match answer schema keys', () => {
    const result = validateGradingCompatibility(syntheticAlgebraicBlueprint);
    expect(result.valid).toBe(true);
  });

  it('fails when a grading rule references a partId missing from answerSchema', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      independentPracticeSpec: {
        variantParameters: {
          a: { type: 'integer', min: 1, max: 5 },
        },
        answerSchema: { factoredForm: {}, roots: {} },
        gradingRules: [
          { partId: 'factoredForm', ruleType: 'expression_equivalence', maxScore: 1 },
          { partId: 'roots', ruleType: 'exact_match', maxScore: 1 },
          { partId: 'missingPart', ruleType: 'exact_match', maxScore: 1 },
        ],
        replayPolicy: 'any_seed',
      },
      gradingSpec: {
        partIds: ['factoredForm', 'roots', 'missingPart'],
        partialCredit: true,
      },
      generatorKey: 'alg-factoring-gen',
    };
    const result = validateGradingCompatibility(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'GRADING_ANSWER_MISMATCH')).toBe(true);
  });

  it('fails when grading spec partIds do not match grading rules partIds', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      independentPracticeSpec: {
        variantParameters: {
          a: { type: 'integer', min: 1, max: 5 },
        },
        answerSchema: { factoredForm: {}, roots: {} },
        gradingRules: [
          { partId: 'factoredForm', ruleType: 'expression_equivalence', maxScore: 1 },
          { partId: 'roots', ruleType: 'exact_match', maxScore: 1 },
        ],
        replayPolicy: 'any_seed',
      },
      gradingSpec: {
        partIds: ['factoredForm'],
        partialCredit: true,
      },
      generatorKey: 'alg-factoring-gen',
    };
    const result = validateGradingCompatibility(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'GRADING_PART_MISMATCH')).toBe(true);
  });

  it('skips grading validation when no grading spec or independent practice present', () => {
    const blueprint: KnowledgeBlueprint = {
      ...syntheticAlgebraicBlueprint,
      gradingSpec: undefined,
      independentPracticeSpec: undefined,
      generatorKey: undefined,
    };
    const result = validateGradingCompatibility(blueprint);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema-level tests
// ---------------------------------------------------------------------------

describe('workedExampleSpecSchema', () => {
  it('accepts a valid worked example spec', () => {
    const spec = {
      prompt: 'Factor x^2 + 5x + 6',
      givens: ['x^2 + 5x + 6'],
      target: { factoredForm: '(x+2)(x+3)' },
      steps: [
        { description: 'Find two numbers that multiply to 6 and add to 5', expression: 'a*b=6, a+b=5' },
        { description: 'Identify the numbers as 2 and 3', result: '2, 3' },
      ],
      explanation: 'The factored form matches the FOIL expansion',
    };
    const result = workedExampleSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });
});

describe('guidedPracticeSpecSchema', () => {
  it('accepts a valid guided practice spec', () => {
    const spec = {
      scaffoldedPrompt: 'First, find two numbers that multiply to __ and add to __',
      stepPrompts: ['What multiplies to 6?', 'What adds to 5?'],
      hints: ['Think of factor pairs of 6', 'The numbers are both positive'],
      checksPerStep: [{ check: 'identify factors' }],
      revealPolicy: 'one_at_a_time' as const,
    };
    const result = guidedPracticeSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });
});

describe('generatorInputSchema', () => {
  it('accepts a valid generator input', () => {
    const input: GeneratorInput = { nodeId: 'math.im3.skill.test', seed: 42, difficulty: 0.5 };
    const result = generatorInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid difficulty outside 0-1', () => {
    const input = { nodeId: 'math.im3.skill.test', seed: 42, difficulty: 2 };
    const result = generatorInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('genericEvidencePartSchema', () => {
  it('accepts a valid evidence part', () => {
    const part = { partId: 'answer', rawAnswer: '42', isCorrect: true, score: 1, maxScore: 1 };
    const result = genericEvidencePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });
});

describe('genericEvidenceResultSchema', () => {
  it('accepts a valid evidence result', () => {
    const result = {
      parts: [{ partId: 'answer', rawAnswer: '42', isCorrect: true, score: 1, maxScore: 1 }],
    };
    const schemaResult = genericEvidenceResultSchema.safeParse(result);
    expect(schemaResult.success).toBe(true);
  });
});
