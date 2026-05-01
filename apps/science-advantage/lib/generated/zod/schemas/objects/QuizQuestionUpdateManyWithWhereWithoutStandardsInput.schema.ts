import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionScalarWhereInputObjectSchema as QuizQuestionScalarWhereInputObjectSchema } from './QuizQuestionScalarWhereInput.schema';
import { QuizQuestionUpdateManyMutationInputObjectSchema as QuizQuestionUpdateManyMutationInputObjectSchema } from './QuizQuestionUpdateManyMutationInput.schema';
import { QuizQuestionUncheckedUpdateManyWithoutStandardsInputObjectSchema as QuizQuestionUncheckedUpdateManyWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedUpdateManyWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => QuizQuestionUpdateManyMutationInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateManyWithoutStandardsInputObjectSchema)])
}).strict();
export const QuizQuestionUpdateManyWithWhereWithoutStandardsInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateManyWithWhereWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateManyWithWhereWithoutStandardsInput>;
export const QuizQuestionUpdateManyWithWhereWithoutStandardsInputObjectZodSchema = makeSchema();
