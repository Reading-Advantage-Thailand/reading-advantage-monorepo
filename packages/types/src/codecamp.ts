import { z } from "zod";

// ─── Codecamp Module Types ────────────────────────────────

export const moduleResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  order: z.number(),
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

export const lessonResponseSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  type: z.enum(["theory", "exercise", "quiz"]),
  content: z.record(z.unknown()),
  exercises: z.array(exerciseSchema),
  quizQuestions: z.array(quizQuestionSchema),
  userStatus: z.enum(["not_started", "in_progress", "completed"]).nullable(),
  userScore: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
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

export const dashboardResponseSchema = z.object({
  modules: z.array(moduleResponseSchema),
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
