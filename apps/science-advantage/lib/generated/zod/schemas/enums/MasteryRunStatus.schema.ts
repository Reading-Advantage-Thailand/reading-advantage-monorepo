import * as z from 'zod';

export const MasteryRunStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])

export type MasteryRunStatus = z.infer<typeof MasteryRunStatusSchema>;