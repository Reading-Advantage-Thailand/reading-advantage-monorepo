import * as z from 'zod';
export const AchievementFindUniqueResultSchema = z.nullable(z.object({
  id: z.string(),
  userId: z.string(),
  badgeType: z.string(),
  unlockedAt: z.date(),
  user: z.unknown()
}));