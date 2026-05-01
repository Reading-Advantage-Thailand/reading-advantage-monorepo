import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './objects/accountInclude.schema';
import { accountCreateInputObjectSchema as accountCreateInputObjectSchema } from './objects/accountCreateInput.schema';
import { accountUncheckedCreateInputObjectSchema as accountUncheckedCreateInputObjectSchema } from './objects/accountUncheckedCreateInput.schema';

export const accountCreateOneSchema: z.ZodType<Prisma.accountCreateArgs> = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), data: z.union([accountCreateInputObjectSchema, accountUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.accountCreateArgs>;

export const accountCreateOneZodSchema = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), data: z.union([accountCreateInputObjectSchema, accountUncheckedCreateInputObjectSchema]) }).strict();