import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './objects/LessonOrderByWithRelationInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './objects/LessonWhereInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './objects/LessonWhereUniqueInput.schema';
import { LessonCountAggregateInputObjectSchema as LessonCountAggregateInputObjectSchema } from './objects/LessonCountAggregateInput.schema';

export const LessonCountSchema: z.ZodType<Prisma.LessonCountArgs> = z.object({ orderBy: z.union([LessonOrderByWithRelationInputObjectSchema, LessonOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonWhereInputObjectSchema.optional(), cursor: LessonWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), LessonCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.LessonCountArgs>;

export const LessonCountZodSchema = z.object({ orderBy: z.union([LessonOrderByWithRelationInputObjectSchema, LessonOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonWhereInputObjectSchema.optional(), cursor: LessonWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), LessonCountAggregateInputObjectSchema ]).optional() }).strict();