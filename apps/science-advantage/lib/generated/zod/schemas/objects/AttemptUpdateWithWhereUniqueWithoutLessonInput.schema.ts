import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateWithoutLessonInputObjectSchema as AttemptUpdateWithoutLessonInputObjectSchema } from './AttemptUpdateWithoutLessonInput.schema';
import { AttemptUncheckedUpdateWithoutLessonInputObjectSchema as AttemptUncheckedUpdateWithoutLessonInputObjectSchema } from './AttemptUncheckedUpdateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => AttemptUpdateWithoutLessonInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutLessonInputObjectSchema)])
}).strict();
export const AttemptUpdateWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.AttemptUpdateWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateWithWhereUniqueWithoutLessonInput>;
export const AttemptUpdateWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
