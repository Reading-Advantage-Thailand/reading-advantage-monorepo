import * as z from 'zod';

export const UserRoleSchema = z.enum(['STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM'])

export type UserRole = z.infer<typeof UserRoleSchema>;