import * as z from 'zod';

// prettier-ignore
export const AchievementResultSchema = z.object({
    id: z.string(),
    userId: z.string(),
    badgeType: z.string(),
    unlockedAt: z.date(),
    user: z.unknown()
}).strict();

export type AchievementResultType = z.infer<typeof AchievementResultSchema>;
