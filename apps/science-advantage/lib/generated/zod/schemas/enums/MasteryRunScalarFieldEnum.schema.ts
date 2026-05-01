import * as z from 'zod';

export const MasteryRunScalarFieldEnumSchema = z.enum(['attemptId', 'studentId', 'status', 'updatedCount', 'lastError', 'createdAt', 'updatedAt'])

export type MasteryRunScalarFieldEnum = z.infer<typeof MasteryRunScalarFieldEnumSchema>;