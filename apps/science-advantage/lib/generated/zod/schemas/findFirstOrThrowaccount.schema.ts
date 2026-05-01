import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './objects/accountInclude.schema';
import { accountOrderByWithRelationInputObjectSchema as accountOrderByWithRelationInputObjectSchema } from './objects/accountOrderByWithRelationInput.schema';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';
import { AccountScalarFieldEnumSchema } from './enums/AccountScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const accountFindFirstOrThrowSelectSchema: z.ZodType<Prisma.accountSelect> = z.object({
    id: z.boolean().optional(),
    accountId: z.boolean().optional(),
    providerId: z.boolean().optional(),
    userId: z.boolean().optional(),
    accessToken: z.boolean().optional(),
    refreshToken: z.boolean().optional(),
    idToken: z.boolean().optional(),
    accessTokenExpiresAt: z.boolean().optional(),
    refreshTokenExpiresAt: z.boolean().optional(),
    scope: z.boolean().optional(),
    password: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.accountSelect>;

export const accountFindFirstOrThrowSelectZodSchema = z.object({
    id: z.boolean().optional(),
    accountId: z.boolean().optional(),
    providerId: z.boolean().optional(),
    userId: z.boolean().optional(),
    accessToken: z.boolean().optional(),
    refreshToken: z.boolean().optional(),
    idToken: z.boolean().optional(),
    accessTokenExpiresAt: z.boolean().optional(),
    refreshTokenExpiresAt: z.boolean().optional(),
    scope: z.boolean().optional(),
    password: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict();

export const accountFindFirstOrThrowSchema: z.ZodType<Prisma.accountFindFirstOrThrowArgs> = z.object({ select: accountFindFirstOrThrowSelectSchema.optional(), include: accountIncludeObjectSchema.optional(), orderBy: z.union([accountOrderByWithRelationInputObjectSchema, accountOrderByWithRelationInputObjectSchema.array()]).optional(), where: accountWhereInputObjectSchema.optional(), cursor: accountWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AccountScalarFieldEnumSchema, AccountScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.accountFindFirstOrThrowArgs>;

export const accountFindFirstOrThrowZodSchema = z.object({ select: accountFindFirstOrThrowSelectSchema.optional(), include: accountIncludeObjectSchema.optional(), orderBy: z.union([accountOrderByWithRelationInputObjectSchema, accountOrderByWithRelationInputObjectSchema.array()]).optional(), where: accountWhereInputObjectSchema.optional(), cursor: accountWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AccountScalarFieldEnumSchema, AccountScalarFieldEnumSchema.array()]).optional() }).strict();