import { z } from "zod";

// ─── User Types ───────────────────────────────────────────

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  role: z.enum(["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"]),
  schoolId: z.string().uuid().nullable(),
  xp: z.number(),
  level: z.number(),
  cefrLevel: z.string(),
  createdAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// ─── Classroom Types ──────────────────────────────────────

export const createClassSchema = z.object({
  name: z.string().min(1).max(100),
});

export const classroomResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  schoolId: z.string().uuid().nullable(),
  teacherId: z.string(),
  archived: z.boolean(),
  createdAt: z.date(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type ClassroomResponse = z.infer<typeof classroomResponseSchema>;

// ─── Assignment Types ─────────────────────────────────────

export const assignmentResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  classroomId: z.string().uuid(),
  teacherId: z.string(),
  articleId: z.string().uuid().nullable(),
  lessonId: z.string().uuid().nullable(),
  dueDate: z.date().nullable(),
  type: z.string(),
  createdAt: z.date(),
});

export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;

// ─── Auth Types ───────────────────────────────────────────

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userResponseSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ─── Article Types ────────────────────────────────────────

export const articleResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  summary: z.string().nullable(),
  level: z.number().nullable(),
  cefrLevel: z.string().nullable(),
  topic: z.string().nullable(),
  image: z.string().nullable(),
  published: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ArticleResponse = z.infer<typeof articleResponseSchema>;

// ─── Activity Types ───────────────────────────────────────

export const activityResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  activityType: z.string(),
  xpEarned: z.number(),
  metadata: z.string().nullable(),
  createdAt: z.date(),
});

export type ActivityResponse = z.infer<typeof activityResponseSchema>;

// ─── Lesson Progress Types ────────────────────────────────

export const lessonProgressResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  lessonId: z.string(),
  status: z.string(),
  progress: z.number(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LessonProgressResponse = z.infer<typeof lessonProgressResponseSchema>;

// ─── Report Types ─────────────────────────────────────────

export const studentProgressReportSchema = z.object({
  studentId: z.string(),
  activities: z.array(activityResponseSchema.extend({
    targetId: z.string().nullable(),
    timer: z.number().nullable(),
    details: z.unknown(),
    completed: z.boolean().nullable(),
    updatedAt: z.date(),
  })),
  wordRecords: z.array(z.object({
    id: z.string().uuid(),
    userId: z.string(),
    articleId: z.string().uuid().nullable(),
    storyId: z.string().nullable(),
    chapterNumber: z.number().nullable(),
    word: z.unknown(),
    saveToFlashcard: z.boolean(),
    difficulty: z.number(),
    due: z.date(),
    elapsedDays: z.number(),
    lapses: z.number(),
    reps: z.number(),
    scheduledDays: z.number(),
    stability: z.number(),
    state: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })),
  sentenceRecords: z.array(z.object({
    id: z.string().uuid(),
    userId: z.string(),
    articleId: z.string().uuid().nullable(),
    storyId: z.string().nullable(),
    chapterNumber: z.number().nullable(),
    sentence: z.string(),
    translation: z.unknown(),
    sn: z.number(),
    timepoint: z.number(),
    endTimepoint: z.number(),
    audioUrl: z.string().nullable(),
    saveToFlashcard: z.boolean(),
    difficulty: z.number(),
    due: z.date(),
    elapsedDays: z.number(),
    lapses: z.number(),
    reps: z.number(),
    scheduledDays: z.number(),
    stability: z.number(),
    state: z.number(),
    updateScore: z.boolean().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })),
  xpTotal: z.number(),
  storiesCompleted: z.number(),
});

export type StudentProgressReport = z.infer<typeof studentProgressReportSchema>;

export const classAnalyticsSchema = z.object({
  classId: z.string(),
  studentCount: z.number(),
  totalXp: z.number().optional(),
  averageXp: z.number().optional(),
  students: z.array(z.object({
    studentId: z.string(),
    xpTotal: z.number(),
    storiesCompleted: z.number(),
  })),
});

export type ClassAnalytics = z.infer<typeof classAnalyticsSchema>;

export const teacherDashboardSchema = z.object({
  classCount: z.number(),
  classes: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
});

export type TeacherDashboard = z.infer<typeof teacherDashboardSchema>;

// ─── Student Types ────────────────────────────────────────

export const studentResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string(),
  xp: z.number(),
  level: z.number(),
  cefrLevel: z.string(),
});

export type StudentResponse = z.infer<typeof studentResponseSchema>;

export const rosterImportResultSchema = z.object({
  username: z.string(),
  id: z.string(),
});

export type RosterImportResult = z.infer<typeof rosterImportResultSchema>;

// ─── Auth Types ───────────────────────────────────────────

export const sessionResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string().nullable(),
    role: z.enum(["INTERN", "STUDENT", "USER", "TEACHER", "ADMIN", "SYSTEM"]),
    schoolId: z.string().nullable(),
  }),
  tenant: z.object({
    schoolId: z.string().nullable(),
  }),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

// ─── Branded Types ────────────────────────────────────────

/**
 * Branded type for polymorphic question IDs.
 * Used for studentAnswers.questionId which may reference either
 * multiple_choice_questions.id or short_answer_questions.id.
 */
export const PolymorphicQuestionId = z.string().brand<"PolymorphicQuestionId">();
export type PolymorphicQuestionId = z.infer<typeof PolymorphicQuestionId>;

/**
 * Branded type for external lesson IDs.
 * Used for lessonProgress.lessonId which may reference external
 * lesson identifiers in addition to internal lessons.id UUIDs.
 */
export const ExternalLessonId = z.string().brand<"ExternalLessonId">();
export type ExternalLessonId = z.infer<typeof ExternalLessonId>;

// ─── Codecamp Types ───────────────────────────────────────

export * from "./codecamp.js";
