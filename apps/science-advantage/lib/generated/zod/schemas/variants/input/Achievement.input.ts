import * as z from 'zod';

// prettier-ignore
export const AchievementInputSchema = z.object({
    id: z.string(),
    userId: z.string(),
    badgeType: z.string(),
    unlockedAt: z.date(),
    user: z.unknown()
}).strict();

export type AchievementInputType = z.infer<typeof AchievementInputSchema>;
