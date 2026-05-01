import * as z from 'zod';
export const AssignmentCreateResultSchema = z.object({
  id: z.string(),
  classId: z.string(),
  lessonId: z.string(),
  assignedAt: z.date(),
  dueAt: z.date().optional(),
  assignedBy: z.string(),
  class: z.unknown(),
  lesson: z.unknown(),
  teacher: z.unknown(),
  createdAt: z.date()
});