import * as z from 'zod';
export const StandardMasteryFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  studentId: z.string(),
  standardId: z.string(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int(),
  lastAssessedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
  student: z.unknown(),
  standard: z.unknown()
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