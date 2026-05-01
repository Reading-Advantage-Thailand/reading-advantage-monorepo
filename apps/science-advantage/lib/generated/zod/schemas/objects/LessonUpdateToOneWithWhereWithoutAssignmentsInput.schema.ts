import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { LessonUpdateWithoutAssignmentsInputObjectSchema as LessonUpdateWithoutAssignmentsInputObjectSchema } from './LessonUpdateWithoutAssignmentsInput.schema';
import { LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema as LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedUpdateWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => LessonUpdateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema)])
}).strict();
export const LessonUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutAssignmentsInput>;
export const LessonUpdateToOneWithWhereWithoutAssignmentsInputObjectZodSchema = makeSchema();
