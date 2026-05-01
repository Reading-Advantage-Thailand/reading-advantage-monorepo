import * as z from 'zod';
export const AssignmentAggregateResultSchema = z.object({  _count: z.object({
    id: z.number(),
    classId: z.number(),
    lessonId: z.number(),
    assignedAt: z.number(),
    dueAt: z.number(),
    assignedBy: z.number(),
    class: z.number(),
    lesson: z.number(),
    teacher: z.number(),
    createdAt: z.number()
  }).optional(),
  _min: z.object({
    id: z.string().nullable(),
    classId: z.string().nullable(),
    lessonId: z.string().nullable(),
    assignedAt: z.date().nullable(),
    dueAt: z.date().nullable(),
    assignedBy: z.string().nullable(),
    createdAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    classId: z.string().nullable(),
    lessonId: z.string().nullable(),
    assignedAt: z.date().nullable(),
    dueAt: z.date().nullable(),
    assignedBy: z.string().nullable(),
    createdAt: z.date().nullable()
  }).nullable().optional()});