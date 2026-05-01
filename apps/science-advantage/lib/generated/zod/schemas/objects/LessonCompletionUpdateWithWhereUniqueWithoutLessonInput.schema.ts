import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionUpdateWithoutLessonInputObjectSchema as LessonCompletionUpdateWithoutLessonInputObjectSchema } from './LessonCompletionUpdateWithoutLessonInput.schema';
import { LessonCompletionUncheckedUpdateWithoutLessonInputObjectSchema as LessonCompletionUncheckedUpdateWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedUpdateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => LessonCompletionUpdateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUncheckedUpdateWithoutLessonInputObjectSchema)])
}).strict();
export const LessonCompletionUpdateWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpdateWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpdateWithWhereUniqueWithoutLessonInput>;
export const LessonCompletionUpdateWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
