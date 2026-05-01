import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionOrderByWithRelationInputObjectSchema as sessionOrderByWithRelationInputObjectSchema } from './objects/sessionOrderByWithRelationInput.schema';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';
import { SessionCountAggregateInputObjectSchema as SessionCountAggregateInputObjectSchema } from './objects/SessionCountAggregateInput.schema';
import { SessionMinAggregateInputObjectSchema as SessionMinAggregateInputObjectSchema } from './objects/SessionMinAggregateInput.schema';
import { SessionMaxAggregateInputObjectSchema as SessionMaxAggregateInputObjectSchema } from './objects/SessionMaxAggregateInput.schema';

export const sessionAggregateSchema: z.ZodType<Prisma.sessionAggregateArgs> = z.object({ orderBy: z.union([sessionOrderByWithRelationInputObjectSchema, sessionOrderByWithRelationInputObjectSchema.array()]).optional(), where: sessionWhereInputObjectSchema.optional(), cursor: sessionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), SessionCountAggregateInputObjectSchema ]).optional(), _min: SessionMinAggregateInputObjectSchema.optional(), _max: SessionMaxAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.sessionAggregateArgs>;

export const sessionAggregateZodSchema = z.object({ orderBy: z.union([sessionOrderByWithRelationInputObjectSchema, sessionOrderByWithRelationInputObjectSchema.array()]).optional(), where: sessionWhereInputObjectSchema.optional(), cursor: sessionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), _count: z.union([ z.literal(true), SessionCountAggregateInputObjectSchema ]).optional(), _min: SessionMinAggregateInputObjectSchema.optional(), _max: SessionMaxAggregateInputObjectSchema.optional() }).strict();