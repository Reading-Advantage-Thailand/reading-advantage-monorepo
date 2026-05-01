import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userIncludeObjectSchema as userIncludeObjectSchema } from './objects/userInclude.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './objects/userOrderByWithRelationInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './objects/userWhereUniqueInput.schema';
import { UserScalarFieldEnumSchema } from './enums/UserScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const userFindFirstSelectSchema: z.ZodType<Prisma.userSelect> = z.object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    username: z.boolean().optional(),
    displayUsername: z.boolean().optional(),
    email: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    image: z.boolean().optional(),
    role: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    account: z.boolean().optional(),
    session: z.boolean().optional(),
    taughtClasses: z.boolean().optional(),
    enrolledClass: z.boolean().optional(),
    attempts: z.boolean().optional(),
    lessonCompletions: z.boolean().optional(),
    masteryRecords: z.boolean().optional(),
    masteryRuns: z.boolean().optional(),
    gamificationProfile: z.boolean().optional(),
    achievements: z.boolean().optional(),
    assignedLessons: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.userSelect>;

export const userFindFirstSelectZodSchema = z.object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    username: z.boolean().optional(),
    displayUsername: z.boolean().optional(),
    email: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    image: z.boolean().optional(),
    role: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    account: z.boolean().optional(),
    session: z.boolean().optional(),
    taughtClasses: z.boolean().optional(),
    enrolledClass: z.boolean().optional(),
    attempts: z.boolean().optional(),
    lessonCompletions: z.boolean().optional(),
    masteryRecords: z.boolean().optional(),
    masteryRuns: z.boolean().optional(),
    gamificationProfile: z.boolean().optional(),
    achievements: z.boolean().optional(),
    assignedLessons: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const userFindFirstSchema: z.ZodType<Prisma.userFindFirstArgs> = z.object({ select: userFindFirstSelectSchema.optional(), include: userIncludeObjectSchema.optional(), orderBy: z.union([userOrderByWithRelationInputObjectSchema, userOrderByWithRelationInputObjectSchema.array()]).optional(), where: userWhereInputObjectSchema.optional(), cursor: userWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.userFindFirstArgs>;

export const userFindFirstZodSchema = z.object({ select: userFindFirstSelectSchema.optional(), include: userIncludeObjectSchema.optional(), orderBy: z.union([userOrderByWithRelationInputObjectSchema, userOrderByWithRelationInputObjectSchema.array()]).optional(), where: userWhereInputObjectSchema.optional(), cursor: userWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array()]).optional() }).strict();