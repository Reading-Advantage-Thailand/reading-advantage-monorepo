import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema as userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateNestedManyWithoutEnrolledClassInput.schema';
import { CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateNestedManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string(),
  gradeLevel: z.number().int(),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  teacherId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  students: z.lazy(() => userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema).optional()
}).strict();
export const ClassUncheckedCreateWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.ClassUncheckedCreateWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedCreateWithoutAssignmentsInput>;
export const ClassUncheckedCreateWithoutAssignmentsInputObjectZodSchema = makeSchema();
