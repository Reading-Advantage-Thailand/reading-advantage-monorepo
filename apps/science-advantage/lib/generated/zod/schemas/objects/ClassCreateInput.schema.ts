import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { userCreateNestedOneWithoutTaughtClassesInputObjectSchema as userCreateNestedOneWithoutTaughtClassesInputObjectSchema } from './userCreateNestedOneWithoutTaughtClassesInput.schema';
import { userCreateNestedManyWithoutEnrolledClassInputObjectSchema as userCreateNestedManyWithoutEnrolledClassInputObjectSchema } from './userCreateNestedManyWithoutEnrolledClassInput.schema';
import { CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema as CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema } from './CurriculumUnitCreateNestedManyWithoutClassInput.schema';
import { AssignmentCreateNestedManyWithoutClassInputObjectSchema as AssignmentCreateNestedManyWithoutClassInputObjectSchema } from './AssignmentCreateNestedManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string().min(3).max(100).trim(),
  gradeLevel: z.number().int().int().min(3).max(6),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  createdAt: z.coerce.date().optional(),
  teacher: z.lazy(() => userCreateNestedOneWithoutTaughtClassesInputObjectSchema),
  students: z.lazy(() => userCreateNestedManyWithoutEnrolledClassInputObjectSchema),
  curriculumUnits: z.lazy(() => CurriculumUnitCreateNestedManyWithoutClassInputObjectSchema),
  assignments: z.lazy(() => AssignmentCreateNestedManyWithoutClassInputObjectSchema)
}).strict();
export const ClassCreateInputObjectSchema: z.ZodType<Prisma.ClassCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateInput>;
export const ClassCreateInputObjectZodSchema = makeSchema();
