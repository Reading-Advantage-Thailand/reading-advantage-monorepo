import * as z from 'zod';
export const StandardAggregateResultSchema = z.object({  _count: z.object({
    id: z.number(),
    framework: z.number(),
    code: z.number(),
    description: z.number(),
    gradeLevel: z.number(),
    lessons: z.number(),
    quizQuestions: z.number(),
    masteryRecords: z.number()
  }).optional(),
  _sum: z.object({
    gradeLevel: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    gradeLevel: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    code: z.string().nullable(),
    description: z.string().nullable(),
    gradeLevel: z.number().int().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    code: z.string().nullable(),
    description: z.string().nullable(),
    gradeLevel: z.number().int().nullable()
  }).nullable().optional()});