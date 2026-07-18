import { z } from "zod";

/** Explicit Sales authorization boundary accepted by domain operations. */
export const salesAccessScopeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("company"),
    applicationKey: z.literal("sales"),
    organizationId: z.string().uuid(),
    organizationKey: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("legacy-school"),
    applicationKey: z.literal("sales"),
    schoolId: z.string().min(1),
  }),
]);

/** Complete Sales company or explicit legacy-school scope. */
export type SalesAccessScope = z.infer<typeof salesAccessScopeSchema>;

// ─── Curriculum contracts ─────────────────────────────────

export const moduleOutputSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  phase: z.string(),
  order: z.number(),
  createdAt: z.coerce.date(),
});

export const lessonOutputSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  type: z.enum(["theory", "roleplay", "quiz"]),
  content: z.string(),
  order: z.number(),
  reviewStatus: z.enum(["draft", "reviewed", "approved"]),
  createdAt: z.coerce.date(),
});

export const rubricCriteriaSchema = z.object({
  criterion: z.string(),
  weight: z.number(),
  passingScore: z.number(),
  sourceRef: z.string(),
});

export const rubricOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  criteriaJson: z.array(rubricCriteriaSchema),
  reviewStatus: z.enum(["draft", "reviewed", "approved"]),
  createdAt: z.coerce.date(),
});

export const roleplayScenarioOutputSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  personaName: z.string(),
  personaRole: z.string(),
  situation: z.string(),
  objective: z.string(),
  prospectContextJson: z.record(z.unknown()),
  rubricId: z.string(),
  order: z.number(),
  createdAt: z.coerce.date(),
});

export const quizQuestionOutputSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  question: z.string(),
  optionsJson: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
  order: z.number(),
});

/** Learner-safe quiz question projection without grading material. */
export const learnerQuizQuestionOutputSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  question: z.string(),
  optionsJson: z.array(z.string()),
  order: z.number(),
});

/** Approved lesson summary with learner-specific progression state. */
export const learnerModuleLessonOutputSchema = lessonOutputSchema.extend({
  completed: z.boolean(),
  bestScore: z.string().nullable(),
  isLocked: z.boolean(),
  prerequisiteLessonId: z.string().nullable(),
});

/** Learner-facing module detail and sequential lesson access projection. */
export const moduleBySlugOutputSchema = moduleOutputSchema.extend({
  lessons: z.array(learnerModuleLessonOutputSchema),
});

/** Learner-facing lesson detail with safe type-specific child content. */
export const lessonDetailOutputSchema = lessonOutputSchema.extend({
  completed: z.boolean(),
  bestScore: z.string().nullable(),
  moduleSlug: z.string(),
  scenarios: z.array(roleplayScenarioOutputSchema).optional(),
  quizQuestions: z.array(learnerQuizQuestionOutputSchema).optional(),
});

/** Approved learner-facing scenario and rubric projection. */
export const scenarioDetailOutputSchema = roleplayScenarioOutputSchema.extend({
  rubric: rubricOutputSchema,
});

/** Dashboard module projection with learner completion and lock state. */
export const dashboardModuleOutputSchema = moduleOutputSchema.extend({
  lessonCount: z.number().int().nonnegative(),
  completedLessons: z.number().int().nonnegative(),
  progress: z.number().int().min(0).max(100),
  isLocked: z.boolean(),
  prerequisiteModuleSlug: z.string().nullable(),
});

/** Complete administrator curriculum model without learner progression filters. */
export const adminCurriculumOutputSchema = z.object({
  modules: z.array(
    moduleOutputSchema.extend({ lessons: z.array(lessonOutputSchema) }),
  ),
  rubrics: z.array(rubricOutputSchema),
});

// ─── Attempt + evaluation contracts ───────────────────────

export const roleplayAttemptInputSchema = z.object({
  scenarioId: z.string().uuid(),
  audioStorageKey: z.string().min(1).nullable(),
  durationMs: z.number().int().nonnegative(),
});

