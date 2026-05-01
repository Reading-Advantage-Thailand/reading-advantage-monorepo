import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './objects/accountInclude.schema';
import { accountUpdateInputObjectSchema as accountUpdateInputObjectSchema } from './objects/accountUpdateInput.schema';
import { accountUncheckedUpdateInputObjectSchema as accountUncheckedUpdateInputObjectSchema } from './objects/accountUncheckedUpdateInput.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';

export const accountUpdateOneSchema: z.ZodType<Prisma.accountUpdateArgs> = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), data: z.union([accountUpdateInputObjectSchema, accountUncheckedUpdateInputObjectSchema]), where: accountWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.accountUpdateArgs>;

export const accountUpdateOneZodSchema = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), data: z.union([accountUpdateInputObjectSchema, accountUncheckedUpdateInputObjectSchema]), where: accountWhereUniqueInputObjectSchema }).strict();