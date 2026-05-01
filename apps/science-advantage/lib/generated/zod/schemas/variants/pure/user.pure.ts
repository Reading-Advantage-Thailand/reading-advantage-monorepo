import * as z from 'zod';

import { UserRoleSchema } from '../../enums/UserRole.schema';
// prettier-ignore
export const userModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    displayUsername: z.string(),
    email: z.string().nullable(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    role: UserRoleSchema,
    gradeLevel: z.number().int().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    account: z.array(z.unknown()),
    session: z.array(z.unknown()),
    taughtClasses: z.array(z.unknown()),
    enrolledClass: z.array(z.unknown()),
    attempts: z.array(z.unknown()),
    lessonCompletions: z.array(z.unknown()),
    masteryRecords: z.array(z.unknown()),
    masteryRuns: z.array(z.unknown()),
    gamificationProfile: z.unknown().nullable(),
    achievements: z.array(z.unknown()),
    assignedLessons: z.array(z.unknown())
}).strict();

export type userPureType = z.infer<typeof userModelSchema>;
