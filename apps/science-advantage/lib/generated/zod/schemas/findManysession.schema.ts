import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './objects/sessionInclude.schema';
import { sessionOrderByWithRelationInputObjectSchema as sessionOrderByWithRelationInputObjectSchema } from './objects/sessionOrderByWithRelationInput.schema';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';
import { SessionScalarFieldEnumSchema } from './enums/SessionScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const sessionFindManySelectSchema: z.ZodType<Prisma.sessionSelect> = z.object({
    id: z.boolean().optional(),
    expiresAt: z.boolean().optional(),
    token: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    ipAddress: z.boolean().optional(),
    userAgent: z.boolean().optional(),
    userId: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.sessionSelect>;

export const sessionFindManySelectZodSchema = z.object({
    id: z.boolean().optional(),
    expiresAt: z.boolean().optional(),
    token: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    ipAddress: z.boolean().optional(),
    userAgent: z.boolean().optional(),
    userId: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict();

export const sessionFindManySchema: z.ZodType<Prisma.sessionFindManyArgs> = z.object({ select: sessionFindManySelectSchema.optional(), include: sessionIncludeObjectSchema.optional(), orderBy: z.union([sessionOrderByWithRelationInputObjectSchema, sessionOrderByWithRelationInputObjectSchema.array()]).optional(), where: sessionWhereInputObjectSchema.optional(), cursor: sessionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([SessionScalarFieldEnumSchema, SessionScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.sessionFindManyArgs>;

export const sessionFindManyZodSchema = z.object({ select: sessionFindManySelectSchema.optional(), include: sessionIncludeObjectSchema.optional(), orderBy: z.union([sessionOrderByWithRelationInputObjectSchema, sessionOrderByWithRelationInputObjectSchema.array()]).optional(), where: sessionWhereInputObjectSchema.optional(), cursor: sessionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([SessionScalarFieldEnumSchema, SessionScalarFieldEnumSchema.array()]).optional() }).strict();