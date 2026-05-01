import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionCreateManyInputObjectSchema as sessionCreateManyInputObjectSchema } from './objects/sessionCreateManyInput.schema';

export const sessionCreateManySchema: z.ZodType<Prisma.sessionCreateManyArgs> = z.object({ data: z.union([ sessionCreateManyInputObjectSchema, z.array(sessionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.sessionCreateManyArgs>;

export const sessionCreateManyZodSchema = z.object({ data: z.union([ sessionCreateManyInputObjectSchema, z.array(sessionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();