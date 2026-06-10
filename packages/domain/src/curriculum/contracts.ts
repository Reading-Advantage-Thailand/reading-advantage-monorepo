import { z } from "zod";

export const getScienceLessonInputSchema = z.object({
  lessonId: z.string().min(1),
});

export const listScienceLessonsInputSchema = z.object({
  gradeLevel: z.number().int().optional(),
});

export const createScienceLessonInputSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  gradeLevel: z.number().int(),
  order: z.number().int(),
  lessonType: z.string().min(1),
  description: z.string().optional(),
  structuredContent: z.unknown().optional(),
});

export type CreateScienceLessonInput = z.infer<typeof createScienceLessonInputSchema>;
