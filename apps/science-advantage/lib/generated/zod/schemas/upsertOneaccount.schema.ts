import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './objects/accountInclude.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';
import { accountCreateInputObjectSchema as accountCreateInputObjectSchema } from './objects/accountCreateInput.schema';
import { accountUncheckedCreateInputObjectSchema as accountUncheckedCreateInputObjectSchema } from './objects/accountUncheckedCreateInput.schema';
import { accountUpdateInputObjectSchema as accountUpdateInputObjectSchema } from './objects/accountUpdateInput.schema';
import { accountUncheckedUpdateInputObjectSchema as accountUncheckedUpdateInputObjectSchema } from './objects/accountUncheckedUpdateInput.schema';

export const accountUpsertOneSchema: z.ZodType<Prisma.accountUpsertArgs> = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), where: accountWhereUniqueInputObjectSchema, create: z.union([ accountCreateInputObjectSchema, accountUncheckedCreateInputObjectSchema ]), update: z.union([ accountUpdateInputObjectSchema, accountUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.accountUpsertArgs>;

export const accountUpsertOneZodSchema = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), where: accountWhereUniqueInputObjectSchema, create: z.union([ accountCreateInputObjectSchema, accountUncheckedCreateInputObjectSchema ]), update: z.union([ accountUpdateInputObjectSchema, accountUncheckedUpdateInputObjectSchema ]) }).strict();