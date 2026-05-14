import { z } from "zod";

// ─── Codecamp Module Types ────────────────────────────────

export const moduleResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  order: z.number(),
  phase: z.string(),
  status: z.string(),
  lessonCount: z.number(),
  completedLessons: z.number(),
  progress: z.number(), // 0-100
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModuleResponse = z.infer<typeof moduleResponseSchema>;

// ─── Codecamp Lesson Types ────────────────────────────────

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  instructions: z.string(),
  starterCode: z.string().nullable(),
  expectedOutput: z.string().nullable(),
  hints: z.array(z.string()),
  order: z.number(),
});

export const quizQuestionSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
  order: z.number(),
});

export const quizQuestionPublicSchema = quizQuestionSchema.omit({
  correctAnswer: true,
  explanation: true,
});

export const lessonResponseSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid(),
  moduleSlug: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  type: z.enum(["theory", "exercise", "quiz"]),
  content: z.record(z.unknown()),
  exercises: z.array(exerciseSchema),
  quizQuestions: z.array(quizQuestionPublicSchema),
  userStatus: z.enum(["not_started", "in_progress", "completed"]).nullable(),
  userScore: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizQuestionPublic = z.infer<typeof quizQuestionPublicSchema>;
export type LessonResponse = z.infer<typeof lessonResponseSchema>;

// ─── Codecamp Lesson List ─────────────────────────────────

export const lessonListItemSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  type: z.enum(["theory", "exercise", "quiz"]),
  userStatus: z.enum(["not_started", "in_progress", "completed"]).nullable(),
  userScore: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LessonListItem = z.infer<typeof lessonListItemSchema>;

export const moduleBySlugResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  order: z.number(),
  phase: z.string(),
  status: z.string(),
  lessons: z.array(lessonListItemSchema),
  lessonCount: z.number(),
  completedLessons: z.number(),
  progress: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModuleBySlugResponse = z.infer<typeof moduleBySlugResponseSchema>;

// ─── Codecamp Exercise Submission ─────────────────────────

export const exerciseSubmissionSchema = z.object({
  exerciseId: z.string().uuid(),
  code: z.string(),
});

export const exerciseResultSchema = z.object({
  exerciseId: z.string().uuid(),
  passed: z.boolean(),
  feedback: z.string(),
  hints: z.array(z.string()),
});

export type ExerciseSubmission = z.infer<typeof exerciseSubmissionSchema>;
export type ExerciseResult = z.infer<typeof exerciseResultSchema>;

// ─── Codecamp Quiz Submission ─────────────────────────────

export const quizAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string(),
});

export const quizSubmissionSchema = z.object({
  lessonId: z.string().uuid(),
  answers: z.array(quizAnswerSchema),
});

export const quizResultSchema = z.object({
  lessonId: z.string().uuid(),
  score: z.number().min(0).max(100),
  total: z.number(),
  correctCount: z.number(),
  details: z.array(
    z.object({
      questionId: z.string().uuid(),
      question: z.string(),
      userAnswer: z.string(),
      correctAnswer: z.string(),
      isCorrect: z.boolean(),
      explanation: z.string(),
    })
  ),
});

export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;
export type QuizResult = z.infer<typeof quizResultSchema>;

// ─── Codecamp Chat Types ──────────────────────────────────

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.date(),
});

export const chatConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  moduleId: z.string().uuid().nullable(),
  lessonId: z.string().uuid().nullable(),
  messages: z.array(chatMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const chatMessageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  moduleId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  role: z.enum(["user", "assistant"]).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatConversation = z.infer<typeof chatConversationSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;

// ─── Codecamp Progress Types ──────────────────────────────

export const progressUpdateSchema = z.object({
  lessonId: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
  score: z.number().optional(),
});

export const progressResponseSchema = z.object({
  lessonId: z.string().uuid(),
  moduleId: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  score: z.number(),
  completedAt: z.date().nullable(),
  updatedAt: z.date(),
});

export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type ProgressResponse = z.infer<typeof progressResponseSchema>;

// ─── Codecamp Dashboard Types ─────────────────────────────

export const phaseInfoSchema = z.object({
  title: z.string(),
  description: z.string(),
  portfolioProject: z.string(),
  modules: z.array(moduleResponseSchema),
  completedLessons: z.number(),
  totalLessons: z.number(),
});

export type PhaseInfo = z.infer<typeof phaseInfoSchema>;

export const dashboardResponseSchema = z.object({
  phases: z.record(z.string(), phaseInfoSchema),
  totalLessons: z.number(),
  completedLessons: z.number(),
  overallProgress: z.number(),
  recentConversations: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().nullable(),
      updatedAt: z.date(),
    })
  ),
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

