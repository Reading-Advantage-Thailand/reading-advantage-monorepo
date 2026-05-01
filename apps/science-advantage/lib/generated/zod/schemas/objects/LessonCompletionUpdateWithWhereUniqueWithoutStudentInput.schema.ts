import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionUpdateWithoutStudentInputObjectSchema as LessonCompletionUpdateWithoutStudentInputObjectSchema } from './LessonCompletionUpdateWithoutStudentInput.schema';
import { LessonCompletionUncheckedUpdateWithoutStudentInputObjectSchema as LessonCompletionUncheckedUpdateWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedUpdateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => LessonCompletionUpdateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUncheckedUpdateWithoutStudentInputObjectSchema)])
}).strict();
export const LessonCompletionUpdateWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpdateWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpdateWithWhereUniqueWithoutStudentInput>;
export const LessonCompletionUpdateWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
