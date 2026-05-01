import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountOrderByWithRelationInputObjectSchema as accountOrderByWithRelationInputObjectSchema } from './objects/accountOrderByWithRelationInput.schema';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';
import { AccountCountAggregateInputObjectSchema as AccountCountAggregateInputObjectSchema } from './objects/AccountCountAggregateInput.schema';
import { AccountMinAggregateInputObjectSchema as AccountMinAggregateInputObjectSchema } from './objects/AccountMinAggregateInput.schema';
import { AccountMaxAggregateInputObjectSchema as AccountMaxAggregateInputObjectSchema } from './objects/AccountMaxAggregateInput.schema';

export const accountAggregateSchema: z.ZodType<Prisma.accountAggregateArgs> = z.object({ orderBy: z.union([accountOrderByWithRelationInputObjectSchema, accountOrderByWithRelationInputObjectSchema.array()]).optional(), where: accountWhereInputObjectSchema.optional(), cursor: accountWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), AccountCountAggregateInputObjectSchema ]).optional(), _min: AccountMinAggregateInputObjectSchema.optional(), _max: AccountMaxAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.accountAggregateArgs>;

export const accountAggregateZodSchema = z.object({ orderBy: z.union([accountOrderByWithRelationInputObjectSchema, accountOrderByWithRelationInputObjectSchema.array()]).optional(), where: accountWhereInputObjectSchema.optional(), cursor: accountWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), AccountCountAggregateInputObjectSchema ]).optional(), _min: AccountMinAggregateInputObjectSchema.optional(), _max: AccountMaxAggregateInputObjectSchema.optional() }).strict();