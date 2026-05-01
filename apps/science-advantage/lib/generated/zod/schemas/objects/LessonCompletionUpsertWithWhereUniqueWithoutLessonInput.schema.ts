import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionUpdateWithoutLessonInputObjectSchema as LessonCompletionUpdateWithoutLessonInputObjectSchema } from './LessonCompletionUpdateWithoutLessonInput.schema';
import { LessonCompletionUncheckedUpdateWithoutLessonInputObjectSchema as LessonCompletionUncheckedUpdateWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedUpdateWithoutLessonInput.schema';
import { LessonCompletionCreateWithoutLessonInputObjectSchema as LessonCompletionCreateWithoutLessonInputObjectSchema } from './LessonCompletionCreateWithoutLessonInput.schema';
import { LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema as LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => LessonCompletionUpdateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUncheckedUpdateWithoutLessonInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const LessonCompletionUpsertWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpsertWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpsertWithWhereUniqueWithoutLessonInput>;
export const LessonCompletionUpsertWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
