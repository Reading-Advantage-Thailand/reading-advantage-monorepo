import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationOrderByWithRelationInputObjectSchema as verificationOrderByWithRelationInputObjectSchema } from './objects/verificationOrderByWithRelationInput.schema';
import { verificationWhereInputObjectSchema as verificationWhereInputObjectSchema } from './objects/verificationWhereInput.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';
import { VerificationCountAggregateInputObjectSchema as VerificationCountAggregateInputObjectSchema } from './objects/VerificationCountAggregateInput.schema';

export const verificationCountSchema: z.ZodType<Prisma.verificationCountArgs> = z.object({ orderBy: z.union([verificationOrderByWithRelationInputObjectSchema, verificationOrderByWithRelationInputObjectSchema.array()]).optional(), where: verificationWhereInputObjectSchema.optional(), cursor: verificationWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), VerificationCountAggregateInputObjectSchema ]).optional() }).strict() as unknown as z.ZodType<Prisma.verificationCountArgs>;

export const verificationCountZodSchema = z.object({ orderBy: z.union([verificationOrderByWithRelationInputObjectSchema, verificationOrderByWithRelationInputObjectSchema.array()]).optional(), where: verificationWhereInputObjectSchema.optional(), cursor: verificationWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), VerificationCountAggregateInputObjectSchema ]).optional() }).strict();