import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateWithoutLessonsInputObjectSchema as StandardUpdateWithoutLessonsInputObjectSchema } from './StandardUpdateWithoutLessonsInput.schema';
import { StandardUncheckedUpdateWithoutLessonsInputObjectSchema as StandardUncheckedUpdateWithoutLessonsInputObjectSchema } from './StandardUncheckedUpdateWithoutLessonsInput.schema';
import { StandardCreateWithoutLessonsInputObjectSchema as StandardCreateWithoutLessonsInputObjectSchema } from './StandardCreateWithoutLessonsInput.schema';
import { StandardUncheckedCreateWithoutLessonsInputObjectSchema as StandardUncheckedCreateWithoutLessonsInputObjectSchema } from './StandardUncheckedCreateWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => StandardUpdateWithoutLessonsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutLessonsInputObjectSchema)]),
  create: z.union([z.lazy(() => StandardCreateWithoutLessonsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutLessonsInputObjectSchema)])
}).strict();
export const StandardUpsertWithWhereUniqueWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardUpsertWithWhereUniqueWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpsertWithWhereUniqueWithoutLessonsInput>;
export const StandardUpsertWithWhereUniqueWithoutLessonsInputObjectZodSchema = makeSchema();
