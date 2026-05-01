import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './objects/userOrderByWithRelationInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './objects/userWhereUniqueInput.schema';
import { UserCountAggregateInputObjectSchema as UserCountAggregateInputObjectSchema } from './objects/UserCountAggregateInput.schema';
import { UserMinAggregateInputObjectSchema as UserMinAggregateInputObjectSchema } from './objects/UserMinAggregateInput.schema';
import { UserMaxAggregateInputObjectSchema as UserMaxAggregateInputObjectSchema } from './objects/UserMaxAggregateInput.schema';
import { UserAvgAggregateInputObjectSchema as UserAvgAggregateInputObjectSchema } from './objects/UserAvgAggregateInput.schema';
import { UserSumAggregateInputObjectSchema as UserSumAggregateInputObjectSchema } from './objects/UserSumAggregateInput.schema';

export const userAggregateSchema: z.ZodType<Prisma.userAggregateArgs> = z.object({ orderBy: z.union([userOrderByWithRelationInputObjectSchema, userOrderByWithRelationInputObjectSchema.array()]).optional(), where: userWhereInputObjectSchema.optional(), cursor: userWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ]).optional(), _min: UserMinAggregateInputObjectSchema.optional(), _max: UserMaxAggregateInputObjectSchema.optional(), _avg: UserAvgAggregateInputObjectSchema.optional(), _sum: UserSumAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.userAggregateArgs>;

export const userAggregateZodSchema = z.object({ orderBy: z.union([userOrderByWithRelationInputObjectSchema, userOrderByWithRelationInputObjectSchema.array()]).optional(), where: userWhereInputObjectSchema.optional(), cursor: userWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ]).optional(), _min: UserMinAggregateInputObjectSchema.optional(), _max: UserMaxAggregateInputObjectSchema.optional(), _avg: UserAvgAggregateInputObjectSchema.optional(), _sum: UserSumAggregateInputObjectSchema.optional() }).strict();