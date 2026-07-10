// Blueprints module — types, schemas, generators, evidence, and fixtures

export type {
  KnowledgeBlueprint,
  WorkedExampleSpec,
  WorkedStep,
  GuidedPracticeSpec,
  IndependentPracticeSpec,
  VariantParameter,
  GradingSpec,
  GradingRule,
  GeneratorInput,
  GeneratorOutput,
  GradingMetadata,
  GenericEvidencePart,
  GenericEvidenceResult,
  DeterministicGenerator,
  SchemaAdapter,
  ValidationResult,
  ValidationError,
} from './types.js';

export {
  variantParameterSchema,
  gradingRuleSchema,
  workedStepSchema,
  workedExampleSpecSchema,
  guidedPracticeSpecSchema,
  independentPracticeSpecSchema,
  gradingSpecSchema,
  knowledgeBlueprintSchema,
  generatorInputSchema,
  gradingMetadataSchema,
  generatorOutputSchema,
  generatorRegistrySchema,
  genericEvidencePartSchema,
  genericEvidenceResultSchema,
  validateGeneratorOutput,
  validateBlueprintGeneratorReadiness,
  validateRendererCompatibility,
  validateModeSupport,
  validateGradingCompatibility,
} from './schemas.js';

export {
  genericEvidenceToSubmissionParts,
} from './evidence.js';
export type {
  EvidenceAdapter,
  PracticeSubmissionPart,
} from './evidence.js';

export {
  syntheticAlgebraicBlueprint,
  syntheticGraphingBlueprint,
  syntheticEnglishBlueprint,
  syntheticGeneratorOutput,
} from './fixtures.js';
