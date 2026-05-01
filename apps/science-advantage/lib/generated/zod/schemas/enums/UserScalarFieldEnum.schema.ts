import * as z from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id', 'name', 'username', 'displayUsername', 'email', 'emailVerified', 'image', 'role', 'gradeLevel', 'createdAt', 'updatedAt'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;