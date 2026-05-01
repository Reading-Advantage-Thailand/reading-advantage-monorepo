import * as z from 'zod';

// prettier-ignore
export const AttemptResultSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    lessonId: z.string(),
    score: z.number(),
    maxScore: z.number(),
    attemptNumber: z.number().int(),
    startedAt: z.date(),
    completedAt: z.date().nullable(),
    student: z.unknown(),
    lesson: z.unknown(),
    questionResponses: z.array(z.unknown()),
    masteryRun: z.unknown().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type AttemptResultType = z.infer<typeof AttemptResultSchema>;
