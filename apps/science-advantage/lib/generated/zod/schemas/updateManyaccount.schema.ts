import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountUpdateManyMutationInputObjectSchema as accountUpdateManyMutationInputObjectSchema } from './objects/accountUpdateManyMutationInput.schema';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';

export const accountUpdateManySchema: z.ZodType<Prisma.accountUpdateManyArgs> = z.object({ data: accountUpdateManyMutationInputObjectSchema, where: accountWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.accountUpdateManyArgs>;

export const accountUpdateManyZodSchema = z.object({ data: accountUpdateManyMutationInputObjectSchema, where: accountWhereInputObjectSchema.optional() }).strict();