import * as z from 'zod';

export const AttemptScalarFieldEnumSchema = z.enum(['id', 'studentId', 'lessonId', 'score', 'maxScore', 'attemptNumber', 'startedAt', 'completedAt', 'createdAt', 'updatedAt'])

export type AttemptScalarFieldEnum = z.infer<typeof AttemptScalarFieldEnumSchema>;