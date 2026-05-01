import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassOrderByWithRelationInputObjectSchema as ClassOrderByWithRelationInputObjectSchema } from './objects/ClassOrderByWithRelationInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';
import { ClassCountAggregateInputObjectSchema as ClassCountAggregateInputObjectSchema } from './objects/ClassCountAggregateInput.schema';
import { ClassMinAggregateInputObjectSchema as ClassMinAggregateInputObjectSchema } from './objects/ClassMinAggregateInput.schema';
import { ClassMaxAggregateInputObjectSchema as ClassMaxAggregateInputObjectSchema } from './objects/ClassMaxAggregateInput.schema';
import { ClassAvgAggregateInputObjectSchema as ClassAvgAggregateInputObjectSchema } from './objects/ClassAvgAggregateInput.schema';
import { ClassSumAggregateInputObjectSchema as ClassSumAggregateInputObjectSchema } from './objects/ClassSumAggregateInput.schema';

export const ClassAggregateSchema: z.ZodType<Prisma.ClassAggregateArgs> = z.object({ orderBy: z.union([ClassOrderByWithRelationInputObjectSchema, ClassOrderByWithRelationInputObjectSchema.array()]).optional(), where: ClassWhereInputObjectSchema.optional(), cursor: ClassWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), ClassCountAggregateInputObjectSchema ]).optional(), _min: ClassMinAggregateInputObjectSchema.optional(), _max: ClassMaxAggregateInputObjectSchema.optional(), _avg: ClassAvgAggregateInputObjectSchema.optional(), _sum: ClassSumAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.ClassAggregateArgs>;

export const ClassAggregateZodSchema = z.object({ orderBy: z.union([ClassOrderByWithRelationInputObjectSchema, ClassOrderByWithRelationInputObjectSchema.array()]).optional(), where: ClassWhereInputObjectSchema.optional(), cursor: ClassWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), ClassCountAggregateInputObjectSchema ]).optional(), _min: ClassMinAggregateInputObjectSchema.optional(), _max: ClassMaxAggregateInputObjectSchema.optional(), _avg: ClassAvgAggregateInputObjectSchema.optional(), _sum: ClassSumAggregateInputObjectSchema.optional() }).strict();