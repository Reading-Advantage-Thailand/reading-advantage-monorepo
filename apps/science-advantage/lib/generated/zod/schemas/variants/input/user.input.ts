import * as z from 'zod';

import { UserRoleSchema } from '../../enums/UserRole.schema';
// prettier-ignore
export const userInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    displayUsername: z.string(),
    email: z.string().optional().nullable(),
    emailVerified: z.boolean(),
    image: z.string().optional().nullable(),
    role: UserRoleSchema,
    gradeLevel: z.number().int().optional().nullable(),
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
    gamificationProfile: z.unknown().optional().nullable(),
    achievements: z.array(z.unknown()),
    assignedLessons: z.array(z.unknown())
}).strict();

export type userInputType = z.infer<typeof userInputSchema>;
