import * as z from 'zod';

import { LessonCompletionStatusSchema } from '../../enums/LessonCompletionStatus.schema';
// prettier-ignore
export const LessonCompletionResultSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    lessonId: z.string(),
    status: LessonCompletionStatusSchema,
    completedAt: z.date().nullable(),
    attemptsCount: z.number().int(),
    bestScore: z.number().nullable(),
    bestScorePercentage: z.number().nullable(),
    mostRecentScore: z.number().nullable(),
    mostRecentScorePercentage: z.number().nullable(),
    totalTimeSpentSeconds: z.number().int(),
    lastAttemptAt: z.date().nullable(),
    student: z.unknown(),
    lesson: z.unknown(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type LessonCompletionResultType = z.infer<typeof LessonCompletionResultSchema>;
