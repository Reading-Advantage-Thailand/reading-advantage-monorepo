import * as z from 'zod';
export const AssignmentFindManyResultSchema = z.object({
  data: z.array(z.object({
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
})),
  pagination: z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})
});