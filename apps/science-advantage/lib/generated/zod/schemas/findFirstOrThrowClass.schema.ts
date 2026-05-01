import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassOrderByWithRelationInputObjectSchema as ClassOrderByWithRelationInputObjectSchema } from './objects/ClassOrderByWithRelationInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';
import { ClassScalarFieldEnumSchema } from './enums/ClassScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const ClassFindFirstOrThrowSelectSchema: z.ZodType<Prisma.ClassSelect> = z.object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    standardsAlignment: z.boolean().optional(),
    joinCode: z.boolean().optional(),
    teacherId: z.boolean().optional(),
    teacher: z.boolean().optional(),
    students: z.boolean().optional(),
    curriculumUnits: z.boolean().optional(),
    assignments: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.ClassSelect>;

export const ClassFindFirstOrThrowSelectZodSchema = z.object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    standardsAlignment: z.boolean().optional(),
    joinCode: z.boolean().optional(),
    teacherId: z.boolean().optional(),
    teacher: z.boolean().optional(),
    students: z.boolean().optional(),
    curriculumUnits: z.boolean().optional(),
    assignments: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const ClassFindFirstOrThrowSchema: z.ZodType<Prisma.ClassFindFirstOrThrowArgs> = z.object({ select: ClassFindFirstOrThrowSelectSchema.optional(), include: ClassIncludeObjectSchema.optional(), orderBy: z.union([ClassOrderByWithRelationInputObjectSchema, ClassOrderByWithRelationInputObjectSchema.array()]).optional(), where: ClassWhereInputObjectSchema.optional(), cursor: ClassWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([ClassScalarFieldEnumSchema, ClassScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.ClassFindFirstOrThrowArgs>;

export const ClassFindFirstOrThrowZodSchema = z.object({ select: ClassFindFirstOrThrowSelectSchema.optional(), include: ClassIncludeObjectSchema.optional(), orderBy: z.union([ClassOrderByWithRelationInputObjectSchema, ClassOrderByWithRelationInputObjectSchema.array()]).optional(), where: ClassWhereInputObjectSchema.optional(), cursor: ClassWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([ClassScalarFieldEnumSchema, ClassScalarFieldEnumSchema.array()]).optional() }).strict();