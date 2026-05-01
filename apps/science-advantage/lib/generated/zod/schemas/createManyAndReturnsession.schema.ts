import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionCreateManyInputObjectSchema as sessionCreateManyInputObjectSchema } from './objects/sessionCreateManyInput.schema';

export const sessionCreateManyAndReturnSchema: z.ZodType<Prisma.sessionCreateManyAndReturnArgs> = z.object({ select: sessionSelectObjectSchema.optional(), data: z.union([ sessionCreateManyInputObjectSchema, z.array(sessionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.sessionCreateManyAndReturnArgs>;

export const sessionCreateManyAndReturnZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), data: z.union([ sessionCreateManyInputObjectSchema, z.array(sessionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();