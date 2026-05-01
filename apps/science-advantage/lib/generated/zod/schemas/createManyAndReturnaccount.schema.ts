import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountCreateManyInputObjectSchema as accountCreateManyInputObjectSchema } from './objects/accountCreateManyInput.schema';

export const accountCreateManyAndReturnSchema: z.ZodType<Prisma.accountCreateManyAndReturnArgs> = z.object({ select: accountSelectObjectSchema.optional(), data: z.union([ accountCreateManyInputObjectSchema, z.array(accountCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.accountCreateManyAndReturnArgs>;

export const accountCreateManyAndReturnZodSchema = z.object({ select: accountSelectObjectSchema.optional(), data: z.union([ accountCreateManyInputObjectSchema, z.array(accountCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();