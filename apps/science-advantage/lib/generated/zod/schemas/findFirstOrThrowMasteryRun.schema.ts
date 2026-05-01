import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunOrderByWithRelationInputObjectSchema as MasteryRunOrderByWithRelationInputObjectSchema } from './objects/MasteryRunOrderByWithRelationInput.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './objects/MasteryRunWhereInput.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';
import { MasteryRunScalarFieldEnumSchema } from './enums/MasteryRunScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const MasteryRunFindFirstOrThrowSelectSchema: z.ZodType<Prisma.MasteryRunSelect> = z.object({
    attemptId: z.boolean().optional(),
    studentId: z.boolean().optional(),
    status: z.boolean().optional(),
    updatedCount: z.boolean().optional(),
    lastError: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    attempt: z.boolean().optional(),
    student: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.MasteryRunSelect>;

export const MasteryRunFindFirstOrThrowSelectZodSchema = z.object({
    attemptId: z.boolean().optional(),
    studentId: z.boolean().optional(),
    status: z.boolean().optional(),
    updatedCount: z.boolean().optional(),
    lastError: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    attempt: z.boolean().optional(),
    student: z.boolean().optional()
  }).strict();

export const MasteryRunFindFirstOrThrowSchema: z.ZodType<Prisma.MasteryRunFindFirstOrThrowArgs> = z.object({ select: MasteryRunFindFirstOrThrowSelectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), orderBy: z.union([MasteryRunOrderByWithRelationInputObjectSchema, MasteryRunOrderByWithRelationInputObjectSchema.array()]).optional(), where: MasteryRunWhereInputObjectSchema.optional(), cursor: MasteryRunWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([MasteryRunScalarFieldEnumSchema, MasteryRunScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunFindFirstOrThrowArgs>;

export const MasteryRunFindFirstOrThrowZodSchema = z.object({ select: MasteryRunFindFirstOrThrowSelectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), orderBy: z.union([MasteryRunOrderByWithRelationInputObjectSchema, MasteryRunOrderByWithRelationInputObjectSchema.array()]).optional(), where: MasteryRunWhereInputObjectSchema.optional(), cursor: MasteryRunWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([MasteryRunScalarFieldEnumSchema, MasteryRunScalarFieldEnumSchema.array()]).optional() }).strict();