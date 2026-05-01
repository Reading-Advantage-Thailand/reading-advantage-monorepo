import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunCreateManyInputObjectSchema as MasteryRunCreateManyInputObjectSchema } from './objects/MasteryRunCreateManyInput.schema';

export const MasteryRunCreateManyAndReturnSchema: z.ZodType<Prisma.MasteryRunCreateManyAndReturnArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), data: z.union([ MasteryRunCreateManyInputObjectSchema, z.array(MasteryRunCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunCreateManyAndReturnArgs>;

export const MasteryRunCreateManyAndReturnZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), data: z.union([ MasteryRunCreateManyInputObjectSchema, z.array(MasteryRunCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();