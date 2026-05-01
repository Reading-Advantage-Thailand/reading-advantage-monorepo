import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';
import { ClassOrderByWithAggregationInputObjectSchema as ClassOrderByWithAggregationInputObjectSchema } from './objects/ClassOrderByWithAggregationInput.schema';
import { ClassScalarWhereWithAggregatesInputObjectSchema as ClassScalarWhereWithAggregatesInputObjectSchema } from './objects/ClassScalarWhereWithAggregatesInput.schema';
import { ClassScalarFieldEnumSchema } from './enums/ClassScalarFieldEnum.schema';
import { ClassCountAggregateInputObjectSchema as ClassCountAggregateInputObjectSchema } from './objects/ClassCountAggregateInput.schema';
import { ClassMinAggregateInputObjectSchema as ClassMinAggregateInputObjectSchema } from './objects/ClassMinAggregateInput.schema';
import { ClassMaxAggregateInputObjectSchema as ClassMaxAggregateInputObjectSchema } from './objects/ClassMaxAggregateInput.schema';
import { ClassAvgAggregateInputObjectSchema as ClassAvgAggregateInputObjectSchema } from './objects/ClassAvgAggregateInput.schema';
import { ClassSumAggregateInputObjectSchema as ClassSumAggregateInputObjectSchema } from './objects/ClassSumAggregateInput.schema';

export const ClassGroupBySchema: z.ZodType<Prisma.ClassGroupByArgs> = z.object({ where: ClassWhereInputObjectSchema.optional(), orderBy: z.union([ClassOrderByWithAggregationInputObjectSchema, ClassOrderByWithAggregationInputObjectSchema.array()]).optional(), having: ClassScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(ClassScalarFieldEnumSchema), _count: z.union([ z.literal(true), ClassCountAggregateInputObjectSchema ]).optional(), _min: ClassMinAggregateInputObjectSchema.optional(), _max: ClassMaxAggregateInputObjectSchema.optional(), _avg: ClassAvgAggregateInputObjectSchema.optional(), _sum: ClassSumAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.ClassGroupByArgs>;

export const ClassGroupByZodSchema = z.object({ where: ClassWhereInputObjectSchema.optional(), orderBy: z.union([ClassOrderByWithAggregationInputObjectSchema, ClassOrderByWithAggregationInputObjectSchema.array()]).optional(), having: ClassScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(ClassScalarFieldEnumSchema), _count: z.union([ z.literal(true), ClassCountAggregateInputObjectSchema ]).optional(), _min: ClassMinAggregateInputObjectSchema.optional(), _max: ClassMaxAggregateInputObjectSchema.optional(), _avg: ClassAvgAggregateInputObjectSchema.optional(), _sum: ClassSumAggregateInputObjectSchema.optional() }).strict();