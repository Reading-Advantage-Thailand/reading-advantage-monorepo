import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionOrderByWithRelationInputObjectSchema as QuizQuestionOrderByWithRelationInputObjectSchema } from './objects/QuizQuestionOrderByWithRelationInput.schema';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './objects/QuizQuestionWhereInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionCountAggregateInputObjectSchema as QuizQuestionCountAggregateInputObjectSchema } from './objects/QuizQuestionCountAggregateInput.schema';

export const QuizQuestionCountSchema: z.ZodType<Prisma.QuizQuestionCountArgs> = z.object({ orderBy: z.union([QuizQuestionOrderByWithRelationInputObjectSchema, QuizQuestionOrderByWithRelationInputObjectSchema.array()]).optional(), where: QuizQuestionWhereInputObjectSchema.optional(), cursor: QuizQuestionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), QuizQuestionCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionCountArgs>;

export const QuizQuestionCountZodSchema = z.object({ orderBy: z.union([QuizQuestionOrderByWithRelationInputObjectSchema, QuizQuestionOrderByWithRelationInputObjectSchema.array()]).optional(), where: QuizQuestionWhereInputObjectSchema.optional(), cursor: QuizQuestionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), QuizQuestionCountAggregateInputObjectSchema ]).optional() }).strict();