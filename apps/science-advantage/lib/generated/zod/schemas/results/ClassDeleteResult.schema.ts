import * as z from 'zod';
export const ClassDeleteResultSchema = z.nullable(z.object({
  id: z.string(),
  name: z.string(),
  gradeLevel: z.number().int(),
  standardsAlignment: z.unknown(),
  joinCode: z.string(),
  teacherId: z.string(),
  teacher: z.unknown(),
  students: z.array(z.unknown()),
  curriculumUnits: z.array(z.unknown()),
  assignments: z.array(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date()
}));