import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  slug: z.literal(true).optional(),
  title: z.literal(true).optional(),
  titleThai: z.literal(true).optional(),
  description: z.literal(true).optional(),
  descriptionThai: z.literal(true).optional(),
  content: z.literal(true).optional(),
  structuredContent: z.literal(true).optional(),
  lessonType: z.literal(true).optional(),
  gradeLevel: z.literal(true).optional(),
  order: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional(),
  _all: z.literal(true).optional()
}).strict();
export const LessonCountAggregateInputObjectSchema: z.ZodType<Prisma.LessonCountAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.LessonCountAggregateInputType>;
export const LessonCountAggregateInputObjectZodSchema = makeSchema();
