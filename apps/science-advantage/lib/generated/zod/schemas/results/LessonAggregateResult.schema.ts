import * as z from 'zod';
export const LessonAggregateResultSchema = z.object({  _count: z.object({
    id: z.number(),
    slug: z.number(),
    title: z.number(),
    titleThai: z.number(),
    description: z.number(),
    descriptionThai: z.number(),
    content: z.number(),
    structuredContent: z.number(),
    lessonType: z.number(),
    gradeLevel: z.number(),
    order: z.number(),
    standards: z.number(),
    curriculumUnits: z.number(),
    quizQuestions: z.number(),
    attempts: z.number(),
    lessonCompletions: z.number(),
    assignments: z.number(),
    createdAt: z.number(),
    updatedAt: z.number()
  }).optional(),
  _sum: z.object({
    gradeLevel: z.number().nullable(),
    order: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    gradeLevel: z.number().nullable(),
    order: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    slug: z.string().nullable(),
    title: z.string().nullable(),
    titleThai: z.string().nullable(),
    description: z.string().nullable(),
    descriptionThai: z.string().nullable(),
    content: z.string().nullable(),
    gradeLevel: z.number().int().nullable(),
    order: z.number().int().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    slug: z.string().nullable(),
    title: z.string().nullable(),
    titleThai: z.string().nullable(),
    description: z.string().nullable(),
    descriptionThai: z.string().nullable(),
    content: z.string().nullable(),
    gradeLevel: z.number().int().nullable(),
    order: z.number().int().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()});