import * as z from 'zod';

// prettier-ignore
export const StandardMasteryModelSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    standardId: z.string(),
    masteryLevel: z.number(),
    evidenceCount: z.number().int(),
    lastAssessedAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
    student: z.unknown(),
    standard: z.unknown()
}).strict();

export type StandardMasteryPureType = z.infer<typeof StandardMasteryModelSchema>;
