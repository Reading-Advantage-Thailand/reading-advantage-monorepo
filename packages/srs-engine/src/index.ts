export {
  SRS_CONTRACT_VERSION,
  PRIORITY_DEFAULTS,
  STUDENT_DAILY_PRACTICE_COPY,
  TEACHER_DAILY_PRACTICE_COPY,
} from './srs/contract.js';

export type {
  ObjectivePriority,
  ObjectivePracticePolicy,
  SrsCardId,
  SrsCardState,
  SrsReviewLogEntry,
  SrsSessionConfig,
  SrsSession,
  PracticeSubmissionEnvelope,
  PracticeSubmissionPart,
  PracticeTimingSummary,
  PracticeTimingBaseline,
  PracticeTimingFeatures,
  TimingSpeedBand,
  SrsRatingInput,
  SrsRatingResult,
} from './srs/contract.js';

export type { SrsRating } from './srs/contract.js';

export {
  DEFAULT_SCHEDULER_CONFIG,
  mapSrsRatingToGrade,
  mapGradeToSrsRating,
  createCard,
  reviewCard,
  getDueCards,
  previewInterval,
} from './srs/scheduler.js';

export type { SchedulerConfig } from './srs/scheduler.js';

export {
  processReview,
} from './srs/review-processor.js';

export type { ReviewProcessorInput } from './srs/review-processor.js';
export type { ReviewProcessorResult } from './srs/review-processor.js';

export {
  isOverdue,
  daysOverdue,
  buildDailyQueue,
} from './srs/queue.js';

export type { QueueItem } from './srs/queue.js';

export type { CardStore, ReviewLogStore } from './srs/adapters.js';
export { InMemoryCardStore, InMemoryReviewLogStore } from './srs/adapters.js';

export {
  createMockSrsCard,
  createMockSrsReviewLog,
} from './srs/fixtures.js';

export {
  validateSrsTransition,
} from './srs/transition-validator.js';

export {
  SubmissionSrsAdapter,
  InMemoryPracticeVariantResolver,
  InMemoryTimingBaselineResolver,
  InMemorySubmissionSrsAdapter,
} from './srs/submission-srs-adapter.js';

export type {
  SubmissionSrsInput,
  SubmissionSrsResult,
  SubmissionSrsResultSuccess,
  SubmissionSrsResultSkipped,
  SubmissionSrsResultError,
  PracticeVariantInfo,
  PracticeVariantResolver,
  TimingBaselineResolver,
} from './srs/submission-srs-adapter.js';

// Objective Policy
export type {
  ObjectivePolicy,
  ObjectivePolicyInput,
} from './srs/objective-policy.js';

export {
  OBJECTIVE_PRIORITY_VALUES,
  objectivePrioritySchema,
  objectivePolicySchema,
} from './srs/objective-policy.js';

// Objective Proficiency
export type {
  EvidenceConfidence,
  PracticeVariantEvidence,
  ObjectiveProficiencyInput,
  ObjectiveProficiencyResult,
  StudentProficiencyView,
  TeacherProficiencyView,
} from './srs/objective-proficiency.js';

export {
  PROFICIENCY_THRESHOLD_DEFAULTS,
  computeObjectiveProficiency,
  buildStudentProficiencyView,
  buildTeacherProficiencyView,
} from './srs/objective-proficiency.js';

// SRS Proficiency Utilities
export type {
  ProficiencyCardInput,
  TimingBaselines,
} from './srs/srs-proficiency.js';

export {
  STABILITY_SCALE_FACTOR,
  stabilityToRetention,
  aggregateCardsToEvidence,
} from './srs/srs-proficiency.js';

// Edge Calibration
export type {
  CalibrationStatus,
  CalibrationVerdict,
  CalibrationObservation,
  CalibrationContingencyTable,
  EdgeCalibration,
  CalibrationNecessityResult,
  CalibrationReviewQueueItem,
  ReviewQueueBuildInput,
  ReviewQueueBuildOptions,
} from './srs/edge-calibration.js';

export {
  CALIBRATION_STATUS_VALUES,
  extractObservations,
  buildContingencyTable,
  computeNecessity,
  computeInformativeness,
  posteriorMean,
  posteriorVariance,
  updatePosterior,
  applyDecay,
  bucketVariance,
  classifyStatus,
  buildReviewQueueItem,
  buildReviewQueue,
} from './srs/edge-calibration.js';