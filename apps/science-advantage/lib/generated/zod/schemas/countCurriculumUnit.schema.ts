import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitOrderByWithRelationInputObjectSchema as CurriculumUnitOrderByWithRelationInputObjectSchema } from './objects/CurriculumUnitOrderByWithRelationInput.schema';
import { CurriculumUnitWhereInputObjectSchema as CurriculumUnitWhereInputObjectSchema } from './objects/CurriculumUnitWhereInput.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './objects/CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitCountAggregateInputObjectSchema as CurriculumUnitCountAggregateInputObjectSchema } from './objects/CurriculumUnitCountAggregateInput.schema';

export const CurriculumUnitCountSchema: z.ZodType<Prisma.CurriculumUnitCountArgs> = z.object({ orderBy: z.union([CurriculumUnitOrderByWithRelationInputObjectSchema, CurriculumUnitOrderByWithRelationInputObjectSchema.array()]).optional(), where: CurriculumUnitWhereInputObjectSchema.optional(), cursor: CurriculumUnitWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), CurriculumUnitCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitCountArgs>;

export const CurriculumUnitCountZodSchema = z.object({ orderBy: z.union([CurriculumUnitOrderByWithRelationInputObjectSchema, CurriculumUnitOrderByWithRelationInputObjectSchema.array()]).optional(), where: CurriculumUnitWhereInputObjectSchema.optional(), cursor: CurriculumUnitWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), CurriculumUnitCountAggregateInputObjectSchema ]).optional() }).strict();