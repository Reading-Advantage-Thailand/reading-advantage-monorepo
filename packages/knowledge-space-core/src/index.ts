// knowledge-space-core — domain-neutral knowledge space contracts

export type {
  NodeKind,
  EdgeType,
  ConfidenceLevel,
  ReviewStatus,
  ExceptionType,
  SourceRef,
  Exception,
  KnowledgeSpaceNode,
  KnowledgeSpaceEdge,
  KnowledgeSpace,
  DomainAdapter,
  ValidationError,
  ValidationResult,
} from "./types.js";

export type { PrerequisiteCycle, CycleDetectionOptions } from "./validation.js";

export { knowledgeSpaceSchema, CORE_ID_PATTERN } from "./schemas.js";

export {
  knowledgeStateSchema,
  displayLevelItemSchema,
  displayLevelSchema,
  projectDisplayLevel,
  computeNodeState,
} from "./level-projection.js";
export type {
  KnowledgeState,
  DisplayLevel,
  DisplayLevelBand,
  LevelProjectionFn,
} from "./level-projection.js";

export {
  masterySnapshotSchema,
  progressTrendHistorySchema,
  computeProgressTrend,
} from "./progress-trend.js";
export type {
  MasterySnapshot,
  ProgressTrendHistory,
  ProgressTrend,
  ComputeProgressTrendOptions,
} from "./progress-trend.js";

export {
  validateKnowledgeSpace,
  getDanglingEdges,
  getDuplicateNodeIds,
  getDuplicateEdges,
  getNodesMissingRequiredAlignments,
  getIndependentPracticeNodesMissingGenerators,
  getInvalidEdgePairings,
  validateNodeMetadataWithAdapter,
  getPrerequisiteCycles,
} from "./validation.js";

export {
  syntheticMathFixture,
  syntheticEnglishGseFixture,
} from "./fixtures.js";

export { suggestEdges } from "./edge-suggestions.js";
export type { EdgeSuggestionInput } from "./edge-suggestions.js";

export {
  placementResultSchema,
  placementResultsSchema,
  isPlacementResult,
  buildKnowledgeStateSeed,
  PROBE_RESULTS,
  probeResultSchema,
} from "./placement.js";
export type {
  PlacementResult,
  ProbeResult,
  ProbeAdapter,
  KnowledgeStateSeed,
  PlacementSeedCard,
  PlacementCardScheduler,
  BuildSeedOptions,
} from "./placement.js";

export { runPlacementTraversal } from "./placement-engine.js";
export type {
  PlacementEngineResult,
  TraversalOptions,
} from "./placement-engine.js";

export {
  findCrossCourseEquivalences,
  validateCrossCourseEdges,
  computeEquivalenceComponents,
} from "./cross-course-equivalence.js";
export type {
  CrossCourseCourse,
  CrossCourseInput,
  CrossCourseValidationResult,
  EquivalenceComponent,
} from "./cross-course-equivalence.js";

// ---------------------------------------------------------------------------
// Phase 1 — Canonical KST contract (kst-srs.v2)
// See measure/tracks/wire-kst-pipeline_20260521/{plan,test-strategy}.md
// ---------------------------------------------------------------------------

export {
  MASTERY_THRESHOLDS_DEFAULT,
  masteryThresholdsSchema,
  knowledgeStateEntrySchema,
} from "./mastery-state.js";
export type {
  MasteryThresholds,
  MasteryState,
  KnowledgeStateEntry,
  KnowledgeStateEvidence,
  ReadinessState,
} from "./mastery-state.js";

export {
  getKnowledgeState,
  stabilityToRetention,
  determineState,
} from "./knowledge-state-engine.js";
export type {
  KnowledgeStateStudentRef,
  KnowledgeStateEvidence as KnowledgeStateEvidenceArg,
} from "./knowledge-state-engine.js";

export { getOuterFringe } from "./outer-fringe.js";
export type { FringeEntry, ReadinessFn } from "./outer-fringe.js";

export {
  computeWeightedReadiness,
  createDefaultWeightedReadinessFn,
} from "./weighted-readiness.js";
export type { ReadinessResult } from "./weighted-readiness.js";

export { DefaultSrsToKstBridge, buildKstState } from "./srs-bridge.js";
export type {
  SrsCardState,
  ObjectiveProficiencyResult,
  SrsBridgeInput,
  LearnerStateOutput,
  SrsToKstBridge,
  ConvertArgs,
} from "./srs-bridge.js";

// ---------------------------------------------------------------------------
// Phase 1 — Transfer-Credit Equivalence Resolution & Policy
// See measure/tracks/transfer-credit-runtime_20260605/{plan,test-strategy}.md
// ---------------------------------------------------------------------------

export {
  resolveEquivalenceComponent,
  aggregateComponentMastery,
  seedTransferMastery,
  revertTransferMastery,
  computeTransferCredit,
  batchComputeTransferCredit,
  TRANSFER_POLICY_DEFAULT,
  transferPolicySchema,
} from "./transfer-credit.js";
export type {
  TransferPolicyConfig,
  TransferPolicy,
  ComponentMasteryResult,
  TransferCreditResult,
  BatchTransferCreditResult,
} from "./transfer-credit.js";

// ---------------------------------------------------------------------------
// Phase 2 — Transfer Eligibility & Next-Skill Path Annotation
// See measure/tracks/transfer-credit-runtime_20260605/{plan,test-strategy}.md
// ---------------------------------------------------------------------------

export {
  isTransferEligible,
  flagTransferEligible,
  annotateNextSkillPath,
  TRANSFER_ELIGIBILITY_DEFAULT,
  transferEligibilitySchema,
} from "./transfer-eligibility.js";
export type {
  TransferEligibilityConfig,
  TransferEligibleSkill,
  NextSkillPathItem,
  AnnotatedPathEntry,
} from "./transfer-eligibility.js";

// ---------------------------------------------------------------------------
// Phase 3 — Transfer Skip & Confirmation Check
// See measure/tracks/transfer-credit-runtime_20260605/{plan,test-strategy}.md
// ---------------------------------------------------------------------------

export {
  applyTransferSkip,
  revertTransferSkip,
  buildConfirmationCheck,
  shouldRequireConfirmationCheck,
  grantSkipAfterCheck,
  TRANSFER_SKIP_POLICY_DEFAULT,
  transferSkipPolicySchema,
} from "./transfer-skip.js";
export type {
  TransferSkipPolicy,
  TransferSkipRecord,
  TransferSkipState,
  ConfirmationCheckResult,
  ConfirmationCheck,
} from "./transfer-skip.js";

// ---------------------------------------------------------------------------
// Phase 4 — Teacher Audit View (FR6, AC5)
// See measure/tracks/transfer-credit-runtime_20260605/{plan,test-strategy}.md
// ---------------------------------------------------------------------------

export { buildTransferCreditAuditView } from "./transfer-teacher-audit.js";
export type {
  TransferCreditAuditRow,
  TransferCreditStudentGroup,
  TransferCreditAuditView,
  TransferSkipKind,
  TransferCreditAuditInputRecord,
  TransferCreditStudentMap,
  TransferCreditCourseMap,
} from "./transfer-teacher-audit.js";
