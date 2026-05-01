import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutQuizQuestionsInputObjectSchema as LessonCreateWithoutQuizQuestionsInputObjectSchema } from './LessonCreateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedCreateWithoutQuizQuestionsInput.schema';
import { LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema as LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema } from './LessonCreateOrConnectWithoutQuizQuestionsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional()
}).strict();
export const LessonCreateNestedOneWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.LessonCreateNestedOneWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateNestedOneWithoutQuizQuestionsInput>;
export const LessonCreateNestedOneWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
