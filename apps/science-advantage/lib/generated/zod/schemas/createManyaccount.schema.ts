import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountCreateManyInputObjectSchema as accountCreateManyInputObjectSchema } from './objects/accountCreateManyInput.schema';

export const accountCreateManySchema: z.ZodType<Prisma.accountCreateManyArgs> = z.object({ data: z.union([ accountCreateManyInputObjectSchema, z.array(accountCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.accountCreateManyArgs>;

export const accountCreateManyZodSchema = z.object({ data: z.union([ accountCreateManyInputObjectSchema, z.array(accountCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();