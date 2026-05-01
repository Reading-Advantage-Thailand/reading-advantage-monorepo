import * as z from 'zod';

import { QuestionTypeSchema } from '../../enums/QuestionType.schema';
// prettier-ignore
export const QuizQuestionResultSchema = z.object({
    id: z.string(),
    slug: z.string(),
    lessonId: z.string(),
    type: QuestionTypeSchema,
    text: z.string(),
    options: z.unknown().nullable(),
    correctAnswer: z.unknown(),
    points: z.number().int(),
    order: z.number().int(),
    version: z.number().int(),
    lesson: z.unknown(),
    standards: z.array(z.unknown()),
    responses: z.array(z.unknown()),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type QuizQuestionResultType = z.infer<typeof QuizQuestionResultSchema>;
