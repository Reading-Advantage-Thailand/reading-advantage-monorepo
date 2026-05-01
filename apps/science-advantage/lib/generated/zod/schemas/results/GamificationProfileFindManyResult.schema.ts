import * as z from 'zod';
export const GamificationProfileFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  userId: z.string(),
  xp: z.number().int(),
  level: z.number().int(),
  streak: z.number().int(),
  lastActiveAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.unknown()
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