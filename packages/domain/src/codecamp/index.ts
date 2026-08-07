export {
  codecampModules, codecampLessons, codecampExercises, codecampQuizQuestions,
  codecampUserProgress, codecampChatConversations, codecampChatMessages,
  codecampExerciseRepos, codecampPrReviews, codecampWebhookEvents,
} from "@reading-advantage/db/schema";

export {
  getModuleBySlug, getModulesWithProgress, getModulesByPhase,
  getModuleWithExercises, checkModulePrerequisite,
} from "./modules.js";

export { getLessonsForModule, getLessonWithContent } from "./lessons.js";

export { submitExerciseAttempt, getExerciseRepos, getExerciseRepoByUrl, linkExerciseRepo } from "./exercises.js";

export { submitQuizAnswers, markTheoryComplete, QUIZ_PASS_THRESHOLD } from "./quizzes.js";

export { saveChatMessage, getChatHistory, getUserConversations, getChatContext } from "./chat.js";

export {
  CODECAMP_TUTOR_RESPONSE_SCHEMA_VERSION,
  DEFAULT_CODECAMP_TUTOR_MODEL,
  tutorInterventionLevelSchema,
  tutorResourceActionSchema,
  curatedTutorResourceSchema,
  tutorResourceReferenceSchema,
  interventionResponseSchema,
  tutorContextSchema,
  buildCodecampTutorContextInputSchema,
  tutorProvenanceSchema,
  assembleTutorContext,
  createTutorContextFromAuthorizedActivity,
  buildCodecampTutorContext,
  resolveCodecampTutorModel,
  resolveTutorResource,
  selectTutorInterventionPolicy,
  buildTutorPrompt,
  createSafeTutorFallback,
  generateTutorIntervention,
  toVerifiedTutorSupportMetadata,
  persistTutorIntervention,
  recordTutorResourceUse,
  joinTutorInterventionToVerifiedEvidence,
  persistTutorInterventionInputSchema,
  recordTutorResourceUseInputSchema,
  joinTutorEvidenceInputSchema,
  type InterventionResponse,
  type CuratedTutorResource,
  type TutorContext,
  type BuildCodecampTutorContextInput,
  type TutorProvenance,
  type TutorInterventionPolicy,
  type VerifiedTutorSupportMetadata,
  type TutorObjectGenerator,
  type PersistTutorInterventionInput,
  type RecordTutorResourceUseInput,
  type JoinTutorEvidenceInput,
} from "./tutor.js";

export { updateUserProgress, getUserDashboard } from "./progress.js";

export {
  getPrReviewsForUser, createPrReview, updatePrReview, approveAPKPrReview,
  completeApprovedPrReviewLesson, getPrReviewByPrUrl,
  logWebhookEvent, listWebhookEvents,
  type CodecampWebhookEventOutcome,
} from "./pr-reviews.js";

export {
  listDeadReviewJobs, requeueReviewJob,
  type ListReviewJobsInput, type RequeueReviewJobInput,
  type ReviewJobRow,
} from "./review-jobs.js";

export { createInternAccount, updateInternGithubUsername, listInterns, getInternProgress, summarizeTutorSupport, type TutorSupportSummary } from "./intern-accounts.js";
export { assertCodecampModuleAssigned, CODECAMP_APK_CURRICULUM_VERSION, filterCodecampModulesForAssignment, hasCodecampAPKCurriculum, isCodecampAPKCurriculumReleased } from "./curriculum-assignments.js";

export { CODECAMP_PERMISSIONS } from "./permissions.js";

export {
  CodecampError, ModuleNotFoundError, LessonNotFoundError,
  ExerciseNotFoundError, ConversationNotFoundError, InternNotFoundError,
} from "./errors.js";

export type { PracticeIssue } from "@reading-advantage/integrations-github";
export { getPracticeIssues } from "./github-issues.js";

export { reviewExercise, reviewResultSchema, reviewResultGenerationSchema, reviewEvidenceReferenceSchema, reviewObjectiveEvidenceSchema, reviewTrustedCheckRunSchema, reviewTrustedContextSchema, apkPrEvaluationSchema, apkTrustedPrEvidenceSchema, isPassingAPKPrEvaluation, aiClientToGenerateReview, aiClientToGenerateReviewWithProvenance, resolveCodecampPrReviewModel, resolveReviewObjectiveBindings, coerceReviewObjectiveEvidence, extractDiffEvidenceAnchors, validateReviewObjectiveEvidence, assertSafeReviewDiff, DEFAULT_CODECAMP_PR_REVIEW_MODEL, type ReviewResult, type ReviewTrustedContext, type DiffEvidenceAnchor, type APKPrEvaluation, type APKTrustedPrEvidence, type ReviewGenerationProvenance, type ReviewGenerationWithProvenance } from "./review-exercise.js";
export {
  buildAdvisoryAPKObjectiveEvidence,
  buildAdvisoryPrObjectiveEvidence,
  listPriorPrReviewAttempts,
  recordAdvisoryPrReviewAttempt,
  recordTrustedPrReviewAttempt,
  resolveGraphBoundPrObjectives,
  projectVerifiedPrObjectiveToMastery,
  PR_REVIEW_PROMPT_VERSION,
  PR_REVIEW_RESPONSE_SCHEMA_VERSION,
  type AdvisoryObjectiveEvidence,
  type RecordAdvisoryPrReviewAttemptInput,
  type RecordTrustedPrReviewAttemptInput,
  type RecordPrReviewAttemptResult,
  type PriorPrReviewAttemptSummary,
  type PriorPrReviewObjectiveSummary,
  type GraphBoundPrObjective,
  type VerifiedPrObjectiveResult,
  type ProjectVerifiedPrObjectiveInput,
} from "./pr-review-attempts.js";
export {
  prEvaluationFixtureSchema,
  prEvaluationFixtureApprovalSchema,
  prEvaluationFixtureResultSchema,
  prEvaluationReleasePolicySchema,
  prEvaluationRuntimeRolloutModeSchema,
  assessPrEvaluationRelease,
  detectPrEvaluationModelDrift,
  decidePrEvaluationRollout,
  resolvePrEvaluationRuntimeRollout,
  isPrEvaluationCanarySelected,
  type PrEvaluationReleaseReport,
  type PrEvaluationDriftReport,
  type PrEvaluationRolloutMode,
  type PrEvaluationRolloutDecision,
  type PrEvaluationRuntimeRollout,
} from "./pr-evaluation-release.js";
export {
  CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION,
  prReviewObjectiveCorrectionSchema,
  prReviewOverrideInputSchema,
  prReviewOverrideAuditMetadataSchema,
  recordPrReviewOverride,
  listPrReviewOverrides,
} from "./pr-review-overrides.js";
