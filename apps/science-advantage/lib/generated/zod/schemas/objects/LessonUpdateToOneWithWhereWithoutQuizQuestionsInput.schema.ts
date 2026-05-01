import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { LessonUpdateWithoutQuizQuestionsInputObjectSchema as LessonUpdateWithoutQuizQuestionsInputObjectSchema } from './LessonUpdateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedUpdateWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => LessonUpdateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema)])
}).strict();
export const LessonUpdateToOneWithWhereWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutQuizQuestionsInput>;
export const LessonUpdateToOneWithWhereWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
