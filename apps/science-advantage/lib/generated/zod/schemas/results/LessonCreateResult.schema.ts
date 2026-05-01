import * as z from 'zod';
export const LessonCreateResultSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  titleThai: z.string().optional(),
  description: z.string().optional(),
  descriptionThai: z.string().optional(),
  content: z.string().optional(),
  structuredContent: z.unknown().optional(),
  lessonType: z.unknown(),
  gradeLevel: z.number().int(),
  order: z.number().int(),
  standards: z.array(z.unknown()),
  curriculumUnits: z.array(z.unknown()),
  quizQuestions: z.array(z.unknown()),
  attempts: z.array(z.unknown()),
  lessonCompletions: z.array(z.unknown()),
  assignments: z.array(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date()
});