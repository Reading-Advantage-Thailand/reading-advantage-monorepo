import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { CurriculumUnitWhereInputObjectSchema as CurriculumUnitWhereInputObjectSchema } from './objects/CurriculumUnitWhereInput.schema';

export const CurriculumUnitDeleteManySchema: z.ZodType<Prisma.CurriculumUnitDeleteManyArgs> = z.object({ where: CurriculumUnitWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.CurriculumUnitDeleteManyArgs>;

export const CurriculumUnitDeleteManyZodSchema = z.object({ where: CurriculumUnitWhereInputObjectSchema.optional() }).strict();