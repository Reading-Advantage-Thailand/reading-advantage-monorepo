import { z } from "zod";

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

// ─── Attempt + evaluation contracts ───────────────────────

export const roleplayAttemptInputSchema = z.object({
  scenarioId: z.string().uuid(),
  audioStorageKey: z.string().min(1).nullable(),
  durationMs: z.number().int().nonnegative(),
});

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

export const createRepInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  displayName: z.string().min(1),
});

export const approveContentInputSchema = z.object({
  lessonId: z.string().uuid().optional(),
  rubricId: z.string().uuid().optional(),
});

// ─── Inferred types ───────────────────────────────────────

export type ModuleOutput = z.infer<typeof moduleOutputSchema>;
export type LessonOutput = z.infer<typeof lessonOutputSchema>;
export type RubricOutput = z.infer<typeof rubricOutputSchema>;
export type RubricCriteria = z.infer<typeof rubricCriteriaSchema>;
export type RoleplayScenarioOutput = z.infer<
  typeof roleplayScenarioOutputSchema
>;
export type QuizQuestionOutput = z.infer<typeof quizQuestionOutputSchema>;
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
export type CreateRepInput = z.infer<typeof createRepInputSchema>;
export type ApproveContentInput = z.infer<typeof approveContentInputSchema>;
