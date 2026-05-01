import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { userCreateNestedOneWithoutTaughtClassesInputObjectSchema as userCreateNestedOneWithoutTaughtClassesInputObjectSchema } from './userCreateNestedOneWithoutTaughtClassesInput.schema';
import { userCreateNestedManyWithoutEnrolledClassInputObjectSchema as userCreateNestedManyWithoutEnrolledClassInputObjectSchema } from './userCreateNestedManyWithoutEnrolledClassInput.schema';
import { CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema as CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema } from './CurriculumUnitCreateNestedManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string().min(3).max(100).trim(),
  gradeLevel: z.number().int().int().min(3).max(6),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  teacher: z.lazy(() => userCreateNestedOneWithoutTaughtClassesInputObjectSchema),
  students: z.lazy(() => userCreateNestedManyWithoutEnrolledClassInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema).optional()
}).strict();
export const ClassCreateWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.ClassCreateWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateWithoutAssignmentsInput>;
export const ClassCreateWithoutAssignmentsInputObjectZodSchema = makeSchema();
