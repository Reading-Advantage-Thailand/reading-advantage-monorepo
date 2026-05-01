import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassCreateManyInputObjectSchema as ClassCreateManyInputObjectSchema } from './objects/ClassCreateManyInput.schema';

export const ClassCreateManyAndReturnSchema: z.ZodType<Prisma.ClassCreateManyAndReturnArgs> = z.object({ select: ClassSelectObjectSchema.optional(), data: z.union([ ClassCreateManyInputObjectSchema, z.array(ClassCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.ClassCreateManyAndReturnArgs>;

export const ClassCreateManyAndReturnZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), data: z.union([ ClassCreateManyInputObjectSchema, z.array(ClassCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();