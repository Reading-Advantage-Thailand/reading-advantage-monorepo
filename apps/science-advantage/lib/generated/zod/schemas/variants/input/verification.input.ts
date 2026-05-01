import * as z from 'zod';

// prettier-ignore
export const verificationInputSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    value: z.string(),
    expiresAt: z.date(),
    createdAt: z.date().optional().nullable(),
    updatedAt: z.date().optional().nullable()
}).strict();

export type verificationInputType = z.infer<typeof verificationInputSchema>;
