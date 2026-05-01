import * as z from 'zod';

export const QuestionResponseScalarFieldEnumSchema = z.enum(['id', 'attemptId', 'questionId', 'studentAnswer', 'isCorrect', 'timeSpentSeconds', 'answeredAt', 'order', 'createdAt'])

export type QuestionResponseScalarFieldEnum = z.infer<typeof QuestionResponseScalarFieldEnumSchema>;