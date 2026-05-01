import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountOrderByWithRelationInputObjectSchema as accountOrderByWithRelationInputObjectSchema } from './objects/accountOrderByWithRelationInput.schema';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';
import { AccountCountAggregateInputObjectSchema as AccountCountAggregateInputObjectSchema } from './objects/AccountCountAggregateInput.schema';

export const accountCountSchema: z.ZodType<Prisma.accountCountArgs> = z.object({ orderBy: z.union([accountOrderByWithRelationInputObjectSchema, accountOrderByWithRelationInputObjectSchema.array()]).optional(), where: accountWhereInputObjectSchema.optional(), cursor: accountWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), AccountCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.accountCountArgs>;

export const accountCountZodSchema = z.object({ orderBy: z.union([accountOrderByWithRelationInputObjectSchema, accountOrderByWithRelationInputObjectSchema.array()]).optional(), where: accountWhereInputObjectSchema.optional(), cursor: accountWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), AccountCountAggregateInputObjectSchema ]).optional() }).strict();