import * as z from 'zod';

export const LessonCompletionStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])

export type LessonCompletionStatus = z.infer<typeof LessonCompletionStatusSchema>;