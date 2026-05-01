import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonUpdateWithoutAssignmentsInputObjectSchema as LessonUpdateWithoutAssignmentsInputObjectSchema } from './LessonUpdateWithoutAssignmentsInput.schema';
import { LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema as LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedUpdateWithoutAssignmentsInput.schema';
import { LessonCreateWithoutAssignmentsInputObjectSchema as LessonCreateWithoutAssignmentsInputObjectSchema } from './LessonCreateWithoutAssignmentsInput.schema';
import { LessonUncheckedCreateWithoutAssignmentsInputObjectSchema as LessonUncheckedCreateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedCreateWithoutAssignmentsInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => LessonUpdateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAssignmentsInputObjectSchema)]),
  where: z.lazy(() => LessonWhereInputObjectSchema).optional()
}).strict();
export const LessonUpsertWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.LessonUpsertWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpsertWithoutAssignmentsInput>;
export const LessonUpsertWithoutAssignmentsInputObjectZodSchema = makeSchema();
