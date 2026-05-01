import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonCreateNestedManyWithoutCurriculumUnitsInputObjectSchema as LessonCreateNestedManyWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateNestedManyWithoutCurriculumUnitsInput.schema'

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
  lessons: z.lazy(() => LessonCreateNestedManyWithoutCurriculumUnitsInputObjectSchema).optional()
}).strict();
export const CurriculumUnitCreateWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateWithoutClassInput>;
export const CurriculumUnitCreateWithoutClassInputObjectZodSchema = makeSchema();
