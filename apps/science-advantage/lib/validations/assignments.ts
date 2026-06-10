import { z } from 'zod';

/**
 * Schema for creating a new assignment (POST /api/classes/{classId}/assignments).
 * lessonId must be a valid UUID. dueAt is an optional ISO 8601 datetime string.
 */
export const createAssignmentSchema = z.object({
  lessonId: z.string().uuid('lessonId must be a valid UUID'),
  dueAt: z.string().datetime({ offset: true }).optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

/**
 * Schema for deleting an assignment (DELETE /api/classes/{classId}/assignments).
 * assignmentId must be a valid UUID.
 */
export const deleteAssignmentSchema = z.object({
  assignmentId: z.string().uuid('assignmentId must be a valid UUID'),
});

export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>;
