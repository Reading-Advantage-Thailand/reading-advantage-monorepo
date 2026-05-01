import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardCreateManyInputObjectSchema as StandardCreateManyInputObjectSchema } from './objects/StandardCreateManyInput.schema';

export const StandardCreateManySchema: z.ZodType<Prisma.StandardCreateManyArgs> = z.object({ data: z.union([ StandardCreateManyInputObjectSchema, z.array(StandardCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.StandardCreateManyArgs>;

export const StandardCreateManyZodSchema = z.object({ data: z.union([ StandardCreateManyInputObjectSchema, z.array(StandardCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();