import * as z from 'zod';

// prettier-ignore
export const GamificationProfileInputSchema = z.object({
    id: z.string(),
    userId: z.string(),
    xp: z.number().int(),
    level: z.number().int(),
    streak: z.number().int(),
    lastActiveAt: z.date().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    user: z.unknown()
}).strict();

export type GamificationProfileInputType = z.infer<typeof GamificationProfileInputSchema>;
