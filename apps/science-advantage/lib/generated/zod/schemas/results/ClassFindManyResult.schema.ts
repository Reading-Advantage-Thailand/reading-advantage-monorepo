import * as z from 'zod';
export const ClassFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  name: z.string(),
  gradeLevel: z.number().int(),
  standardsAlignment: z.unknown(),
  joinCode: z.string(),
  teacherId: z.string(),
  teacher: z.unknown(),
  students: z.array(z.unknown()),
  curriculumUnits: z.array(z.unknown()),
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