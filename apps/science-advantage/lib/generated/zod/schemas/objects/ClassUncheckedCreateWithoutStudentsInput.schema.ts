import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateNestedManyWithoutClassInput.schema';
import { AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema as AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema } from './AssignmentUncheckedCreateNestedManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string(),
  gradeLevel: z.number().int(),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  teacherId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema).optional()
}).strict();
export const ClassUncheckedCreateWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUncheckedCreateWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedCreateWithoutStudentsInput>;
export const ClassUncheckedCreateWithoutStudentsInputObjectZodSchema = makeSchema();
