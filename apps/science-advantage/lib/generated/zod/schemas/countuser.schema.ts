import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './objects/userOrderByWithRelationInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './objects/userWhereUniqueInput.schema';
import { UserCountAggregateInputObjectSchema as UserCountAggregateInputObjectSchema } from './objects/UserCountAggregateInput.schema';

export const userCountSchema: z.ZodType<Prisma.userCountArgs> = z.object({ orderBy: z.union([userOrderByWithRelationInputObjectSchema, userOrderByWithRelationInputObjectSchema.array()]).optional(), where: userWhereInputObjectSchema.optional(), cursor: userWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.userCountArgs>;

export const userCountZodSchema = z.object({ orderBy: z.union([userOrderByWithRelationInputObjectSchema, userOrderByWithRelationInputObjectSchema.array()]).optional(), where: userWhereInputObjectSchema.optional(), cursor: userWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ]).optional() }).strict();