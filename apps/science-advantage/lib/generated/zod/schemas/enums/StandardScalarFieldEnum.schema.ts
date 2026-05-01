import * as z from 'zod';

export const StandardScalarFieldEnumSchema = z.enum(['id', 'framework', 'code', 'description', 'gradeLevel'])

export type StandardScalarFieldEnum = z.infer<typeof StandardScalarFieldEnumSchema>;