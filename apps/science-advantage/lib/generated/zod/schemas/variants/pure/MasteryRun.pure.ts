import * as z from 'zod';

import { MasteryRunStatusSchema } from '../../enums/MasteryRunStatus.schema';
// prettier-ignore
export const MasteryRunModelSchema = z.object({
    attemptId: z.string(),
    studentId: z.string(),
    status: MasteryRunStatusSchema,
    updatedCount: z.number().int(),
    lastError: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    attempt: z.unknown(),
    student: z.unknown()
}).strict();

export type MasteryRunPureType = z.infer<typeof MasteryRunModelSchema>;
