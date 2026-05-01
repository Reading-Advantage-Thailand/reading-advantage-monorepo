import * as z from 'zod';
export const StandardFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  framework: z.unknown(),
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional(),
  lessons: z.array(z.unknown()),
  quizQuestions: z.array(z.unknown()),
  masteryRecords: z.array(z.unknown())
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