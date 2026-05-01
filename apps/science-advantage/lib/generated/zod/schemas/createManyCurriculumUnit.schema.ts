import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitCreateManyInputObjectSchema as CurriculumUnitCreateManyInputObjectSchema } from './objects/CurriculumUnitCreateManyInput.schema';

export const CurriculumUnitCreateManySchema: z.ZodType<Prisma.CurriculumUnitCreateManyArgs> = z.object({ data: z.union([ CurriculumUnitCreateManyInputObjectSchema, z.array(CurriculumUnitCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitCreateManyArgs>;

export const CurriculumUnitCreateManyZodSchema = z.object({ data: z.union([ CurriculumUnitCreateManyInputObjectSchema, z.array(CurriculumUnitCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();