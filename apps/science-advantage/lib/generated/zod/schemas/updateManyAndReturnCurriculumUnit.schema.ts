import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './objects/CurriculumUnitSelect.schema';
import { CurriculumUnitUpdateManyMutationInputObjectSchema as CurriculumUnitUpdateManyMutationInputObjectSchema } from './objects/CurriculumUnitUpdateManyMutationInput.schema';
import { CurriculumUnitWhereInputObjectSchema as CurriculumUnitWhereInputObjectSchema } from './objects/CurriculumUnitWhereInput.schema';

export const CurriculumUnitUpdateManyAndReturnSchema: z.ZodType<Prisma.CurriculumUnitUpdateManyAndReturnArgs> = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), data: CurriculumUnitUpdateManyMutationInputObjectSchema, where: CurriculumUnitWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateManyAndReturnArgs>;

export const CurriculumUnitUpdateManyAndReturnZodSchema = z.object({ select: CurriculumUnitSelectObjectSchema.optional(), data: CurriculumUnitUpdateManyMutationInputObjectSchema, where: CurriculumUnitWhereInputObjectSchema.optional() }).strict();