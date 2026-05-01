import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationOrderByWithRelationInputObjectSchema as verificationOrderByWithRelationInputObjectSchema } from './objects/verificationOrderByWithRelationInput.schema';
import { verificationWhereInputObjectSchema as verificationWhereInputObjectSchema } from './objects/verificationWhereInput.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';
import { VerificationScalarFieldEnumSchema } from './enums/VerificationScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const verificationFindFirstSelectSchema: z.ZodType<Prisma.verificationSelect> = z.object({
    id: z.boolean().optional(),
    identifier: z.boolean().optional(),
    value: z.boolean().optional(),
    expiresAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.verificationSelect>;

export const verificationFindFirstSelectZodSchema = z.object({
    id: z.boolean().optional(),
    identifier: z.boolean().optional(),
    value: z.boolean().optional(),
    expiresAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional()
  }).strict();

export const verificationFindFirstSchema: z.ZodType<Prisma.verificationFindFirstArgs> = z.object({ select: verificationFindFirstSelectSchema.optional(),  orderBy: z.union([verificationOrderByWithRelationInputObjectSchema, verificationOrderByWithRelationInputObjectSchema.array()]).optional(), where: verificationWhereInputObjectSchema.optional(), cursor: verificationWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.verificationFindFirstArgs>;

export const verificationFindFirstZodSchema = z.object({ select: verificationFindFirstSelectSchema.optional(),  orderBy: z.union([verificationOrderByWithRelationInputObjectSchema, verificationOrderByWithRelationInputObjectSchema.array()]).optional(), where: verificationWhereInputObjectSchema.optional(), cursor: verificationWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array()]).optional() }).strict();