import * as z from 'zod';
export const QuizQuestionAggregateResultSchema = z.object({  _count: z.object({
    id: z.number(),
    slug: z.number(),
    lessonId: z.number(),
    type: z.number(),
    text: z.number(),
    options: z.number(),
    correctAnswer: z.number(),
    points: z.number(),
    order: z.number(),
    version: z.number(),
    lesson: z.number(),
    standards: z.number(),
    responses: z.number(),
    createdAt: z.number(),
    updatedAt: z.number()
  }).optional(),
  _sum: z.object({
    points: z.number().nullable(),
    order: z.number().nullable(),
    version: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    points: z.number().nullable(),
    order: z.number().nullable(),
    version: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    slug: z.string().nullable(),
    lessonId: z.string().nullable(),
    text: z.string().nullable(),
    points: z.number().int().nullable(),
    order: z.number().int().nullable(),
    version: z.number().int().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    slug: z.string().nullable(),
    lessonId: z.string().nullable(),
    text: z.string().nullable(),
    points: z.number().int().nullable(),
    order: z.number().int().nullable(),
    version: z.number().int().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()});