import * as z from 'zod';
export const CurriculumUnitFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  framework: z.unknown(),
  gradeLevel: z.number().int(),
  order: z.number().int(),
  lessons: z.array(z.unknown()),
  classId: z.string(),
  class: z.unknown(),
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