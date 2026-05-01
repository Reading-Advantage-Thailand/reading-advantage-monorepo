import * as z from 'zod';
export const LessonFindManyResultSchema = z.object({
  data: z.array(z.object({
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
})),
  pagination: z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})
});