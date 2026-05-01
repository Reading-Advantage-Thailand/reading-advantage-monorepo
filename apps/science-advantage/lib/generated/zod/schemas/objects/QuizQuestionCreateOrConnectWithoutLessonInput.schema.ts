import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionCreateWithoutLessonInputObjectSchema as QuizQuestionCreateWithoutLessonInputObjectSchema } from './QuizQuestionCreateWithoutLessonInput.schema';
import { QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema as QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateOrConnectWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateOrConnectWithoutLessonInput>;
export const QuizQuestionCreateOrConnectWithoutLessonInputObjectZodSchema = makeSchema();
