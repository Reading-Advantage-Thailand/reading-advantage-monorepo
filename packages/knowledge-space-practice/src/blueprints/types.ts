// Domain-neutral blueprint types for knowledge-space-practice
import type { ReviewStatus } from '@reading-advantage/knowledge-space-core';

export interface KnowledgeBlueprint {
  nodeId: string;
  sourceNodeIds: string[];
  alignmentNodeIds: string[];
  rendererKey: string;
  rendererModeMap: Record<string, string>;
  workedExampleSpec?: WorkedExampleSpec;
  guidedPracticeSpec?: GuidedPracticeSpec;
  independentPracticeSpec?: IndependentPracticeSpec;
  generatorKey?: string;
  gradingSpec?: GradingSpec;
  misconceptionTags?: string[];
  reviewStatus: ReviewStatus;
  metadata: Record<string, unknown>;
}

export interface WorkedExampleSpec {
  prompt: string;
  givens: string[];
  target: Record<string, unknown>;
  steps: WorkedStep[];
  explanation: string;
  visualArtifact?: Record<string, unknown>;
}

export interface WorkedStep {
  description: string;
  expression?: string;
  result?: string;
  explanation?: string;
}

export interface GuidedPracticeSpec {
  scaffoldedPrompt: string;
  stepPrompts: string[];
  hints: string[];
  checksPerStep: Array<{ check: string; answerPattern?: string }>;
  revealPolicy: 'all_at_once' | 'one_at_a_time' | 'after_attempt';
}

export interface IndependentPracticeSpec {
  variantParameters: Record<string, VariantParameter>;
  generatorInputConstraints?: Record<string, unknown>;
  answerSchema: Record<string, unknown>;
  gradingRules: GradingRule[];
  replayPolicy: 'any_seed' | 'unique_seeds' | 'uniq_seeds_per_learner';
}

export interface VariantParameter {
  type: 'number' | 'integer' | 'string' | 'boolean' | 'enum';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

export interface GradingSpec {
  partIds: string[];
  passingScore?: number;
  partialCredit: boolean;
  rubric?: Array<{ criteria: string; points: number; partId?: string }>;
}

export interface GradingRule {
  partId: string;
  ruleType: 'exact_match' | 'numeric_tolerance' | 'expression_equivalence' | 'custom';
  tolerance?: number;
  maxScore: number;
}

export interface GeneratorInput {
  nodeId: string;
  seed: number;
  difficulty: number;
  learnerContext?: Record<string, unknown>;
}

export interface GeneratorOutput {
  prompt: string;
  data: Record<string, unknown>;
  expectedAnswer: Record<string, unknown>;
  solutionSteps: Array<{ description: string; expression?: string; value?: unknown }>;
  gradingMetadata: GradingMetadata;
}

export interface GradingMetadata {
  partAnswers: Record<string, unknown>;
  partMaxScores: Record<string, number>;
  partGradingRules: Record<string, 'exact_match' | 'numeric_tolerance' | 'expression_equivalence'>;
  partTolerances?: Record<string, number>;
}

export interface GenericEvidencePart {
  partId: string;
  rawAnswer: unknown;
  isCorrect?: boolean;
  score?: number;
  maxScore?: number;
  misconceptionTags?: string[];
}

export interface GenericEvidenceResult {
  parts: GenericEvidencePart[];
  totalScore?: number;
  maxTotalScore?: number;
  passed?: boolean;
}

export interface DeterministicGenerator {
  generate(input: GeneratorInput): GeneratorOutput;
}

export interface SchemaAdapter {
  acceptRendererKey(key: string): boolean;
  validateProps(key: string, props: Record<string, unknown>): boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
}
