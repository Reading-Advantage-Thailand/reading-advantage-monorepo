import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { EnumStandardsAlignmentFilterObjectSchema as EnumStandardsAlignmentFilterObjectSchema } from './EnumStandardsAlignmentFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { UserListRelationFilterObjectSchema as UserListRelationFilterObjectSchema } from './UserListRelationFilter.schema';
import { CurriculumUnitListRelationFilterObjectSchema as CurriculumUnitListRelationFilterObjectSchema } from './CurriculumUnitListRelationFilter.schema';
import { AssignmentListRelationFilterObjectSchema as AssignmentListRelationFilterObjectSchema } from './AssignmentListRelationFilter.schema'

const classwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => ClassWhereInputObjectSchema), z.lazy(() => ClassWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => ClassWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => ClassWhereInputObjectSchema), z.lazy(() => ClassWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  name: z.union([z.lazy(() => StringFilterObjectSchema), z.string().min(3).max(100).trim()]).optional(),
  gradeLevel: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int().int().min(3).max(6)]).optional(),
  standardsAlignment: z.union([z.lazy(() => EnumStandardsAlignmentFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  joinCode: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  teacherId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  teacher: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional(),
  students: z.lazy(() => UserListRelationFilterObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitListRelationFilterObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentListRelationFilterObjectSchema).optional()
}).strict();
export const ClassWhereInputObjectSchema: z.ZodType<Prisma.ClassWhereInput> = classwhereinputSchema as unknown as z.ZodType<Prisma.ClassWhereInput>;
export const ClassWhereInputObjectZodSchema = classwhereinputSchema;
