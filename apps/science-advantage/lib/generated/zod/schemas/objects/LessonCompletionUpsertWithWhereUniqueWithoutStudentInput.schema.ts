import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionUpdateWithoutStudentInputObjectSchema as LessonCompletionUpdateWithoutStudentInputObjectSchema } from './LessonCompletionUpdateWithoutStudentInput.schema';
import { LessonCompletionUncheckedUpdateWithoutStudentInputObjectSchema as LessonCompletionUncheckedUpdateWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedUpdateWithoutStudentInput.schema';
import { LessonCompletionCreateWithoutStudentInputObjectSchema as LessonCompletionCreateWithoutStudentInputObjectSchema } from './LessonCompletionCreateWithoutStudentInput.schema';
import { LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema as LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => LessonCompletionUpdateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUncheckedUpdateWithoutStudentInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const LessonCompletionUpsertWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpsertWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpsertWithWhereUniqueWithoutStudentInput>;
export const LessonCompletionUpsertWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
