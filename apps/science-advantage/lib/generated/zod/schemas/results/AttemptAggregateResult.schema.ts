import * as z from 'zod';
export const AttemptAggregateResultSchema = z.object({  _count: z.object({
    id: z.number(),
    studentId: z.number(),
    lessonId: z.number(),
    score: z.number(),
    maxScore: z.number(),
    attemptNumber: z.number(),
    startedAt: z.number(),
    completedAt: z.number(),
    student: z.number(),
    lesson: z.number(),
    questionResponses: z.number(),
    masteryRun: z.number(),
    createdAt: z.number(),
    updatedAt: z.number()
  }).optional(),
  _sum: z.object({
    score: z.number().nullable(),
    maxScore: z.number().nullable(),
    attemptNumber: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    score: z.number().nullable(),
    maxScore: z.number().nullable(),
    attemptNumber: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    studentId: z.string().nullable(),
    lessonId: z.string().nullable(),
    score: z.number().nullable(),
    maxScore: z.number().nullable(),
    attemptNumber: z.number().int().nullable(),
    startedAt: z.date().nullable(),
    completedAt: z.date().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    studentId: z.string().nullable(),
    lessonId: z.string().nullable(),
    score: z.number().nullable(),
    maxScore: z.number().nullable(),
    attemptNumber: z.number().int().nullable(),
    startedAt: z.date().nullable(),
    completedAt: z.date().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()});