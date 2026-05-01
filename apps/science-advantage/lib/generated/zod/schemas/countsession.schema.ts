import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionOrderByWithRelationInputObjectSchema as sessionOrderByWithRelationInputObjectSchema } from './objects/sessionOrderByWithRelationInput.schema';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';
import { SessionCountAggregateInputObjectSchema as SessionCountAggregateInputObjectSchema } from './objects/SessionCountAggregateInput.schema';

export const sessionCountSchema: z.ZodType<Prisma.sessionCountArgs> = z.object({ orderBy: z.union([sessionOrderByWithRelationInputObjectSchema, sessionOrderByWithRelationInputObjectSchema.array()]).optional(), where: sessionWhereInputObjectSchema.optional(), cursor: sessionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), SessionCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.sessionCountArgs>;

export const sessionCountZodSchema = z.object({ orderBy: z.union([sessionOrderByWithRelationInputObjectSchema, sessionOrderByWithRelationInputObjectSchema.array()]).optional(), where: sessionWhereInputObjectSchema.optional(), cursor: sessionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), SessionCountAggregateInputObjectSchema ]).optional() }).strict();