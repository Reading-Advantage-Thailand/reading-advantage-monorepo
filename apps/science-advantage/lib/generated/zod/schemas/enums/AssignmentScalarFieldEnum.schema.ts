import * as z from 'zod';

export const AssignmentScalarFieldEnumSchema = z.enum(['id', 'classId', 'lessonId', 'assignedAt', 'dueAt', 'assignedBy', 'createdAt'])

export type AssignmentScalarFieldEnum = z.infer<typeof AssignmentScalarFieldEnumSchema>;