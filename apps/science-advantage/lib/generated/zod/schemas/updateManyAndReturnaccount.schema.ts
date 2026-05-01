import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountUpdateManyMutationInputObjectSchema as accountUpdateManyMutationInputObjectSchema } from './objects/accountUpdateManyMutationInput.schema';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';

export const accountUpdateManyAndReturnSchema: z.ZodType<Prisma.accountUpdateManyAndReturnArgs> = z.object({ select: accountSelectObjectSchema.optional(), data: accountUpdateManyMutationInputObjectSchema, where: accountWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.accountUpdateManyAndReturnArgs>;

export const accountUpdateManyAndReturnZodSchema = z.object({ select: accountSelectObjectSchema.optional(), data: accountUpdateManyMutationInputObjectSchema, where: accountWhereInputObjectSchema.optional() }).strict();