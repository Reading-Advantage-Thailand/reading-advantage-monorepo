import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './objects/CurriculumUnitInclude.schema';
import { CurriculumUnitOrderByWithRelationInputObjectSchema as CurriculumUnitOrderByWithRelationInputObjectSchema } from './objects/CurriculumUnitOrderByWithRelationInput.schema';
import { CurriculumUnitWhereInputObjectSchema as CurriculumUnitWhereInputObjectSchema } from './objects/CurriculumUnitWhereInput.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './objects/CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitScalarFieldEnumSchema } from './enums/CurriculumUnitScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const CurriculumUnitFindFirstSelectSchema: z.ZodType<Prisma.CurriculumUnitSelect> = z.object({
    id: z.boolean().optional(),
    slug: z.boolean().optional(),
    title: z.boolean().optional(),
    description: z.boolean().optional(),
    framework: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    order: z.boolean().optional(),
    lessons: z.boolean().optional(),
    classId: z.boolean().optional(),
    class: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitSelect>;

export const CurriculumUnitFindFirstSelectZodSchema = z.object({
    id: z.boolean().optional(),
    slug: z.boolean().optional(),
    title: z.boolean().optional(),
    description: z.boolean().optional(),
    framework: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    order: z.boolean().optional(),
    lessons: z.boolean().optional(),
    classId: z.boolean().optional(),
    class: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const CurriculumUnitFindFirstSchema: z.ZodType<Prisma.CurriculumUnitFindFirstArgs> = z.object({ select: CurriculumUnitFindFirstSelectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), orderBy: z.union([CurriculumUnitOrderByWithRelationInputObjectSchema, CurriculumUnitOrderByWithRelationInputObjectSchema.array()]).optional(), where: CurriculumUnitWhereInputObjectSchema.optional(), cursor: CurriculumUnitWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([CurriculumUnitScalarFieldEnumSchema, CurriculumUnitScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitFindFirstArgs>;

export const CurriculumUnitFindFirstZodSchema = z.object({ select: CurriculumUnitFindFirstSelectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), orderBy: z.union([CurriculumUnitOrderByWithRelationInputObjectSchema, CurriculumUnitOrderByWithRelationInputObjectSchema.array()]).optional(), where: CurriculumUnitWhereInputObjectSchema.optional(), cursor: CurriculumUnitWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([CurriculumUnitScalarFieldEnumSchema, CurriculumUnitScalarFieldEnumSchema.array()]).optional() }).strict();