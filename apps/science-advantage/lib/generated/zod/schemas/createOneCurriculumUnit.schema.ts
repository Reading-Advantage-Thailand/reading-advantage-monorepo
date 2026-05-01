import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './objects/CurriculumUnitInclude.schema';
import { CurriculumUnitCreateInputObjectSchema as CurriculumUnitCreateInputObjectSchema } from './objects/CurriculumUnitCreateInput.schema';
import { CurriculumUnitUncheckedCreateInputObjectSchema as CurriculumUnitUncheckedCreateInputObjectSchema } from './objects/CurriculumUnitUncheckedCreateInput.schema';

export const CurriculumUnitCreateOneSchema: z.ZodType<Prisma.CurriculumUnitCreateArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), data: z.union([CurriculumUnitCreateInputObjectSchema, CurriculumUnitUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitCreateArgs>;

export const CurriculumUnitCreateOneZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), data: z.union([CurriculumUnitCreateInputObjectSchema, CurriculumUnitUncheckedCreateInputObjectSchema]) }).strict();