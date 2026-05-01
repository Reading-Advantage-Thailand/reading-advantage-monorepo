import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './objects/CurriculumUnitInclude.schema';
import { CurriculumUnitUpdateInputObjectSchema as CurriculumUnitUpdateInputObjectSchema } from './objects/CurriculumUnitUpdateInput.schema';
import { CurriculumUnitUncheckedUpdateInputObjectSchema as CurriculumUnitUncheckedUpdateInputObjectSchema } from './objects/CurriculumUnitUncheckedUpdateInput.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './objects/CurriculumUnitWhereUniqueInput.schema';

export const CurriculumUnitUpdateOneSchema: z.ZodType<Prisma.CurriculumUnitUpdateArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), data: z.union([CurriculumUnitUpdateInputObjectSchema, CurriculumUnitUncheckedUpdateInputObjectSchema]), where: CurriculumUnitWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateArgs>;

export const CurriculumUnitUpdateOneZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), data: z.union([CurriculumUnitUpdateInputObjectSchema, CurriculumUnitUncheckedUpdateInputObjectSchema]), where: CurriculumUnitWhereUniqueInputObjectSchema }).strict();