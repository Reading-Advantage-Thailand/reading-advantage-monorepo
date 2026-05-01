import * as z from 'zod';

export const AchievementScalarFieldEnumSchema = z.enum(['id', 'userId', 'badgeType', 'unlockedAt'])

export type AchievementScalarFieldEnum = z.infer<typeof AchievementScalarFieldEnumSchema>;