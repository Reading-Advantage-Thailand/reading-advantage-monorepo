import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonCreateWithoutAssignmentsInputObjectSchema as LessonCreateWithoutAssignmentsInputObjectSchema } from './LessonCreateWithoutAssignmentsInput.schema';
import { LessonUncheckedCreateWithoutAssignmentsInputObjectSchema as LessonUncheckedCreateWithoutAssignmentsInputObjectSchema } from './LessonUncheckedCreateWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAssignmentsInputObjectSchema)])
}).strict();
export const LessonCreateOrConnectWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.LessonCreateOrConnectWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateOrConnectWithoutAssignmentsInput>;
export const LessonCreateOrConnectWithoutAssignmentsInputObjectZodSchema = makeSchema();
