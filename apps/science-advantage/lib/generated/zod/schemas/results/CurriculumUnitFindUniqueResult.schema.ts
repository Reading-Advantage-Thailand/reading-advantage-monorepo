import * as z from 'zod';
export const CurriculumUnitFindUniqueResultSchema = z.nullable(z.object({
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
}));