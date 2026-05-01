import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateWithoutStandardsInputObjectSchema as LessonUpdateWithoutStandardsInputObjectSchema } from './LessonUpdateWithoutStandardsInput.schema';
import { LessonUncheckedUpdateWithoutStandardsInputObjectSchema as LessonUncheckedUpdateWithoutStandardsInputObjectSchema } from './LessonUncheckedUpdateWithoutStandardsInput.schema';
import { LessonCreateWithoutStandardsInputObjectSchema as LessonCreateWithoutStandardsInputObjectSchema } from './LessonCreateWithoutStandardsInput.schema';
import { LessonUncheckedCreateWithoutStandardsInputObjectSchema as LessonUncheckedCreateWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => LessonUpdateWithoutStandardsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutStandardsInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCreateWithoutStandardsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutStandardsInputObjectSchema)])
}).strict();
export const LessonUpsertWithWhereUniqueWithoutStandardsInputObjectSchema: z.ZodType<Prisma.LessonUpsertWithWhereUniqueWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpsertWithWhereUniqueWithoutStandardsInput>;
export const LessonUpsertWithWhereUniqueWithoutStandardsInputObjectZodSchema = makeSchema();
