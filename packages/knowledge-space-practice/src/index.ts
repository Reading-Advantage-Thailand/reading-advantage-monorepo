// knowledge-space-practice — domain-neutral practice blueprints, generators, and projections

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
  EvidenceAdapter,
  PracticeSubmissionPart,
} from './blueprints/index.js';

export {
  misconceptionSeveritySchema,
  misconceptionLifecycleStatusSchema,
  studentMisconceptionStateSchema,
  getMisconceptionSeverity,
  runRealT6Loop,
} from './misconception-loop.js';

export type {
  MisconceptionSeverity,
  MisconceptionLifecycleStatus,
  StudentMisconceptionState,
  StudentMisconceptionLoopState,
  RunRealT6LoopInput,
  RunRealT6LoopOutput,
} from './misconception-loop.js';

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
  genericEvidenceToSubmissionParts,
  syntheticAlgebraicBlueprint,
  syntheticGraphingBlueprint,
  syntheticEnglishBlueprint,
  syntheticGeneratorOutput,
} from './blueprints/index.js';

// Projections — domain-neutral practice and visualization projections
export {
  // Runtime-value exports (mindful of dups with blueprints, e.g. syntheticEnglishBlueprint)
  projectActivityMap,
  projectSrsInputs,
  projectTeacherEvidence,
  projectStudentVisualization,
  projectParentVisualization,
  projectTeacherVisualization,
  syntheticMathKnowledgeSpace,
  syntheticEnglishGseKnowledgeSpace,
  syntheticBlueprint,
  syntheticLearnerState,
  visualNodeV1Schema,
  visualEdgeV1Schema,
  studentVisualizationV1Schema,
  parentVisualizationV1Schema,
  teacherVisualizationV1Schema,
} from './projections/index.js';

// Planner — domain-neutral planner injection
export { planRemediationInjection } from './planner/injection.js';
export type { PlannedActivity, PlanRemediationInjectionInput } from './planner/injection.js';

export type {
  ProjectedActivity,
  SrsProjectionEntry,
  TeacherEvidence,
  StandardCoverage,
  SkillCoverage,
  PrerequisiteGap,
  AttemptArtifact,
  EquivalentComponentSummary,
  VisualNodeV1,
  VisualEdgeV1,
  StudentVisualizationV1,
  ParentVisualizationV1,
  TeacherHeatmapCell,
  InterventionGroup,
  TeacherVisualizationV1,
} from './projections/index.js';
