import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateWithoutStandardsInputObjectSchema as QuizQuestionCreateWithoutStandardsInputObjectSchema } from './QuizQuestionCreateWithoutStandardsInput.schema';
import { QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutStandardsInput.schema';
import { QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema as QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema } from './QuizQuestionCreateOrConnectWithoutStandardsInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionCreateWithoutStandardsInputObjectSchema).array(), z.lazy(() => QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateNestedManyWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateNestedManyWithoutStandardsInput>;
export const QuizQuestionCreateNestedManyWithoutStandardsInputObjectZodSchema = makeSchema();
