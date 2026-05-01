import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateWithoutLessonInputObjectSchema as AttemptUpdateWithoutLessonInputObjectSchema } from './AttemptUpdateWithoutLessonInput.schema';
import { AttemptUncheckedUpdateWithoutLessonInputObjectSchema as AttemptUncheckedUpdateWithoutLessonInputObjectSchema } from './AttemptUncheckedUpdateWithoutLessonInput.schema';
import { AttemptCreateWithoutLessonInputObjectSchema as AttemptCreateWithoutLessonInputObjectSchema } from './AttemptCreateWithoutLessonInput.schema';
import { AttemptUncheckedCreateWithoutLessonInputObjectSchema as AttemptUncheckedCreateWithoutLessonInputObjectSchema } from './AttemptUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => AttemptUpdateWithoutLessonInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutLessonInputObjectSchema)]),
  create: z.union([z.lazy(() => AttemptCreateWithoutLessonInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const AttemptUpsertWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.AttemptUpsertWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpsertWithWhereUniqueWithoutLessonInput>;
export const AttemptUpsertWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
