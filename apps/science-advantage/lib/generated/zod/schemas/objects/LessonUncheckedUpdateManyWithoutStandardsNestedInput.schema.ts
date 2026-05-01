import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutStandardsInputObjectSchema as LessonCreateWithoutStandardsInputObjectSchema } from './LessonCreateWithoutStandardsInput.schema';
import { LessonUncheckedCreateWithoutStandardsInputObjectSchema as LessonUncheckedCreateWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateWithoutStandardsInput.schema';
import { LessonCreateOrConnectWithoutStandardsInputObjectSchema as LessonCreateOrConnectWithoutStandardsInputObjectSchema } from './LessonCreateOrConnectWithoutStandardsInput.schema';
import { LessonUpsertWithWhereUniqueWithoutStandardsInputObjectSchema as LessonUpsertWithWhereUniqueWithoutStandardsInputObjectSchema } from './LessonUpsertWithWhereUniqueWithoutStandardsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateWithWhereUniqueWithoutStandardsInputObjectSchema as LessonUpdateWithWhereUniqueWithoutStandardsInputObjectSchema } from './LessonUpdateWithWhereUniqueWithoutStandardsInput.schema';
import { LessonUpdateManyWithWhereWithoutStandardsInputObjectSchema as LessonUpdateManyWithWhereWithoutStandardsInputObjectSchema } from './LessonUpdateManyWithWhereWithoutStandardsInput.schema';
import { LessonScalarWhereInputObjectSchema as LessonScalarWhereInputObjectSchema } from './LessonScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutStandardsInputObjectSchema), z.lazy(() => LessonCreateWithoutStandardsInputObjectSchema).array(), z.lazy(() => LessonUncheckedCreateWithoutStandardsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutStandardsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCreateOrConnectWithoutStandardsInputObjectSchema), z.lazy(() => LessonCreateOrConnectWithoutStandardsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => LessonUpsertWithWhereUniqueWithoutStandardsInputObjectSchema), z.lazy(() => LessonUpsertWithWhereUniqueWithoutStandardsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => LessonUpdateWithWhereUniqueWithoutStandardsInputObjectSchema), z.lazy(() => LessonUpdateWithWhereUniqueWithoutStandardsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => LessonUpdateManyWithWhereWithoutStandardsInputObjectSchema), z.lazy(() => LessonUpdateManyWithWhereWithoutStandardsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => LessonScalarWhereInputObjectSchema), z.lazy(() => LessonScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const LessonUncheckedUpdateManyWithoutStandardsNestedInputObjectSchema: z.ZodType<Prisma.LessonUncheckedUpdateManyWithoutStandardsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUncheckedUpdateManyWithoutStandardsNestedInput>;
export const LessonUncheckedUpdateManyWithoutStandardsNestedInputObjectZodSchema = makeSchema();
