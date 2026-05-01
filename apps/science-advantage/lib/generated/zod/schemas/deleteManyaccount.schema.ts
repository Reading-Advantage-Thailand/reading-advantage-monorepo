import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './objects/accountWhereInput.schema';

export const accountDeleteManySchema: z.ZodType<Prisma.accountDeleteManyArgs> = z.object({ where: accountWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.accountDeleteManyArgs>;

export const accountDeleteManyZodSchema = z.object({ where: accountWhereInputObjectSchema.optional() }).strict();