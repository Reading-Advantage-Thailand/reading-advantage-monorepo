import { z } from 'zod';

/**
 * Reusable Zod schemas for common route path parameters.
 * Each schema validates the shape and format of path segments.
 */

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const SLUG_OR_UUID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/**
 * studentId accepts either a UUID or the literal alias `me`, which the
 * domain layer resolves to the authenticated user's id. This enables
 * `/api/students/me/...` client paths without exposing a foreign user id.
 */
const studentIdRefine = z.string().min(1, 'studentId is required').refine(
  (value) => value === 'me' || UUID_PATTERN.test(value),
  { message: 'studentId must be a valid UUID or "me"' },
);

/**
 * lessonId accepts a UUID OR a URL-safe slug; the lesson domain functions
 * resolve either form to a lesson row.
 */
const lessonIdRefine = z.string().min(1, 'lessonId is required').refine(
  (value) => UUID_PATTERN.test(value) || SLUG_OR_UUID_PATTERN.test(value),
  { message: 'lessonId must be a valid UUID or slug' },
);

const classIdRefine = z.string().min(1, 'classId is required').refine(
  (value) => UUID_PATTERN.test(value),
  { message: 'classId must be a valid UUID' },
);

export const lessonSlugParamSchema = z.object({
  lessonSlug: z.string().min(1, 'lessonSlug is required'),
});

export const studentIdParamSchema = z.object({
  studentId: studentIdRefine,
});

export const classIdParamSchema = z.object({
  classId: classIdRefine,
});

export const lessonIdParamSchema = z.object({
  lessonId: lessonIdRefine,
});

export const studentIdClassIdParamSchema = z.object({
  studentId: studentIdRefine,
  classId: classIdRefine,
});

export const classIdLessonIdParamSchema = z.object({
  classId: classIdRefine,
  lessonId: lessonIdRefine,
});

export const studentIdLessonIdParamSchema = z.object({
  studentId: studentIdRefine,
  lessonId: lessonIdRefine,
});
