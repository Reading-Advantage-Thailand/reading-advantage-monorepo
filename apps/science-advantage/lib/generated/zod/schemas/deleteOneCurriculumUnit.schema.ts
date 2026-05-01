import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './objects/CurriculumUnitInclude.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './objects/CurriculumUnitWhereUniqueInput.schema';

export const CurriculumUnitDeleteOneSchema: z.ZodType<Prisma.CurriculumUnitDeleteArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), where: CurriculumUnitWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitDeleteArgs>;

export const CurriculumUnitDeleteOneZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), where: CurriculumUnitWhereUniqueInputObjectSchema }).strict();