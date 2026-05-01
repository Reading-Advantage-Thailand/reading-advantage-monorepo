import * as z from 'zod';
export const MasteryRunUpsertResultSchema = z.object({
  attemptId: z.string(),
  studentId: z.string(),
  status: z.unknown(),
  updatedCount: z.number().int(),
  lastError: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  attempt: z.unknown(),
  student: z.unknown()
});