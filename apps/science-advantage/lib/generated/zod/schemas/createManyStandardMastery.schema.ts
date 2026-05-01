import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasteryCreateManyInputObjectSchema as StandardMasteryCreateManyInputObjectSchema } from './objects/StandardMasteryCreateManyInput.schema';

export const StandardMasteryCreateManySchema: z.ZodType<Prisma.StandardMasteryCreateManyArgs> = z.object({ data: z.union([ StandardMasteryCreateManyInputObjectSchema, z.array(StandardMasteryCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryCreateManyArgs>;

export const StandardMasteryCreateManyZodSchema = z.object({ data: z.union([ StandardMasteryCreateManyInputObjectSchema, z.array(StandardMasteryCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();