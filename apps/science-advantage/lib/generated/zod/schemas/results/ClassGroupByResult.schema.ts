import * as z from 'zod';
export const ClassGroupByResultSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  gradeLevel: z.number().int(),
  joinCode: z.string(),
  teacherId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    id: z.number(),
    name: z.number(),
    gradeLevel: z.number(),
    standardsAlignment: z.number(),
    joinCode: z.number(),
    teacherId: z.number(),
    teacher: z.number(),
    students: z.number(),
    curriculumUnits: z.number(),
    assignments: z.number(),
    createdAt: z.number(),
    updatedAt: z.number()
  }).optional(),
  _sum: z.object({
    gradeLevel: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    gradeLevel: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    gradeLevel: z.number().int().nullable(),
    joinCode: z.string().nullable(),
    teacherId: z.string().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    gradeLevel: z.number().int().nullable(),
    joinCode: z.string().nullable(),
    teacherId: z.string().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()
}));