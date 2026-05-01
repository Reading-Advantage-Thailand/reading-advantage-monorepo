import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunOrderByWithRelationInputObjectSchema as MasteryRunOrderByWithRelationInputObjectSchema } from './objects/MasteryRunOrderByWithRelationInput.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './objects/MasteryRunWhereInput.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';
import { MasteryRunCountAggregateInputObjectSchema as MasteryRunCountAggregateInputObjectSchema } from './objects/MasteryRunCountAggregateInput.schema';

export const MasteryRunCountSchema: z.ZodType<Prisma.MasteryRunCountArgs> = z.object({ orderBy: z.union([MasteryRunOrderByWithRelationInputObjectSchema, MasteryRunOrderByWithRelationInputObjectSchema.array()]).optional(), where: MasteryRunWhereInputObjectSchema.optional(), cursor: MasteryRunWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), MasteryRunCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunCountArgs>;

export const MasteryRunCountZodSchema = z.object({ orderBy: z.union([MasteryRunOrderByWithRelationInputObjectSchema, MasteryRunOrderByWithRelationInputObjectSchema.array()]).optional(), where: MasteryRunWhereInputObjectSchema.optional(), cursor: MasteryRunWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), MasteryRunCountAggregateInputObjectSchema ]).optional() }).strict();