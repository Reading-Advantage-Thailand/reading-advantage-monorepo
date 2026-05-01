import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionScalarWhereInputObjectSchema as QuizQuestionScalarWhereInputObjectSchema } from './QuizQuestionScalarWhereInput.schema';
import { QuizQuestionUpdateManyMutationInputObjectSchema as QuizQuestionUpdateManyMutationInputObjectSchema } from './QuizQuestionUpdateManyMutationInput.schema';
import { QuizQuestionUncheckedUpdateManyWithoutLessonInputObjectSchema as QuizQuestionUncheckedUpdateManyWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedUpdateManyWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => QuizQuestionUpdateManyMutationInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateManyWithoutLessonInputObjectSchema)])
}).strict();
export const QuizQuestionUpdateManyWithWhereWithoutLessonInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateManyWithWhereWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateManyWithWhereWithoutLessonInput>;
export const QuizQuestionUpdateManyWithWhereWithoutLessonInputObjectZodSchema = makeSchema();
