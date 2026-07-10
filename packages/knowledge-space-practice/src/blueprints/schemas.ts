// Zod schemas for knowledge-space-practice blueprint contracts

import { z } from 'zod';
import type {
  KnowledgeBlueprint,
  GeneratorOutput,
  SchemaAdapter,
  ValidationResult,
  ValidationError,
} from './types.js';

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const variantParameterSchema = z.object({
  type: z.enum(['number', 'integer', 'string', 'boolean', 'enum']),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const gradingRuleSchema = z.object({
  partId: z.string().min(1),
  ruleType: z.enum(['exact_match', 'numeric_tolerance', 'expression_equivalence', 'custom']),
  tolerance: z.number().optional(),
  maxScore: z.number(),
});

export const workedStepSchema = z.object({
  description: z.string().min(1),
  expression: z.string().optional(),
  result: z.string().optional(),
  explanation: z.string().optional(),
});

export const workedExampleSpecSchema = z.object({
  prompt: z.string().min(1),
  givens: z.array(z.string()),
  target: z.record(z.string(), z.unknown()),
  steps: z.array(workedStepSchema).min(1),
  explanation: z.string().min(1),
  visualArtifact: z.record(z.string(), z.unknown()).optional(),
});

const revealPolicySchema = z.enum(['all_at_once', 'one_at_a_time', 'after_attempt']);

const stepCheckSchema = z.object({
  check: z.string().min(1),
  answerPattern: z.string().optional(),
});

export const guidedPracticeSpecSchema = z.object({
  scaffoldedPrompt: z.string().min(1),
  stepPrompts: z.array(z.string()),
  hints: z.array(z.string()),
  checksPerStep: z.array(stepCheckSchema),
  revealPolicy: revealPolicySchema,
});

const replayPolicySchema = z.enum(['any_seed', 'unique_seeds', 'uniq_seeds_per_learner']);

export const independentPracticeSpecSchema = z.object({
  variantParameters: z.record(z.string(), variantParameterSchema),
  generatorInputConstraints: z.record(z.string(), z.unknown()).optional(),
  answerSchema: z.record(z.string(), z.unknown()),
  gradingRules: z.array(gradingRuleSchema),
  replayPolicy: replayPolicySchema,
});

export const gradingSpecSchema = z.object({
  partIds: z.array(z.string().min(1)),
  passingScore: z.number().optional(),
  partialCredit: z.boolean(),
  rubric: z.array(z.object({
    criteria: z.string().min(1),
    points: z.number(),
    partId: z.string().optional(),
  })).optional(),
});

export const knowledgeBlueprintSchema = z.object({
  nodeId: z.string().min(1),
  sourceNodeIds: z.array(z.string()),
  alignmentNodeIds: z.array(z.string()),
  rendererKey: z.string(),
  rendererModeMap: z.record(z.string(), z.string()),
  workedExampleSpec: workedExampleSpecSchema.optional(),
  guidedPracticeSpec: guidedPracticeSpecSchema.optional(),
  independentPracticeSpec: independentPracticeSpecSchema.optional(),
  generatorKey: z.string().optional(),
  gradingSpec: gradingSpecSchema.optional(),
  misconceptionTags: z.array(z.string()).optional(),
  reviewStatus: z.enum(['draft', 'reviewed', 'approved', 'rejected']),
  metadata: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Generator schemas
// ---------------------------------------------------------------------------

export const generatorInputSchema = z.object({
  nodeId: z.string().min(1),
  seed: z.number().int(),
  difficulty: z.number().min(0).max(1),
  learnerContext: z.record(z.string(), z.unknown()).optional(),
});

export const gradingMetadataSchema = z.object({
  partAnswers: z.record(z.string(), z.unknown()),
  partMaxScores: z.record(z.string(), z.number()),
  partGradingRules: z.record(
    z.string(),
    z.enum(['exact_match', 'numeric_tolerance', 'expression_equivalence']),
  ),
  partTolerances: z.record(z.string(), z.number()).optional(),
});

export const generatorOutputSchema = z.object({
  prompt: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  expectedAnswer: z.record(z.string(), z.unknown()),
  solutionSteps: z.array(z.object({
    description: z.string().min(1),
    expression: z.string().optional(),
    value: z.unknown().optional(),
  })),
  gradingMetadata: gradingMetadataSchema,
});

// ---------------------------------------------------------------------------
// Evidence schemas
// ---------------------------------------------------------------------------

export const genericEvidencePartSchema = z.object({
  partId: z.string().min(1),
  rawAnswer: z.unknown(),
  isCorrect: z.boolean().optional(),
  score: z.number().optional(),
  maxScore: z.number().optional(),
  misconceptionTags: z.array(z.string()).optional(),
});

export const genericEvidenceResultSchema = z.object({
  parts: z.array(genericEvidencePartSchema),
  totalScore: z.number().optional(),
  maxTotalScore: z.number().optional(),
  passed: z.boolean().optional(),
});

export const generatorRegistrySchema = z.record(
  z.string().min(1),
  z.object({
    generatorKey: z.string().min(1),
    nodeIds: z.array(z.string()),
    description: z.string().optional(),
  }),
);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates a generator output against a Zod schema.
 * @param {GeneratorOutput} output - Generator output to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {ValidationResult} - ValidationResult with valid flag and any errors
 */
export function validateGeneratorOutput(
  output: GeneratorOutput,
  schema: z.ZodSchema,
): ValidationResult {
  const result = schema.safeParse(output);
  if (result.success) return { valid: true };

  const errors: ValidationError[] = [];
  if (result.error) {
    for (const issue of result.error.issues) {
      errors.push({
        code: 'SCHEMA_MISMATCH',
        message: issue.message,
      });
    }
  }
  return { valid: false, errors };
}

/**
 * Checks if a blueprint is ready for generation (has generatorKey if needed).
 * @param {KnowledgeBlueprint} blueprint - Knowledge blueprint to validate
 * @returns {ValidationResult} - ValidationResult with valid flag and any errors
 */
export function validateBlueprintGeneratorReadiness(
  blueprint: KnowledgeBlueprint,
): ValidationResult {
  const errors: ValidationError[] = [];
  if (
    blueprint.independentPracticeSpec &&
    (!blueprint.generatorKey || blueprint.generatorKey.length === 0)
  ) {
    errors.push({
      code: 'MISSING_GENERATOR',
      message: 'Blueprint has an independentPracticeSpec but no generatorKey',
    });
  }
  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates that a blueprint's rendererKey is accepted by a schema adapter.
 * @param {KnowledgeBlueprint} blueprint - Knowledge blueprint to validate
 * @param {SchemaAdapter} adapter - Schema adapter with acceptRendererKey method
 * @returns {ValidationResult} - ValidationResult with valid flag and any errors
 */
export function validateRendererCompatibility(
  blueprint: KnowledgeBlueprint,
  adapter: SchemaAdapter,
): ValidationResult {
  if (!blueprint.rendererKey || blueprint.rendererKey.length === 0) {
    return { valid: true };
  }
  if (!adapter.acceptRendererKey(blueprint.rendererKey)) {
    return {
      valid: false,
      errors: [{
        code: 'UNKNOWN_RENDERER',
        message: `Renderer key "${blueprint.rendererKey}" is not accepted by the schema adapter`,
      }],
    };
  }
  return { valid: true };
}

/**
 * Validates that a blueprint's mode map aligns with its spec definitions.
 * @param {KnowledgeBlueprint} blueprint - Knowledge blueprint to validate
 * @returns {ValidationResult} - ValidationResult with valid flag and any errors
 */
export function validateModeSupport(
  blueprint: KnowledgeBlueprint,
): ValidationResult {
  const errors: ValidationError[] = [];
  const modeMap = blueprint.rendererModeMap ?? {};

  if (modeMap['worked'] && !blueprint.workedExampleSpec) {
    errors.push({
      code: 'MISSING_WORKED_SPEC',
      message: 'Blueprint has "worked" in rendererModeMap but no workedExampleSpec',
    });
  }

  if (modeMap['guidedPractice'] && !blueprint.guidedPracticeSpec) {
    errors.push({
      code: 'MISSING_GUIDED_SPEC',
      message: 'Blueprint has "guidedPractice" in rendererModeMap but no guidedPracticeSpec',
    });
  }

  if (modeMap['independentPractice'] && !blueprint.independentPracticeSpec) {
    errors.push({
      code: 'MISSING_INDEPENDENT_SPEC',
      message: 'Blueprint has "independentPractice" in rendererModeMap but no independentPracticeSpec',
    });
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates grading consistency between gradingSpec and independentPracticeSpec.
 * @param {KnowledgeBlueprint} blueprint - Knowledge blueprint to validate
 * @returns {ValidationResult} - ValidationResult with valid flag and any errors
 */
export function validateGradingCompatibility(
  blueprint: KnowledgeBlueprint,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!blueprint.gradingSpec && !blueprint.independentPracticeSpec) {
    return { valid: true };
  }

  const gradingPartIds = blueprint.gradingSpec?.partIds ?? [];
  const gradingRules = blueprint.independentPracticeSpec?.gradingRules ?? [];
  const answerKeys = Object.keys(blueprint.independentPracticeSpec?.answerSchema ?? {});

  const rulePartIds = gradingRules.map((r) => r.partId);

  // Check all grading spec partIds are covered by grading rules
  for (const partId of gradingPartIds) {
    if (!rulePartIds.includes(partId)) {
      errors.push({
        code: 'GRADING_PART_MISMATCH',
        message: `Grading spec partId "${partId}" has no matching grading rule`,
      });
    }
  }

  // Check all grading rule partIds are covered by grading spec partIds
  for (const partId of rulePartIds) {
    if (!gradingPartIds.includes(partId)) {
      errors.push({
        code: 'GRADING_PART_MISMATCH',
        message: `Grading rule partId "${partId}" has no matching grading spec partId`,
      });
    }
  }

  // Check all grading rule partIds exist in answer schema (when answerSchema is defined)
  if (answerKeys.length > 0) {
    for (const rule of gradingRules) {
      if (!answerKeys.includes(rule.partId)) {
        errors.push({
          code: 'GRADING_ANSWER_MISMATCH',
          message: `Grading rule partId "${rule.partId}" not found in answer schema keys`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
