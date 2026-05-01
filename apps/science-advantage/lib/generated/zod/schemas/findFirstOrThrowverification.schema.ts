import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationOrderByWithRelationInputObjectSchema as verificationOrderByWithRelationInputObjectSchema } from './objects/verificationOrderByWithRelationInput.schema';
import { verificationWhereInputObjectSchema as verificationWhereInputObjectSchema } from './objects/verificationWhereInput.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';
import { VerificationScalarFieldEnumSchema } from './enums/VerificationScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const verificationFindFirstOrThrowSelectSchema: z.ZodType<Prisma.verificationSelect> = z.object({
    id: z.boolean().optional(),
    identifier: z.boolean().optional(),
    value: z.boolean().optional(),
    expiresAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.verificationSelect>;

export const verificationFindFirstOrThrowSelectZodSchema = z.object({
    id: z.boolean().optional(),
    identifier: z.boolean().optional(),
    value: z.boolean().optional(),
    expiresAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional()
  }).strict();

export const verificationFindFirstOrThrowSchema: z.ZodType<Prisma.verificationFindFirstOrThrowArgs> = z.object({ select: verificationFindFirstOrThrowSelectSchema.optional(),  orderBy: z.union([verificationOrderByWithRelationInputObjectSchema, verificationOrderByWithRelationInputObjectSchema.array()]).optional(), where: verificationWhereInputObjectSchema.optional(), cursor: verificationWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.verificationFindFirstOrThrowArgs>;

export const verificationFindFirstOrThrowZodSchema = z.object({ select: verificationFindFirstOrThrowSelectSchema.optional(),  orderBy: z.union([verificationOrderByWithRelationInputObjectSchema, verificationOrderByWithRelationInputObjectSchema.array()]).optional(), where: verificationWhereInputObjectSchema.optional(), cursor: verificationWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array()]).optional() }).strict();