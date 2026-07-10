export {
  PRACTICE_CONTRACT_VERSION,
  PRACTICE_MODE_VALUES,
  PRACTICE_SUBMISSION_STATUS_VALUES,
  practiceModeSchema,
  practiceSubmissionStatusSchema,
  practiceTimingConfidenceSchema,
  type PracticeTimingConfidence,
  practiceTimingSummarySchema,
  type PracticeTimingSummary,
  practiceSubmissionPartSchema,
  type PracticeSubmissionPart,
  convexActivityIdSchema,
  type ConvexActivityId,
  toConvexActivityId,
  practiceSubmissionEnvelopeSchema,
  type PracticeSubmissionEnvelope,
  type PracticeSubmissionCallbackPayload,
  isPracticeSubmissionEnvelope,
  buildPracticeSubmissionParts,
  buildPracticeSubmissionEnvelope,
  type PracticeSubmissionInput,
  normalizePracticeSubmissionInput,
} from './practice/contract.js';

/**
 * @deprecated Import from `./contract` instead. These re-exports are preserved
 * for backward compatibility and will be removed in a future version.
 */
export {
  PracticeTimingConfidenceSchema,
  PracticeTimingSummarySchema,
  PracticeSubmissionPartSchema,
  PracticeSubmissionEnvelopeSchema,
  type PracticeTimingSummary as PracticeTimingSummaryAlt,
  type PracticeSubmissionPart as PracticeSubmissionPartAlt,
  type PracticeSubmissionEnvelope as PracticeSubmissionEnvelopeAlt,
} from './practice/submission.schema.js';

export {
  DEFAULT_IDLE_THRESHOLD_MS,
  type TimingEventType,
  type TimingEvent,
  type TimingAccumulatorSnapshot,
  type TimingAccumulatorOptions,
  TimingAccumulator,
  createTimingAccumulator,
} from './practice/timing.js';

export {
  TIMING_BASELINE_MIN_SAMPLES,
  SPEED_BAND_THRESHOLDS,
  type TimingSpeedBand,
  type PracticeTimingBaseline,
  type PracticeTimingFeatures,
  type ComputeBaselineInput,
  computeTimingBaseline,
  deriveTimingFeatures,
} from './practice/timing-baseline.js';

export {
  type SrsRating,
  type SrsRatingInput,
  type SrsRatingResult,
  type SeverityByTag,
  type ComputeBaseRatingOptions,
  computeBaseRating,
  applyTimingToRating,
  mapPracticeToSrsRating,
} from './practice/srs-rating.js';

export {
  DIFFICULTY_VALUES,
  type Difficulty,
  difficultySchema,
  type PracticeVariant,
  practiceVariantSchema,
  type PracticeVariantInput,
} from './practice/problem-family.js';

/** @deprecated Renamed to practiceVariantSchema. Will be removed in a future version. */
export { practiceVariantSchema as problemFamilySchema } from './practice/problem-family.js';
/** @deprecated Renamed to PracticeVariantInput. Will be removed in a future version. */
export { type PracticeVariantInput as ProblemFamilyInput } from './practice/problem-family.js';

export {
  type PracticeItem,
  practiceItemSchema,
  type PracticeItemInput,
} from './practice/practice-item.js';

export {
  type MisconceptionSummary,
  type PracticeSubmissionEvidence,
  type SubmissionEvidence,
  type PartOutcomeSummary,
  type StudentErrorProfile,
  type LessonErrorSummary,
  type DeterministicErrorSummary,
  type AISummaryInput,
  type AISummaryOutput,
  type TeacherErrorView,
  canTeacherAccessSubmission,
  canTeacherAccessLessonSummary,
  aggregateMisconceptionTags,
  summarizePartOutcomes,
  buildStudentProfiles,
  buildDeterministicSummary,
  generateAISummary,
  buildTeacherErrorView,
} from './practice/error-analysis/index.js';

export {
  createMockPracticeEnvelope,
  createMockPracticeTimingSummary,
  createMockPracticeSubmissionPart,
} from './practice/fixtures.js';
