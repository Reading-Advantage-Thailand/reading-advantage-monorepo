import * as z from 'zod';

export const GamificationProfileScalarFieldEnumSchema = z.enum(['id', 'userId', 'xp', 'level', 'streak', 'lastActiveAt', 'createdAt', 'updatedAt'])

export type GamificationProfileScalarFieldEnum = z.infer<typeof GamificationProfileScalarFieldEnumSchema>;