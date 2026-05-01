import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './objects/AssignmentInclude.schema';
import { AssignmentOrderByWithRelationInputObjectSchema as AssignmentOrderByWithRelationInputObjectSchema } from './objects/AssignmentOrderByWithRelationInput.schema';
import { AssignmentWhereInputObjectSchema as AssignmentWhereInputObjectSchema } from './objects/AssignmentWhereInput.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './objects/AssignmentWhereUniqueInput.schema';
import { AssignmentScalarFieldEnumSchema } from './enums/AssignmentScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const AssignmentFindFirstSelectSchema: z.ZodType<Prisma.AssignmentSelect> = z.object({
    id: z.boolean().optional(),
    classId: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    assignedAt: z.boolean().optional(),
    dueAt: z.boolean().optional(),
    assignedBy: z.boolean().optional(),
    class: z.boolean().optional(),
    lesson: z.boolean().optional(),
    teacher: z.boolean().optional(),
    createdAt: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.AssignmentSelect>;

export const AssignmentFindFirstSelectZodSchema = z.object({
    id: z.boolean().optional(),
    classId: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    assignedAt: z.boolean().optional(),
    dueAt: z.boolean().optional(),
    assignedBy: z.boolean().optional(),
    class: z.boolean().optional(),
    lesson: z.boolean().optional(),
    teacher: z.boolean().optional(),
    createdAt: z.boolean().optional()
  }).strict();

export const AssignmentFindFirstSchema: z.ZodType<Prisma.AssignmentFindFirstArgs> = z.object({ select: AssignmentFindFirstSelectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), orderBy: z.union([AssignmentOrderByWithRelationInputObjectSchema, AssignmentOrderByWithRelationInputObjectSchema.array()]).optional(), where: AssignmentWhereInputObjectSchema.optional(), cursor: AssignmentWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AssignmentScalarFieldEnumSchema, AssignmentScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentFindFirstArgs>;

export const AssignmentFindFirstZodSchema = z.object({ select: AssignmentFindFirstSelectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), orderBy: z.union([AssignmentOrderByWithRelationInputObjectSchema, AssignmentOrderByWithRelationInputObjectSchema.array()]).optional(), where: AssignmentWhereInputObjectSchema.optional(), cursor: AssignmentWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AssignmentScalarFieldEnumSchema, AssignmentScalarFieldEnumSchema.array()]).optional() }).strict();