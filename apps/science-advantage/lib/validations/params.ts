import { z } from 'zod';

/**
 * Reusable Zod schemas for common route path parameters.
 * Each schema validates the shape and format of path segments.
 */

export const lessonSlugParamSchema = z.object({
  lessonSlug: z.string().min(1, 'lessonSlug is required'),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().uuid('studentId must be a valid UUID'),
});

export const classIdParamSchema = z.object({
  classId: z.string().uuid('classId must be a valid UUID'),
});

export const lessonIdParamSchema = z.object({
  lessonId: z.string().uuid('lessonId must be a valid UUID'),
});

export const studentIdClassIdParamSchema = z.object({
  studentId: z.string().uuid('studentId must be a valid UUID'),
  classId: z.string().uuid('classId must be a valid UUID'),
});

export const classIdLessonIdParamSchema = z.object({
  classId: z.string().uuid('classId must be a valid UUID'),
  lessonId: z.string().uuid('lessonId must be a valid UUID'),
});

export const studentIdLessonIdParamSchema = z.object({
  studentId: z.string().uuid('studentId must be a valid UUID'),
  lessonId: z.string().uuid('lessonId must be a valid UUID'),
});
