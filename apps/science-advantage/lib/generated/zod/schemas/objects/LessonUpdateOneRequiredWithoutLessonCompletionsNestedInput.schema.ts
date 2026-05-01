import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutLessonCompletionsInputObjectSchema as LessonCreateWithoutLessonCompletionsInputObjectSchema } from './LessonCreateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedCreateWithoutLessonCompletionsInput.schema';
import { LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema as LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema } from './LessonCreateOrConnectWithoutLessonCompletionsInput.schema';
import { LessonUpsertWithoutLessonCompletionsInputObjectSchema as LessonUpsertWithoutLessonCompletionsInputObjectSchema } from './LessonUpsertWithoutLessonCompletionsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema as LessonUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema } from './LessonUpdateToOneWithWhereWithoutLessonCompletionsInput.schema';
import { LessonUpdateWithoutLessonCompletionsInputObjectSchema as LessonUpdateWithoutLessonCompletionsInputObjectSchema } from './LessonUpdateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedUpdateWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema).optional(),
  upsert: z.lazy(() => LessonUpsertWithoutLessonCompletionsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => LessonUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUpdateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema)]).optional()
}).strict();
export const LessonUpdateOneRequiredWithoutLessonCompletionsNestedInputObjectSchema: z.ZodType<Prisma.LessonUpdateOneRequiredWithoutLessonCompletionsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateOneRequiredWithoutLessonCompletionsNestedInput>;
export const LessonUpdateOneRequiredWithoutLessonCompletionsNestedInputObjectZodSchema = makeSchema();
