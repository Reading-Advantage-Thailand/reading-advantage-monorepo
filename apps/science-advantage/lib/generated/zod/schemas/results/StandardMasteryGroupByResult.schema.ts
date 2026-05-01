import * as z from 'zod';
export const StandardMasteryGroupByResultSchema = z.array(z.object({
  id: z.string(),
  studentId: z.string(),
  standardId: z.string(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int(),
  lastAssessedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    id: z.number(),
    studentId: z.number(),
    standardId: z.number(),
    masteryLevel: z.number(),
    evidenceCount: z.number(),
    lastAssessedAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    student: z.number(),
    standard: z.number()
  }).optional(),
  _sum: z.object({
    masteryLevel: z.number().nullable(),
    evidenceCount: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    masteryLevel: z.number().nullable(),
    evidenceCount: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    studentId: z.string().nullable(),
    standardId: z.string().nullable(),
    masteryLevel: z.number().nullable(),
    evidenceCount: z.number().int().nullable(),
    lastAssessedAt: z.date().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    studentId: z.string().nullable(),
    standardId: z.string().nullable(),
    masteryLevel: z.number().nullable(),
    evidenceCount: z.number().int().nullable(),
    lastAssessedAt: z.date().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()
}));