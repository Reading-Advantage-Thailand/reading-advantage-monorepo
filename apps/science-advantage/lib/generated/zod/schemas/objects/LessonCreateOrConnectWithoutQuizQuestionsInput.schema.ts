import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonCreateWithoutQuizQuestionsInputObjectSchema as LessonCreateWithoutQuizQuestionsInputObjectSchema } from './LessonCreateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedCreateWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema)])
}).strict();
export const LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.LessonCreateOrConnectWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateOrConnectWithoutQuizQuestionsInput>;
export const LessonCreateOrConnectWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
