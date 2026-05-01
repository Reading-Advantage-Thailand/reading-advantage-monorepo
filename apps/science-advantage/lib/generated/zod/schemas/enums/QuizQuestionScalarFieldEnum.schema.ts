import * as z from 'zod';

export const QuizQuestionScalarFieldEnumSchema = z.enum(['id', 'slug', 'lessonId', 'type', 'text', 'options', 'correctAnswer', 'points', 'order', 'version', 'createdAt', 'updatedAt'])

export type QuizQuestionScalarFieldEnum = z.infer<typeof QuizQuestionScalarFieldEnumSchema>;