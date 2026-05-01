import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  framework: StandardsAlignmentSchema,
  gradeLevel: z.number().int(),
  order: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lessons: z.lazy(() => LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInputObjectSchema).optional()
}).strict();
export const CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUncheckedCreateWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUncheckedCreateWithoutClassInput>;
export const CurriculumUnitUncheckedCreateWithoutClassInputObjectZodSchema = makeSchema();
