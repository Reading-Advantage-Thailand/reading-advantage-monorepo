import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema as userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateNestedManyWithoutEnrolledClassInput.schema';
import { CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateNestedManyWithoutClassInput.schema';
import { AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema as AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema } from './AssignmentUncheckedCreateNestedManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string().min(3).max(100).trim(),
  gradeLevel: z.number().int().int().min(3).max(6),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  teacherId: z.string(),
  createdAt: z.coerce.date().optional(),
  students: z.lazy(() => userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema),
  curriculumUnits: z.lazy(() => CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema),
  assignments: z.lazy(() => AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema)
}).strict();
export const ClassUncheckedCreateInputObjectSchema: z.ZodType<Prisma.ClassUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedCreateInput>;
export const ClassUncheckedCreateInputObjectZodSchema = makeSchema();
