import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateWithoutStandardsInputObjectSchema as QuizQuestionUpdateWithoutStandardsInputObjectSchema } from './QuizQuestionUpdateWithoutStandardsInput.schema';
import { QuizQuestionUncheckedUpdateWithoutStandardsInputObjectSchema as QuizQuestionUncheckedUpdateWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutStandardsInput.schema';
import { QuizQuestionCreateWithoutStandardsInputObjectSchema as QuizQuestionCreateWithoutStandardsInputObjectSchema } from './QuizQuestionCreateWithoutStandardsInput.schema';
import { QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => QuizQuestionUpdateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutStandardsInputObjectSchema)]),
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema)])
}).strict();
export const QuizQuestionUpsertWithWhereUniqueWithoutStandardsInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpsertWithWhereUniqueWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpsertWithWhereUniqueWithoutStandardsInput>;
export const QuizQuestionUpsertWithWhereUniqueWithoutStandardsInputObjectZodSchema = makeSchema();
