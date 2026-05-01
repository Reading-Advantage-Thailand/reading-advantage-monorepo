import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateWithoutStandardsInputObjectSchema as QuizQuestionUpdateWithoutStandardsInputObjectSchema } from './QuizQuestionUpdateWithoutStandardsInput.schema';
import { QuizQuestionUncheckedUpdateWithoutStandardsInputObjectSchema as QuizQuestionUncheckedUpdateWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => QuizQuestionUpdateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutStandardsInputObjectSchema)])
}).strict();
export const QuizQuestionUpdateWithWhereUniqueWithoutStandardsInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateWithWhereUniqueWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateWithWhereUniqueWithoutStandardsInput>;
export const QuizQuestionUpdateWithWhereUniqueWithoutStandardsInputObjectZodSchema = makeSchema();
