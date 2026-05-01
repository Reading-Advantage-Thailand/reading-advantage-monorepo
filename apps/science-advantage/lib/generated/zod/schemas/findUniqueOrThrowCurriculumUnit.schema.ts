import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './objects/CurriculumUnitInclude.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './objects/CurriculumUnitWhereUniqueInput.schema';

export const CurriculumUnitFindUniqueOrThrowSchema: z.ZodType<Prisma.CurriculumUnitFindUniqueOrThrowArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), where: CurriculumUnitWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitFindUniqueOrThrowArgs>;

export const CurriculumUnitFindUniqueOrThrowZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), where: CurriculumUnitWhereUniqueInputObjectSchema }).strict();