// ─── Audio media + privacy contracts (Phase 4) ───────────

/**
 * Allowed MIME types for a roleplay audio upload. The list is intentionally
 * narrow (browser recording formats only) so that any other type —
 * e.g. `video/mp4` — is rejected before the buffer is read or sent to a
 * provider.
 */
export const ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
] as const;

/** Maximum accepted audio upload size (10 MiB). */
export const ROLEPLAY_MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Maximum accepted audio duration (5 minutes). */
export const ROLEPLAY_MAX_AUDIO_DURATION_MS = 5 * 60 * 1000;

/**
 * Validates the audio media portion of a roleplay submission: MIME type,
 * upload size, declared duration, and the consent/retention metadata that
 * gates any audio evaluation (Phase 4 anti-pattern A2 — the consent and
 * retention gate must precede all provider/storage calls).
 *
 * The schema is shared across `@reading-advantage/types` (wire boundary)
 * and `@reading-advantage/domain/sales` (business boundary). Both
 * packages export it; tests use the domain fallback when types omits it.
 */
export const roleplayAudioInputSchema = z.object({
  audio: z.object({
    buffer: z.instanceof(Buffer),
    mimeType: z.enum(ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES),
  }),
  durationMs: z
    .number()
    .int()
    .nonnegative()
    .max(ROLEPLAY_MAX_AUDIO_DURATION_MS),
  /** Rep must affirmatively consent to recording/evaluation before any provider call. */
  consentGiven: z.literal(true),
  /** Retention window in days; required so deletion can be scheduled (1-365). */
  retentionDays: z.number().int().min(1).max(365),
});

export type RoleplayAudioInput = z.infer<typeof roleplayAudioInputSchema>;

export const roleplayEvaluationResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  passed: z.boolean(),
  criteria: z.array(
    z.object({
      criterion: z.string(),
      score: z.number().min(0).max(100),
      feedback: z.string(),
    }),
  ),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestedNextAction: z.string(),
  transcriptExcerpt: z.string(),
});

export const roleplayAttemptOutputSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  userId: z.string(),
  audioStorageKey: z.string().nullable(),
  durationMs: z.number(),
  transcriptExcerpt: z.string().nullable(),
  llmScoreJson: z.unknown().nullable(),
  overallScore: z.string().nullable(),
  passed: z.boolean().nullable(),
  llmFeedback: z.string().nullable(),
  attemptNumber: z.number(),
  createdAt: z.coerce.date(),
});

// ─── Quiz + progress contracts ────────────────────────────

export const quizSubmissionInputSchema = z.object({
  lessonId: z.string().uuid(),
  answers: z.record(z.string()),
});

export const quizResultOutputSchema = z.object({
  lessonId: z.string(),
  score: z.number(),
  passed: z.boolean(),
  results: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      explanation: z.string(),
    }),
  ),
});

export const progressOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  lessonId: z.string(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  completedAt: z.coerce.date().nullable(),
  score: z.string().nullable(),
});

// ─── Chat contracts ───────────────────────────────────────

export const chatMessageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const chatMessageOutputSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
});

export const conversationOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  lessonId: z.string().nullable(),
  moduleId: z.string().nullable(),
  createdAt: z.coerce.date(),
});

// ─── Admin contracts ──────────────────────────────────────

/** Aggregate administrator view for one Sales representative. */
export const salesCohortRepOutputSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  modulesCompleted: z.number().int().nonnegative(),
  totalModules: z.number().int().nonnegative(),
  avgRoleplayScore: z.number().min(0).max(100).nullable(),
  avgQuizScore: z.number().min(0).max(100).nullable(),
  roleplayAttemptCount: z.number().int().nonnegative(),
  lastActive: z.coerce.date().nullable(),
});

