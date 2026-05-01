import * as z from 'zod';

// prettier-ignore
export const AttemptInputSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    lessonId: z.string(),
    score: z.number(),
    maxScore: z.number(),
    attemptNumber: z.number().int(),
    startedAt: z.date(),
    completedAt: z.date().optional().nullable(),
    student: z.unknown(),
    lesson: z.unknown(),
    questionResponses: z.array(z.unknown()),
    masteryRun: z.unknown().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type AttemptInputType = z.infer<typeof AttemptInputSchema>;
