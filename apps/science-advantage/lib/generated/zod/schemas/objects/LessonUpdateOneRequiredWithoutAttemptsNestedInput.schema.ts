import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutAttemptsInputObjectSchema as LessonCreateWithoutAttemptsInputObjectSchema } from './LessonCreateWithoutAttemptsInput.schema';
import { LessonUncheckedCreateWithoutAttemptsInputObjectSchema as LessonUncheckedCreateWithoutAttemptsInputObjectSchema } from './LessonUncheckedCreateWithoutAttemptsInput.schema';
import { LessonCreateOrConnectWithoutAttemptsInputObjectSchema as LessonCreateOrConnectWithoutAttemptsInputObjectSchema } from './LessonCreateOrConnectWithoutAttemptsInput.schema';
import { LessonUpsertWithoutAttemptsInputObjectSchema as LessonUpsertWithoutAttemptsInputObjectSchema } from './LessonUpsertWithoutAttemptsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateToOneWithWhereWithoutAttemptsInputObjectSchema as LessonUpdateToOneWithWhereWithoutAttemptsInputObjectSchema } from './LessonUpdateToOneWithWhereWithoutAttemptsInput.schema';
import { LessonUpdateWithoutAttemptsInputObjectSchema as LessonUpdateWithoutAttemptsInputObjectSchema } from './LessonUpdateWithoutAttemptsInput.schema';
import { LessonUncheckedUpdateWithoutAttemptsInputObjectSchema as LessonUncheckedUpdateWithoutAttemptsInputObjectSchema } from './LessonUncheckedUpdateWithoutAttemptsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAttemptsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutAttemptsInputObjectSchema).optional(),
  upsert: z.lazy(() => LessonUpsertWithoutAttemptsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => LessonUpdateToOneWithWhereWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUpdateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutAttemptsInputObjectSchema)]).optional()
}).strict();
export const LessonUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema: z.ZodType<Prisma.LessonUpdateOneRequiredWithoutAttemptsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateOneRequiredWithoutAttemptsNestedInput>;
export const LessonUpdateOneRequiredWithoutAttemptsNestedInputObjectZodSchema = makeSchema();
