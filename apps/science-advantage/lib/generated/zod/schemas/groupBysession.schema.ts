import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';
import { sessionOrderByWithAggregationInputObjectSchema as sessionOrderByWithAggregationInputObjectSchema } from './objects/sessionOrderByWithAggregationInput.schema';
import { sessionScalarWhereWithAggregatesInputObjectSchema as sessionScalarWhereWithAggregatesInputObjectSchema } from './objects/sessionScalarWhereWithAggregatesInput.schema';
import { SessionScalarFieldEnumSchema } from './enums/SessionScalarFieldEnum.schema';
import { SessionCountAggregateInputObjectSchema as SessionCountAggregateInputObjectSchema } from './objects/SessionCountAggregateInput.schema';
import { SessionMinAggregateInputObjectSchema as SessionMinAggregateInputObjectSchema } from './objects/SessionMinAggregateInput.schema';
import { SessionMaxAggregateInputObjectSchema as SessionMaxAggregateInputObjectSchema } from './objects/SessionMaxAggregateInput.schema';

export const sessionGroupBySchema: z.ZodType<Prisma.sessionGroupByArgs> = z.object({ where: sessionWhereInputObjectSchema.optional(), orderBy: z.union([sessionOrderByWithAggregationInputObjectSchema, sessionOrderByWithAggregationInputObjectSchema.array()]).optional(), having: sessionScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(SessionScalarFieldEnumSchema), _count: z.union([ z.literal(true), SessionCountAggregateInputObjectSchema ]).optional(), _min: SessionMinAggregateInputObjectSchema.optional(), _max: SessionMaxAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.sessionGroupByArgs>;

export const sessionGroupByZodSchema = z.object({ where: sessionWhereInputObjectSchema.optional(), orderBy: z.union([sessionOrderByWithAggregationInputObjectSchema, sessionOrderByWithAggregationInputObjectSchema.array()]).optional(), having: sessionScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(SessionScalarFieldEnumSchema), _count: z.union([ z.literal(true), SessionCountAggregateInputObjectSchema ]).optional(), _min: SessionMinAggregateInputObjectSchema.optional(), _max: SessionMaxAggregateInputObjectSchema.optional() }).strict();