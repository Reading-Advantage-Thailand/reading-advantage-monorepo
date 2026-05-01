import * as z from 'zod';
export const MasteryRunFindManyResultSchema = z.object({
  data: z.array(z.object({
  attemptId: z.string(),
  studentId: z.string(),
  status: z.unknown(),
  updatedCount: z.number().int(),
  lastError: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  attempt: z.unknown(),
  student: z.unknown()
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