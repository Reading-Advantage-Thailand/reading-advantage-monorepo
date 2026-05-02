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
