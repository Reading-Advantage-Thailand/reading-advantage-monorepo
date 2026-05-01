import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './objects/StandardSelect.schema';
import { StandardCreateManyInputObjectSchema as StandardCreateManyInputObjectSchema } from './objects/StandardCreateManyInput.schema';

export const StandardCreateManyAndReturnSchema: z.ZodType<Prisma.StandardCreateManyAndReturnArgs> = z.object({ select: StandardSelectObjectSchema.optional(), data: z.union([ StandardCreateManyInputObjectSchema, z.array(StandardCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.StandardCreateManyAndReturnArgs>;

export const StandardCreateManyAndReturnZodSchema = z.object({ select: StandardSelectObjectSchema.optional(), data: z.union([ StandardCreateManyInputObjectSchema, z.array(StandardCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();