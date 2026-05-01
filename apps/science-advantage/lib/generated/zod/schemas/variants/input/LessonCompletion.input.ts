import * as z from 'zod';

import { LessonCompletionStatusSchema } from '../../enums/LessonCompletionStatus.schema';
// prettier-ignore
export const LessonCompletionInputSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    lessonId: z.string(),
    status: LessonCompletionStatusSchema,
    completedAt: z.date().optional().nullable(),
    attemptsCount: z.number().int(),
    bestScore: z.number().optional().nullable(),
    bestScorePercentage: z.number().optional().nullable(),
    mostRecentScore: z.number().optional().nullable(),
    mostRecentScorePercentage: z.number().optional().nullable(),
    totalTimeSpentSeconds: z.number().int(),
    lastAttemptAt: z.date().optional().nullable(),
    student: z.unknown(),
    lesson: z.unknown(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type LessonCompletionInputType = z.infer<typeof LessonCompletionInputSchema>;
