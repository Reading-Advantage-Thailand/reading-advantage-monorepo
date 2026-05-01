import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './objects/LessonOrderByWithRelationInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './objects/LessonWhereInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './objects/LessonWhereUniqueInput.schema';
import { LessonCountAggregateInputObjectSchema as LessonCountAggregateInputObjectSchema } from './objects/LessonCountAggregateInput.schema';
import { LessonMinAggregateInputObjectSchema as LessonMinAggregateInputObjectSchema } from './objects/LessonMinAggregateInput.schema';
import { LessonMaxAggregateInputObjectSchema as LessonMaxAggregateInputObjectSchema } from './objects/LessonMaxAggregateInput.schema';
import { LessonAvgAggregateInputObjectSchema as LessonAvgAggregateInputObjectSchema } from './objects/LessonAvgAggregateInput.schema';
import { LessonSumAggregateInputObjectSchema as LessonSumAggregateInputObjectSchema } from './objects/LessonSumAggregateInput.schema';

export const LessonAggregateSchema: z.ZodType<Prisma.LessonAggregateArgs> = z.object({ orderBy: z.union([LessonOrderByWithRelationInputObjectSchema, LessonOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonWhereInputObjectSchema.optional(), cursor: LessonWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), LessonCountAggregateInputObjectSchema ]).optional(), _min: LessonMinAggregateInputObjectSchema.optional(), _max: LessonMaxAggregateInputObjectSchema.optional(), _avg: LessonAvgAggregateInputObjectSchema.optional(), _sum: LessonSumAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonAggregateArgs>;

export const LessonAggregateZodSchema = z.object({ orderBy: z.union([LessonOrderByWithRelationInputObjectSchema, LessonOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonWhereInputObjectSchema.optional(), cursor: LessonWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), LessonCountAggregateInputObjectSchema ]).optional(), _min: LessonMinAggregateInputObjectSchema.optional(), _max: LessonMaxAggregateInputObjectSchema.optional(), _avg: LessonAvgAggregateInputObjectSchema.optional(), _sum: LessonSumAggregateInputObjectSchema.optional() }).strict();