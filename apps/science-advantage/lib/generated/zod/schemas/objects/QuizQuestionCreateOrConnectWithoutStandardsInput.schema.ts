import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionCreateWithoutStandardsInputObjectSchema as QuizQuestionCreateWithoutStandardsInputObjectSchema } from './QuizQuestionCreateWithoutStandardsInput.schema';
import { QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema)])
}).strict();
export const QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateOrConnectWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateOrConnectWithoutStandardsInput>;
export const QuizQuestionCreateOrConnectWithoutStandardsInputObjectZodSchema = makeSchema();
