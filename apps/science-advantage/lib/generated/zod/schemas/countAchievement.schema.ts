import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementOrderByWithRelationInputObjectSchema as AchievementOrderByWithRelationInputObjectSchema } from './objects/AchievementOrderByWithRelationInput.schema';
import { AchievementWhereInputObjectSchema as AchievementWhereInputObjectSchema } from './objects/AchievementWhereInput.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './objects/AchievementWhereUniqueInput.schema';
import { AchievementCountAggregateInputObjectSchema as AchievementCountAggregateInputObjectSchema } from './objects/AchievementCountAggregateInput.schema';

export const AchievementCountSchema: z.ZodType<Prisma.AchievementCountArgs> = z.object({ orderBy: z.union([AchievementOrderByWithRelationInputObjectSchema, AchievementOrderByWithRelationInputObjectSchema.array()]).optional(), where: AchievementWhereInputObjectSchema.optional(), cursor: AchievementWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), AchievementCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.AchievementCountArgs>;

export const AchievementCountZodSchema = z.object({ orderBy: z.union([AchievementOrderByWithRelationInputObjectSchema, AchievementOrderByWithRelationInputObjectSchema.array()]).optional(), where: AchievementWhereInputObjectSchema.optional(), cursor: AchievementWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), AchievementCountAggregateInputObjectSchema ]).optional() }).strict();