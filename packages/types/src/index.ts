import { z } from "zod";

// ─── User Types ───────────────────────────────────────────

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(["STUDENT", "USER", "TEACHER", "ADMIN"]),
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
