import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema as userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateNestedManyWithoutEnrolledClassInput.schema';
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
  students: z.lazy(() => userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema).optional()
}).strict();
export const ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.ClassUncheckedCreateWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedCreateWithoutCurriculumUnitsInput>;
export const ClassUncheckedCreateWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
