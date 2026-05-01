import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { NestedEnumLessonCompletionStatusFilterObjectSchema as NestedEnumLessonCompletionStatusFilterObjectSchema } from './NestedEnumLessonCompletionStatusFilter.schema'

const makeSchema = () => z.object({
  equals: LessonCompletionStatusSchema.optional(),
  in: LessonCompletionStatusSchema.array().optional(),
  notIn: LessonCompletionStatusSchema.array().optional(),
  not: z.union([LessonCompletionStatusSchema, z.lazy(() => NestedEnumLessonCompletionStatusFilterObjectSchema)]).optional()
}).strict();
export const EnumLessonCompletionStatusFilterObjectSchema: z.ZodType<Prisma.EnumLessonCompletionStatusFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumLessonCompletionStatusFilter>;
export const EnumLessonCompletionStatusFilterObjectZodSchema = makeSchema();
