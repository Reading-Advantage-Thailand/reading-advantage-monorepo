import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { userCreateNestedOneWithoutTaughtClassesInputObjectSchema as userCreateNestedOneWithoutTaughtClassesInputObjectSchema } from './userCreateNestedOneWithoutTaughtClassesInput.schema';
import { CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema as CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema } from './CurriculumUnitCreateNestedManyWithoutClassInput.schema';
import { AssignmentCreateNestedManyWithoutClassInputObjectSchema as AssignmentCreateNestedManyWithoutClassInputObjectSchema } from './AssignmentCreateNestedManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string().min(3).max(100).trim(),
  gradeLevel: z.number().int().int().min(3).max(6),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  teacher: z.lazy(() => userCreateNestedOneWithoutTaughtClassesInputObjectSchema),
  curriculumUnits: z.lazy(() => CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentCreateNestedManyWithoutClassInputObjectSchema).optional()
}).strict();
export const ClassCreateWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassCreateWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateWithoutStudentsInput>;
export const ClassCreateWithoutStudentsInputObjectZodSchema = makeSchema();
