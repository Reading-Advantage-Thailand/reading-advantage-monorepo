import * as z from 'zod';

export const ClassScalarFieldEnumSchema = z.enum(['id', 'name', 'gradeLevel', 'standardsAlignment', 'joinCode', 'teacherId', 'createdAt', 'updatedAt'])

export type ClassScalarFieldEnum = z.infer<typeof ClassScalarFieldEnumSchema>;