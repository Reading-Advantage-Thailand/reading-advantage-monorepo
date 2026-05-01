import * as z from 'zod';

// prettier-ignore
export const verificationModelSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    value: z.string(),
    expiresAt: z.date(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
}).strict();

export type verificationPureType = z.infer<typeof verificationModelSchema>;
