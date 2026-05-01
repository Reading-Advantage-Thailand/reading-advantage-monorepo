import * as z from 'zod';
export const MasteryRunAggregateResultSchema = z.object({  _count: z.object({
    attemptId: z.number(),
    studentId: z.number(),
    status: z.number(),
    updatedCount: z.number(),
    lastError: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    attempt: z.number(),
    student: z.number()
  }).optional(),
  _sum: z.object({
    updatedCount: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    updatedCount: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    attemptId: z.string().nullable(),
    studentId: z.string().nullable(),
    updatedCount: z.number().int().nullable(),
    lastError: z.string().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    attemptId: z.string().nullable(),
    studentId: z.string().nullable(),
    updatedCount: z.number().int().nullable(),
    lastError: z.string().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()});