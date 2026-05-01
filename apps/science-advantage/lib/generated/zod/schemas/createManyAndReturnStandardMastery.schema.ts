import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './objects/StandardMasterySelect.schema';
import { StandardMasteryCreateManyInputObjectSchema as StandardMasteryCreateManyInputObjectSchema } from './objects/StandardMasteryCreateManyInput.schema';

export const StandardMasteryCreateManyAndReturnSchema: z.ZodType<Prisma.StandardMasteryCreateManyAndReturnArgs> = z.object({ select: StandardMasterySelectObjectSchema.optional(), data: z.union([ StandardMasteryCreateManyInputObjectSchema, z.array(StandardMasteryCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryCreateManyAndReturnArgs>;

export const StandardMasteryCreateManyAndReturnZodSchema = z.object({ select: StandardMasterySelectObjectSchema.optional(), data: z.union([ StandardMasteryCreateManyInputObjectSchema, z.array(StandardMasteryCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();