import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassCreateManyInputObjectSchema as ClassCreateManyInputObjectSchema } from './objects/ClassCreateManyInput.schema';

export const ClassCreateManySchema: z.ZodType<Prisma.ClassCreateManyArgs> = z.object({ data: z.union([ ClassCreateManyInputObjectSchema, z.array(ClassCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.ClassCreateManyArgs>;

export const ClassCreateManyZodSchema = z.object({ data: z.union([ ClassCreateManyInputObjectSchema, z.array(ClassCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();