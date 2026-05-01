import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutAssignmentsInputObjectSchema as LessonCreateWithoutAssignmentsInputObjectSchema } from './LessonCreateWithoutAssignmentsInput.schema';
import { LessonUncheckedCreateWithoutAssignmentsInputObjectSchema as LessonUncheckedCreateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedCreateWithoutAssignmentsInput.schema';
import { LessonCreateOrConnectWithoutAssignmentsInputObjectSchema as LessonCreateOrConnectWithoutAssignmentsInputObjectSchema } from './LessonCreateOrConnectWithoutAssignmentsInput.schema';
import { LessonUpsertWithoutAssignmentsInputObjectSchema as LessonUpsertWithoutAssignmentsInputObjectSchema } from './LessonUpsertWithoutAssignmentsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema as LessonUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema } from './LessonUpdateToOneWithWhereWithoutAssignmentsInput.schema';
import { LessonUpdateWithoutAssignmentsInputObjectSchema as LessonUpdateWithoutAssignmentsInputObjectSchema } from './LessonUpdateWithoutAssignmentsInput.schema';
import { LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema as LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedUpdateWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAssignmentsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutAssignmentsInputObjectSchema).optional(),
  upsert: z.lazy(() => LessonUpsertWithoutAssignmentsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => LessonUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUpdateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutAssignmentsInputObjectSchema)]).optional()
}).strict();
export const LessonUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema: z.ZodType<Prisma.LessonUpdateOneRequiredWithoutAssignmentsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateOneRequiredWithoutAssignmentsNestedInput>;
export const LessonUpdateOneRequiredWithoutAssignmentsNestedInputObjectZodSchema = makeSchema();
