import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './objects/accountInclude.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';

export const accountDeleteOneSchema: z.ZodType<Prisma.accountDeleteArgs> = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), where: accountWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.accountDeleteArgs>;

export const accountDeleteOneZodSchema = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), where: accountWhereUniqueInputObjectSchema }).strict();