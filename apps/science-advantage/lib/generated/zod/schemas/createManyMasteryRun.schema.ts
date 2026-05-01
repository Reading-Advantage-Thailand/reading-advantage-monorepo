import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunCreateManyInputObjectSchema as MasteryRunCreateManyInputObjectSchema } from './objects/MasteryRunCreateManyInput.schema';

export const MasteryRunCreateManySchema: z.ZodType<Prisma.MasteryRunCreateManyArgs> = z.object({ data: z.union([ MasteryRunCreateManyInputObjectSchema, z.array(MasteryRunCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunCreateManyArgs>;

export const MasteryRunCreateManyZodSchema = z.object({ data: z.union([ MasteryRunCreateManyInputObjectSchema, z.array(MasteryRunCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();