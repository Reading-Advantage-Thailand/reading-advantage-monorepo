import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentOrderByWithRelationInputObjectSchema as AssignmentOrderByWithRelationInputObjectSchema } from './objects/AssignmentOrderByWithRelationInput.schema';
import { AssignmentWhereInputObjectSchema as AssignmentWhereInputObjectSchema } from './objects/AssignmentWhereInput.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './objects/AssignmentWhereUniqueInput.schema';
import { AssignmentCountAggregateInputObjectSchema as AssignmentCountAggregateInputObjectSchema } from './objects/AssignmentCountAggregateInput.schema';

export const AssignmentCountSchema: z.ZodType<Prisma.AssignmentCountArgs> = z.object({ orderBy: z.union([AssignmentOrderByWithRelationInputObjectSchema, AssignmentOrderByWithRelationInputObjectSchema.array()]).optional(), where: AssignmentWhereInputObjectSchema.optional(), cursor: AssignmentWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), AssignmentCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentCountArgs>;

export const AssignmentCountZodSchema = z.object({ orderBy: z.union([AssignmentOrderByWithRelationInputObjectSchema, AssignmentOrderByWithRelationInputObjectSchema.array()]).optional(), where: AssignmentWhereInputObjectSchema.optional(), cursor: AssignmentWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), AssignmentCountAggregateInputObjectSchema ]).optional() }).strict();