import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassOrderByWithRelationInputObjectSchema as ClassOrderByWithRelationInputObjectSchema } from './objects/ClassOrderByWithRelationInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';
import { ClassCountAggregateInputObjectSchema as ClassCountAggregateInputObjectSchema } from './objects/ClassCountAggregateInput.schema';

export const ClassCountSchema: z.ZodType<Prisma.ClassCountArgs> = z.object({ orderBy: z.union([ClassOrderByWithRelationInputObjectSchema, ClassOrderByWithRelationInputObjectSchema.array()]).optional(), where: ClassWhereInputObjectSchema.optional(), cursor: ClassWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), ClassCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.ClassCountArgs>;

export const ClassCountZodSchema = z.object({ orderBy: z.union([ClassOrderByWithRelationInputObjectSchema, ClassOrderByWithRelationInputObjectSchema.array()]).optional(), where: ClassWhereInputObjectSchema.optional(), cursor: ClassWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), ClassCountAggregateInputObjectSchema ]).optional() }).strict();