/** Per-module completion summary in the administrator rep detail view. */
export const salesRepModuleDetailOutputSchema = z.object({
  moduleId: z.string(),
  slug: z.string(),
  title: z.string(),
  lessonsCompleted: z.number().int().nonnegative(),
  totalLessons: z.number().int().nonnegative(),
  completed: z.boolean(),
  avgQuizScore: z.number().min(0).max(100).nullable(),
});

/** Retry and best-attempt summary for one roleplay scenario. */
export const salesRepScenarioDetailOutputSchema = z.object({
  scenarioId: z.string(),
  lessonTitle: z.string(),
  personaName: z.string(),
  attemptCount: z.number().int().nonnegative(),
  retryCount: z.number().int().nonnegative(),
  bestAttempt: roleplayAttemptOutputSchema.nullable(),
  attempts: z.array(roleplayAttemptOutputSchema),
});

/** Complete typed administrator detail for one tenant-owned Sales rep. */
export const salesRepDetailOutputSchema = z.object({
  rep: z.object({
    userId: z.string(),
    username: z.string(),
    displayName: z.string(),
  }),
  summary: salesCohortRepOutputSchema.omit({
    userId: true,
    username: true,
    displayName: true,
  }),
  modules: z.array(salesRepModuleDetailOutputSchema),
  scenarios: z.array(salesRepScenarioDetailOutputSchema),
});

export const approveContentInputSchema = z.object({
  lessonId: z.string().uuid().optional(),
  rubricId: z.string().uuid().optional(),
});

/** Approved curriculum record returned to the administrator. */
export const approveContentOutputSchema = z.union([
  lessonOutputSchema,
  rubricOutputSchema,
]);

// ─── Inferred types ───────────────────────────────────────

export type ModuleOutput = z.infer<typeof moduleOutputSchema>;
export type LessonOutput = z.infer<typeof lessonOutputSchema>;
export type RubricOutput = z.infer<typeof rubricOutputSchema>;
export type RubricCriteria = z.infer<typeof rubricCriteriaSchema>;
export type RoleplayScenarioOutput = z.infer<
  typeof roleplayScenarioOutputSchema
>;
export type QuizQuestionOutput = z.infer<typeof quizQuestionOutputSchema>;
export type LearnerQuizQuestionOutput = z.infer<
  typeof learnerQuizQuestionOutputSchema
>;
export type LearnerModuleLessonOutput = z.infer<
  typeof learnerModuleLessonOutputSchema
>;
export type ModuleBySlugOutput = z.infer<typeof moduleBySlugOutputSchema>;
export type LessonDetailOutput = z.infer<typeof lessonDetailOutputSchema>;
export type ScenarioDetailOutput = z.infer<typeof scenarioDetailOutputSchema>;
export type DashboardModuleOutput = z.infer<typeof dashboardModuleOutputSchema>;
export type AdminCurriculumOutput = z.infer<typeof adminCurriculumOutputSchema>;
export type RoleplayAttemptInput = z.infer<typeof roleplayAttemptInputSchema>;
export type RoleplayEvaluationResult = z.infer<
  typeof roleplayEvaluationResultSchema
>;
export type RoleplayAttemptOutput = z.infer<typeof roleplayAttemptOutputSchema>;
export type QuizSubmissionInput = z.infer<typeof quizSubmissionInputSchema>;
export type QuizResultOutput = z.infer<typeof quizResultOutputSchema>;
export type ProgressOutput = z.infer<typeof progressOutputSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;
export type ChatMessageOutput = z.infer<typeof chatMessageOutputSchema>;
export type ConversationOutput = z.infer<typeof conversationOutputSchema>;
export type SalesCohortRepOutput = z.infer<typeof salesCohortRepOutputSchema>;
export type SalesRepDetailOutput = z.infer<typeof salesRepDetailOutputSchema>;
export type ApproveContentInput = z.infer<typeof approveContentInputSchema>;
export type ApproveContentOutput = z.infer<typeof approveContentOutputSchema>;
