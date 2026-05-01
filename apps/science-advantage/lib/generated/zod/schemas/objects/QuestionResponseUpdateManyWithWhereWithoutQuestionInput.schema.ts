import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseScalarWhereInputObjectSchema as QuestionResponseScalarWhereInputObjectSchema } from './QuestionResponseScalarWhereInput.schema';
import { QuestionResponseUpdateManyMutationInputObjectSchema as QuestionResponseUpdateManyMutationInputObjectSchema } from './QuestionResponseUpdateManyMutationInput.schema';
import { QuestionResponseUncheckedUpdateManyWithoutQuestionInputObjectSchema as QuestionResponseUncheckedUpdateManyWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedUpdateManyWithoutQuestionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => QuestionResponseUpdateManyMutationInputObjectSchema), z.lazy(() => QuestionResponseUncheckedUpdateManyWithoutQuestionInputObjectSchema)])
}).strict();
export const QuestionResponseUpdateManyWithWhereWithoutQuestionInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpdateManyWithWhereWithoutQuestionInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpdateManyWithWhereWithoutQuestionInput>;
export const QuestionResponseUpdateManyWithWhereWithoutQuestionInputObjectZodSchema = makeSchema();
