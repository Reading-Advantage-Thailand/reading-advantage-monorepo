import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitUpdateManyMutationInputObjectSchema as CurriculumUnitUpdateManyMutationInputObjectSchema } from './objects/CurriculumUnitUpdateManyMutationInput.schema';
import { CurriculumUnitWhereInputObjectSchema as CurriculumUnitWhereInputObjectSchema } from './objects/CurriculumUnitWhereInput.schema';

export const CurriculumUnitUpdateManySchema: z.ZodType<Prisma.CurriculumUnitUpdateManyArgs> = z.object({ data: CurriculumUnitUpdateManyMutationInputObjectSchema, where: CurriculumUnitWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateManyArgs>;

export const CurriculumUnitUpdateManyZodSchema = z.object({ data: CurriculumUnitUpdateManyMutationInputObjectSchema, where: CurriculumUnitWhereInputObjectSchema.optional() }).strict();