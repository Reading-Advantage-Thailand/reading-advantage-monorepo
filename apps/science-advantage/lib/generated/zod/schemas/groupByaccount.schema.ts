import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';
import { accountOrderByWithAggregationInputObjectSchema as accountOrderByWithAggregationInputObjectSchema } from './objects/accountOrderByWithAggregationInput.schema';
import { accountScalarWhereWithAggregatesInputObjectSchema as accountScalarWhereWithAggregatesInputObjectSchema } from './objects/accountScalarWhereWithAggregatesInput.schema';
import { AccountScalarFieldEnumSchema } from './enums/AccountScalarFieldEnum.schema';
import { AccountCountAggregateInputObjectSchema as AccountCountAggregateInputObjectSchema } from './objects/AccountCountAggregateInput.schema';
import { AccountMinAggregateInputObjectSchema as AccountMinAggregateInputObjectSchema } from './objects/AccountMinAggregateInput.schema';
import { AccountMaxAggregateInputObjectSchema as AccountMaxAggregateInputObjectSchema } from './objects/AccountMaxAggregateInput.schema';

export const accountGroupBySchema: z.ZodType<Prisma.accountGroupByArgs> = z.object({ where: accountWhereInputObjectSchema.optional(), orderBy: z.union([accountOrderByWithAggregationInputObjectSchema, accountOrderByWithAggregationInputObjectSchema.array()]).optional(), having: accountScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(AccountScalarFieldEnumSchema), _count: z.union([ z.literal(true), AccountCountAggregateInputObjectSchema ]).optional(), _min: AccountMinAggregateInputObjectSchema.optional(), _max: AccountMaxAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.accountGroupByArgs>;

export const accountGroupByZodSchema = z.object({ where: accountWhereInputObjectSchema.optional(), orderBy: z.union([accountOrderByWithAggregationInputObjectSchema, accountOrderByWithAggregationInputObjectSchema.array()]).optional(), having: accountScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(AccountScalarFieldEnumSchema), _count: z.union([ z.literal(true), AccountCountAggregateInputObjectSchema ]).optional(), _min: AccountMinAggregateInputObjectSchema.optional(), _max: AccountMaxAggregateInputObjectSchema.optional() }).strict();