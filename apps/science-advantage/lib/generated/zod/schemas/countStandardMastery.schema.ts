import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasteryOrderByWithRelationInputObjectSchema as StandardMasteryOrderByWithRelationInputObjectSchema } from './objects/StandardMasteryOrderByWithRelationInput.schema';
import { StandardMasteryWhereInputObjectSchema as StandardMasteryWhereInputObjectSchema } from './objects/StandardMasteryWhereInput.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './objects/StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryCountAggregateInputObjectSchema as StandardMasteryCountAggregateInputObjectSchema } from './objects/StandardMasteryCountAggregateInput.schema';

export const StandardMasteryCountSchema: z.ZodType<Prisma.StandardMasteryCountArgs> = z.object({ orderBy: z.union([StandardMasteryOrderByWithRelationInputObjectSchema, StandardMasteryOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardMasteryWhereInputObjectSchema.optional(), cursor: StandardMasteryWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), StandardMasteryCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryCountArgs>;

export const StandardMasteryCountZodSchema = z.object({ orderBy: z.union([StandardMasteryOrderByWithRelationInputObjectSchema, StandardMasteryOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardMasteryWhereInputObjectSchema.optional(), cursor: StandardMasteryWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), StandardMasteryCountAggregateInputObjectSchema ]).optional() }).strict();