// ─── Exercise Repo Types ──────────────────────────────────

export const exerciseRepoSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid(),
  repoUrl: z.string().url(),
  description: z.string(),
  order: z.number(),
  createdAt: z.date(),
});

export const exerciseRepoInputSchema = z.object({
  moduleId: z.string().uuid(),
  repoUrl: z.string().url(),
  description: z.string().min(1).max(500),
  order: z.number().int().min(0),
});

export type ExerciseRepo = z.infer<typeof exerciseRepoSchema>;
export type ExerciseRepoInput = z.infer<typeof exerciseRepoInputSchema>;

// ─── PR Review Types ──────────────────────────────────────

export const prReviewSchema = z.object({
  id: z.string().uuid(),
  exerciseRepoId: z.string().uuid(),
  userId: z.string(),
  prUrl: z.string().url(),
  reviewStatus: z.enum(["pending", "reviewed", "needs_changes", "approved"]),
  llmReviewSummary: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  createdAt: z.date(),
});

export const prReviewInputSchema = z.object({
  exerciseRepoId: z.string().uuid(),
  prUrl: z.string().url(),
});

export const prReviewUpdateSchema = z.object({
  reviewStatus: z.enum(["pending", "reviewed", "needs_changes", "approved"]),
  llmReviewSummary: z.string().optional(),
});

export type PrReview = z.infer<typeof prReviewSchema>;
export type PrReviewInput = z.infer<typeof prReviewInputSchema>;
export type PrReviewUpdate = z.infer<typeof prReviewUpdateSchema>;

// ─── GitHub Webhook Types ─────────────────────────────────

export const githubWebhookPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    html_url: z.string().url(),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    base: z.object({
      ref: z.string(),
      repo: z.object({
        full_name: z.string(),
        html_url: z.string().url(),
      }),
    }),
    user: z.object({
      login: z.string(),
    }),
  }),
});

export type GitHubWebhookPayload = z.infer<typeof githubWebhookPayloadSchema>;

// ─── Module Phase Types ───────────────────────────────────

export const modulePhaseSchema = z.enum(["A", "B", "C", "D"]);

export const moduleWithReposSchema = moduleBySlugResponseSchema.extend({
  exerciseRepos: z.array(exerciseRepoSchema),
});

export type ModulePhase = z.infer<typeof modulePhaseSchema>;
export type ModuleWithRepos = z.infer<typeof moduleWithReposSchema>;

// ─── Admin Types ──────────────────────────────────────────

export const internAccountInputSchema = z.object({
  username: z.string().min(3).max(50),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
});

export const internProgressSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  username: z.string(),
  overallProgress: z.number(),
  completedModules: z.number(),
  totalModules: z.number(),
  quizAverage: z.number(),
  prReviewsPending: z.number(),
  prReviewsApproved: z.number(),
  lastActiveAt: z.date().nullable(),
});

export const internAccountResponseSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  name: z.string().nullable(),
  role: z.string(),
  schoolId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const internDetailSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  username: z.string(),
  moduleBreakdown: z.array(
    z.object({
      moduleId: z.string(),
      title: z.string(),
      completed: z.number(),
      totalLessons: z.number(),
      avgScore: z.number(),
    })
  ),
  quizScores: z.array(
    z.object({
      lessonId: z.string(),
      lessonTitle: z.string(),
      score: z.number(),
    })
  ),
  prReviews: z.array(prReviewSchema),
});

export type InternAccountInput = z.infer<typeof internAccountInputSchema>;
export type InternAccountResponse = z.infer<typeof internAccountResponseSchema>;
export type InternProgress = z.infer<typeof internProgressSchema>;
export type InternDetail = z.infer<typeof internDetailSchema>;
