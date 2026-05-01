import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonUpdateWithoutAttemptsInputObjectSchema as LessonUpdateWithoutAttemptsInputObjectSchema } from './LessonUpdateWithoutAttemptsInput.schema';
import { LessonUncheckedUpdateWithoutAttemptsInputObjectSchema as LessonUncheckedUpdateWithoutAttemptsInputObjectSchema } from './LessonUncheckedUpdateWithoutAttemptsInput.schema';
import { LessonCreateWithoutAttemptsInputObjectSchema as LessonCreateWithoutAttemptsInputObjectSchema } from './LessonCreateWithoutAttemptsInput.schema';
import { LessonUncheckedCreateWithoutAttemptsInputObjectSchema as LessonUncheckedCreateWithoutAttemptsInputObjectSchema } from './LessonUncheckedCreateWithoutAttemptsInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => LessonUpdateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutAttemptsInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCreateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAttemptsInputObjectSchema)]),
  where: z.lazy(() => LessonWhereInputObjectSchema).optional()
}).strict();
export const LessonUpsertWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.LessonUpsertWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpsertWithoutAttemptsInput>;
export const LessonUpsertWithoutAttemptsInputObjectZodSchema = makeSchema();
