import * as z from 'zod';

// prettier-ignore
export const sessionInputSchema = z.object({
    id: z.string(),
    expiresAt: z.date(),
    token: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    ipAddress: z.string().optional().nullable(),
    userAgent: z.string().optional().nullable(),
    userId: z.string(),
    user: z.unknown()
}).strict();

export type sessionInputType = z.infer<typeof sessionInputSchema>;
