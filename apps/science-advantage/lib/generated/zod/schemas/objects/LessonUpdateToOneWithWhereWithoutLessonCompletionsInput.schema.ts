import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { LessonUpdateWithoutLessonCompletionsInputObjectSchema as LessonUpdateWithoutLessonCompletionsInputObjectSchema } from './LessonUpdateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedUpdateWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => LessonUpdateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema)])
}).strict();
export const LessonUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutLessonCompletionsInput>;
export const LessonUpdateToOneWithWhereWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
