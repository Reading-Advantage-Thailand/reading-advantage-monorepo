import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema'

const nestedenumlessoncompletionstatusfilterSchema = z.object({
  equals: LessonCompletionStatusSchema.optional(),
  in: LessonCompletionStatusSchema.array().optional(),
  notIn: LessonCompletionStatusSchema.array().optional(),
  not: z.union([LessonCompletionStatusSchema, z.lazy(() => NestedEnumLessonCompletionStatusFilterObjectSchema)]).optional()
}).strict();
export const NestedEnumLessonCompletionStatusFilterObjectSchema: z.ZodType<Prisma.NestedEnumLessonCompletionStatusFilter> = nestedenumlessoncompletionstatusfilterSchema as unknown as z.ZodType<Prisma.NestedEnumLessonCompletionStatusFilter>;
export const NestedEnumLessonCompletionStatusFilterObjectZodSchema = nestedenumlessoncompletionstatusfilterSchema;
