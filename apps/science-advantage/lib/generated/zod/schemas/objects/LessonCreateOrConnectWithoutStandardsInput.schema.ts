import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonCreateWithoutStandardsInputObjectSchema as LessonCreateWithoutStandardsInputObjectSchema } from './LessonCreateWithoutStandardsInput.schema';
import { LessonUncheckedCreateWithoutStandardsInputObjectSchema as LessonUncheckedCreateWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCreateWithoutStandardsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutStandardsInputObjectSchema)])
}).strict();
export const LessonCreateOrConnectWithoutStandardsInputObjectSchema: z.ZodType<Prisma.LessonCreateOrConnectWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateOrConnectWithoutStandardsInput>;
export const LessonCreateOrConnectWithoutStandardsInputObjectZodSchema = makeSchema();
