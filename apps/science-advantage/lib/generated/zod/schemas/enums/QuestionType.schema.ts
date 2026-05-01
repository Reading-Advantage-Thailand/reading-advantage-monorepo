import * as z from 'zod';

export const QuestionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'FILL_IN_BLANK', 'VOCABULARY_MATCH'])

export type QuestionType = z.infer<typeof QuestionTypeSchema>;