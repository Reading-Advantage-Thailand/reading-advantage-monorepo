import * as z from 'zod';
export const GamificationProfileCreateResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  xp: z.number().int(),
  level: z.number().int(),
  streak: z.number().int(),
  lastActiveAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.unknown()
});