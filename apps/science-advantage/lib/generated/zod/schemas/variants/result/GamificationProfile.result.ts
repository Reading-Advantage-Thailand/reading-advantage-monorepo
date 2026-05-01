import * as z from 'zod';

// prettier-ignore
export const GamificationProfileResultSchema = z.object({
    id: z.string(),
    userId: z.string(),
    xp: z.number().int(),
    level: z.number().int(),
    streak: z.number().int(),
    lastActiveAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    user: z.unknown()
}).strict();

export type GamificationProfileResultType = z.infer<typeof GamificationProfileResultSchema>;
