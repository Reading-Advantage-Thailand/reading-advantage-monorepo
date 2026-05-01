import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitCreateManyInputObjectSchema as CurriculumUnitCreateManyInputObjectSchema } from './objects/CurriculumUnitCreateManyInput.schema';

export const CurriculumUnitCreateManyAndReturnSchema: z.ZodType<Prisma.CurriculumUnitCreateManyAndReturnArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), data: z.union([ CurriculumUnitCreateManyInputObjectSchema, z.array(CurriculumUnitCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitCreateManyAndReturnArgs>;

export const CurriculumUnitCreateManyAndReturnZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), data: z.union([ CurriculumUnitCreateManyInputObjectSchema, z.array(CurriculumUnitCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();