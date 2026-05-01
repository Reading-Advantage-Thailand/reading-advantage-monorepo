import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutStandardsInputObjectSchema as LessonCreateWithoutStandardsInputObjectSchema } from './LessonCreateWithoutStandardsInput.schema';
import { LessonUncheckedCreateWithoutStandardsInputObjectSchema as LessonUncheckedCreateWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateWithoutStandardsInput.schema';
import { LessonCreateOrConnectWithoutStandardsInputObjectSchema as LessonCreateOrConnectWithoutStandardsInputObjectSchema } from './LessonCreateOrConnectWithoutStandardsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutStandardsInputObjectSchema), z.lazy(() => LessonCreateWithoutStandardsInputObjectSchema).array(), z.lazy(() => LessonUncheckedCreateWithoutStandardsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutStandardsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCreateOrConnectWithoutStandardsInputObjectSchema), z.lazy(() => LessonCreateOrConnectWithoutStandardsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const LessonCreateNestedManyWithoutStandardsInputObjectSchema: z.ZodType<Prisma.LessonCreateNestedManyWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateNestedManyWithoutStandardsInput>;
export const LessonCreateNestedManyWithoutStandardsInputObjectZodSchema = makeSchema();
