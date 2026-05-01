import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './objects/CurriculumUnitInclude.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './objects/CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitCreateInputObjectSchema as CurriculumUnitCreateInputObjectSchema } from './objects/CurriculumUnitCreateInput.schema';
import { CurriculumUnitUncheckedCreateInputObjectSchema as CurriculumUnitUncheckedCreateInputObjectSchema } from './objects/CurriculumUnitUncheckedCreateInput.schema';
import { CurriculumUnitUpdateInputObjectSchema as CurriculumUnitUpdateInputObjectSchema } from './objects/CurriculumUnitUpdateInput.schema';
import { CurriculumUnitUncheckedUpdateInputObjectSchema as CurriculumUnitUncheckedUpdateInputObjectSchema } from './objects/CurriculumUnitUncheckedUpdateInput.schema';

export const CurriculumUnitUpsertOneSchema: z.ZodType<Prisma.CurriculumUnitUpsertArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), where: CurriculumUnitWhereUniqueInputObjectSchema, create: z.union([ CurriculumUnitCreateInputObjectSchema, CurriculumUnitUncheckedCreateInputObjectSchema ]), update: z.union([ CurriculumUnitUpdateInputObjectSchema, CurriculumUnitUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitUpsertArgs>;

export const CurriculumUnitUpsertOneZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), include: CurriculumUnitIncludeObjectSchema.optional(), where: CurriculumUnitWhereUniqueInputObjectSchema, create: z.union([ CurriculumUnitCreateInputObjectSchema, CurriculumUnitUncheckedCreateInputObjectSchema ]), update: z.union([ CurriculumUnitUpdateInputObjectSchema, CurriculumUnitUncheckedUpdateInputObjectSchema ]) }).strict();