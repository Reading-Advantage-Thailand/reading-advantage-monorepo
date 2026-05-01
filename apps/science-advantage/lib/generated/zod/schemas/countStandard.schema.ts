import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardOrderByWithRelationInputObjectSchema as StandardOrderByWithRelationInputObjectSchema } from './objects/StandardOrderByWithRelationInput.schema';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './objects/StandardWhereInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './objects/StandardWhereUniqueInput.schema';
import { StandardCountAggregateInputObjectSchema as StandardCountAggregateInputObjectSchema } from './objects/StandardCountAggregateInput.schema';

export const StandardCountSchema: z.ZodType<Prisma.StandardCountArgs> = z.object({ orderBy: z.union([StandardOrderByWithRelationInputObjectSchema, StandardOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardWhereInputObjectSchema.optional(), cursor: StandardWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), StandardCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.StandardCountArgs>;

export const StandardCountZodSchema = z.object({ orderBy: z.union([StandardOrderByWithRelationInputObjectSchema, StandardOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardWhereInputObjectSchema.optional(), cursor: StandardWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), StandardCountAggregateInputObjectSchema ]).optional() }).strict();