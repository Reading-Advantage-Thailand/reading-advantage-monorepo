import * as z from 'zod';

export const StandardMasteryScalarFieldEnumSchema = z.enum(['id', 'studentId', 'standardId', 'masteryLevel', 'evidenceCount', 'lastAssessedAt', 'createdAt', 'updatedAt'])

export type StandardMasteryScalarFieldEnum = z.infer<typeof StandardMasteryScalarFieldEnumSchema>;