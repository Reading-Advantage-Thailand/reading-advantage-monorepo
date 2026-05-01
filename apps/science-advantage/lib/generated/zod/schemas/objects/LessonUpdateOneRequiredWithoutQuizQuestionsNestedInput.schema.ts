import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutQuizQuestionsInputObjectSchema as LessonCreateWithoutQuizQuestionsInputObjectSchema } from './LessonCreateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedCreateWithoutQuizQuestionsInput.schema';
import { LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema as LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema } from './LessonCreateOrConnectWithoutQuizQuestionsInput.schema';
import { LessonUpsertWithoutQuizQuestionsInputObjectSchema as LessonUpsertWithoutQuizQuestionsInputObjectSchema } from './LessonUpsertWithoutQuizQuestionsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateToOneWithWhereWithoutQuizQuestionsInputObjectSchema as LessonUpdateToOneWithWhereWithoutQuizQuestionsInputObjectSchema } from './LessonUpdateToOneWithWhereWithoutQuizQuestionsInput.schema';
import { LessonUpdateWithoutQuizQuestionsInputObjectSchema as LessonUpdateWithoutQuizQuestionsInputObjectSchema } from './LessonUpdateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedUpdateWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutQuizQuestionsInputObjectSchema).optional(),
  upsert: z.lazy(() => LessonUpsertWithoutQuizQuestionsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => LessonUpdateToOneWithWhereWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUpdateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema)]).optional()
}).strict();
export const LessonUpdateOneRequiredWithoutQuizQuestionsNestedInputObjectSchema: z.ZodType<Prisma.LessonUpdateOneRequiredWithoutQuizQuestionsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateOneRequiredWithoutQuizQuestionsNestedInput>;
export const LessonUpdateOneRequiredWithoutQuizQuestionsNestedInputObjectZodSchema = makeSchema();
