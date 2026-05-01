import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateWithoutQuizQuestionsInputObjectSchema as StandardUpdateWithoutQuizQuestionsInputObjectSchema } from './StandardUpdateWithoutQuizQuestionsInput.schema';
import { StandardUncheckedUpdateWithoutQuizQuestionsInputObjectSchema as StandardUncheckedUpdateWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedUpdateWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => StandardUpdateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutQuizQuestionsInputObjectSchema)])
}).strict();
export const StandardUpdateWithWhereUniqueWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.StandardUpdateWithWhereUniqueWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateWithWhereUniqueWithoutQuizQuestionsInput>;
export const StandardUpdateWithWhereUniqueWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
