import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseUpdateWithoutQuestionInputObjectSchema as QuestionResponseUpdateWithoutQuestionInputObjectSchema } from './QuestionResponseUpdateWithoutQuestionInput.schema';
import { QuestionResponseUncheckedUpdateWithoutQuestionInputObjectSchema as QuestionResponseUncheckedUpdateWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedUpdateWithoutQuestionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => QuestionResponseUpdateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUncheckedUpdateWithoutQuestionInputObjectSchema)])
}).strict();
export const QuestionResponseUpdateWithWhereUniqueWithoutQuestionInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpdateWithWhereUniqueWithoutQuestionInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpdateWithWhereUniqueWithoutQuestionInput>;
export const QuestionResponseUpdateWithWhereUniqueWithoutQuestionInputObjectZodSchema = makeSchema();
