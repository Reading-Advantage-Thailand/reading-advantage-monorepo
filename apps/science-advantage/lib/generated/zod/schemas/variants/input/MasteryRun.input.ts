import * as z from 'zod';

import { MasteryRunStatusSchema } from '../../enums/MasteryRunStatus.schema';
// prettier-ignore
export const MasteryRunInputSchema = z.object({
    attemptId: z.string(),
    studentId: z.string(),
    status: MasteryRunStatusSchema,
    updatedCount: z.number().int(),
    lastError: z.string().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    attempt: z.unknown(),
    student: z.unknown()
}).strict();

export type MasteryRunInputType = z.infer<typeof MasteryRunInputSchema>;
