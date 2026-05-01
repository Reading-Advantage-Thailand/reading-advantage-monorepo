import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutAssignmentsInputObjectSchema as LessonCreateWithoutAssignmentsInputObjectSchema } from './LessonCreateWithoutAssignmentsInput.schema';
import { LessonUncheckedCreateWithoutAssignmentsInputObjectSchema as LessonUncheckedCreateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedCreateWithoutAssignmentsInput.schema';
import { LessonCreateOrConnectWithoutAssignmentsInputObjectSchema as LessonCreateOrConnectWithoutAssignmentsInputObjectSchema } from './LessonCreateOrConnectWithoutAssignmentsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAssignmentsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutAssignmentsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional()
}).strict();
export const LessonCreateNestedOneWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.LessonCreateNestedOneWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateNestedOneWithoutAssignmentsInput>;
export const LessonCreateNestedOneWithoutAssignmentsInputObjectZodSchema = makeSchema();
