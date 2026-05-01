import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateWithoutQuizQuestionsInputObjectSchema as StandardUpdateWithoutQuizQuestionsInputObjectSchema } from './StandardUpdateWithoutQuizQuestionsInput.schema';
import { StandardUncheckedUpdateWithoutQuizQuestionsInputObjectSchema as StandardUncheckedUpdateWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedUpdateWithoutQuizQuestionsInput.schema';
import { StandardCreateWithoutQuizQuestionsInputObjectSchema as StandardCreateWithoutQuizQuestionsInputObjectSchema } from './StandardCreateWithoutQuizQuestionsInput.schema';
import { StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema as StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedCreateWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => StandardUpdateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutQuizQuestionsInputObjectSchema)]),
  create: z.union([z.lazy(() => StandardCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema)])
}).strict();
export const StandardUpsertWithWhereUniqueWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.StandardUpsertWithWhereUniqueWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpsertWithWhereUniqueWithoutQuizQuestionsInput>;
export const StandardUpsertWithWhereUniqueWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
