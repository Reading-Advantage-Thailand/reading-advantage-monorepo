import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateWithoutLessonInputObjectSchema as QuizQuestionUpdateWithoutLessonInputObjectSchema } from './QuizQuestionUpdateWithoutLessonInput.schema';
import { QuizQuestionUncheckedUpdateWithoutLessonInputObjectSchema as QuizQuestionUncheckedUpdateWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => QuizQuestionUpdateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutLessonInputObjectSchema)])
}).strict();
export const QuizQuestionUpdateWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateWithWhereUniqueWithoutLessonInput>;
export const QuizQuestionUpdateWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
