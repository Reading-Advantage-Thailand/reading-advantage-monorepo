import * as z from 'zod';
export const AchievementAggregateResultSchema = z.object({  _count: z.object({
    id: z.number(),
    userId: z.number(),
    badgeType: z.number(),
    unlockedAt: z.number(),
    user: z.number()
  }).optional(),
  _min: z.object({
    id: z.string().nullable(),
    userId: z.string().nullable(),
    badgeType: z.string().nullable(),
    unlockedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    userId: z.string().nullable(),
    badgeType: z.string().nullable(),
    unlockedAt: z.date().nullable()
  }).nullable().optional()});