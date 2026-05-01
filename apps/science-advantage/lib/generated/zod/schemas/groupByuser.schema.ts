import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';
import { userOrderByWithAggregationInputObjectSchema as userOrderByWithAggregationInputObjectSchema } from './objects/userOrderByWithAggregationInput.schema';
import { userScalarWhereWithAggregatesInputObjectSchema as userScalarWhereWithAggregatesInputObjectSchema } from './objects/userScalarWhereWithAggregatesInput.schema';
import { UserScalarFieldEnumSchema } from './enums/UserScalarFieldEnum.schema';
import { UserCountAggregateInputObjectSchema as UserCountAggregateInputObjectSchema } from './objects/UserCountAggregateInput.schema';
import { UserMinAggregateInputObjectSchema as UserMinAggregateInputObjectSchema } from './objects/UserMinAggregateInput.schema';
import { UserMaxAggregateInputObjectSchema as UserMaxAggregateInputObjectSchema } from './objects/UserMaxAggregateInput.schema';
import { UserAvgAggregateInputObjectSchema as UserAvgAggregateInputObjectSchema } from './objects/UserAvgAggregateInput.schema';
import { UserSumAggregateInputObjectSchema as UserSumAggregateInputObjectSchema } from './objects/UserSumAggregateInput.schema';

export const userGroupBySchema: z.ZodType<Prisma.userGroupByArgs> = z.object({ where: userWhereInputObjectSchema.optional(), orderBy: z.union([userOrderByWithAggregationInputObjectSchema, userOrderByWithAggregationInputObjectSchema.array()]).optional(), having: userScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(UserScalarFieldEnumSchema), _count: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ]).optional(), _min: UserMinAggregateInputObjectSchema.optional(), _max: UserMaxAggregateInputObjectSchema.optional(), _avg: UserAvgAggregateInputObjectSchema.optional(), _sum: UserSumAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.userGroupByArgs>;

export const userGroupByZodSchema = z.object({ where: userWhereInputObjectSchema.optional(), orderBy: z.union([userOrderByWithAggregationInputObjectSchema, userOrderByWithAggregationInputObjectSchema.array()]).optional(), having: userScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(UserScalarFieldEnumSchema), _count: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ]).optional(), _min: UserMinAggregateInputObjectSchema.optional(), _max: UserMaxAggregateInputObjectSchema.optional(), _avg: UserAvgAggregateInputObjectSchema.optional(), _sum: UserSumAggregateInputObjectSchema.optional() }).strict();