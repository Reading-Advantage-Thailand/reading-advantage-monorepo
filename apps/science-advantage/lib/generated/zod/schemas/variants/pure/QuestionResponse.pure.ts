import * as z from 'zod';

// prettier-ignore
export const QuestionResponseModelSchema = z.object({
    id: z.string(),
    attemptId: z.string(),
    questionId: z.string(),
    studentAnswer: z.unknown(),
    isCorrect: z.boolean(),
    timeSpentSeconds: z.number().int(),
    answeredAt: z.date(),
    order: z.number().int().nullable(),
    attempt: z.unknown(),
    question: z.unknown(),
    createdAt: z.date()
}).strict();

export type QuestionResponsePureType = z.infer<typeof QuestionResponseModelSchema>;
