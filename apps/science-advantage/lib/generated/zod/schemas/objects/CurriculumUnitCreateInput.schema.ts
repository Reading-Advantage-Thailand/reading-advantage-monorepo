import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonCreateNestedManyWithoutCurriculumUnitsInputObjectSchema as LessonCreateNestedManyWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateNestedManyWithoutCurriculumUnitsInput.schema';
import { ClassCreateNestedOneWithoutCurriculumUnitsInputObjectSchema as ClassCreateNestedOneWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateNestedOneWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  framework: StandardsAlignmentSchema,
  gradeLevel: z.number().int(),
  order: z.number().int(),
  createdAt: z.coerce.date().optional(),
  lessons: z.lazy(() => LessonCreateNestedManyWithoutCurriculumUnitsInputObjectSchema),
  class: z.lazy(() => ClassCreateNestedOneWithoutCurriculumUnitsInputObjectSchema)
}).strict();
export const CurriculumUnitCreateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateInput>;
export const CurriculumUnitCreateInputObjectZodSchema = makeSchema();
