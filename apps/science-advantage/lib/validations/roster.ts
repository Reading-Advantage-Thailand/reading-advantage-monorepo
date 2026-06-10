import { z } from 'zod';

/**
 * Schema for removing a student from a class roster
 * (DELETE /api/classes/{classId}/roster).
 * studentId must be a valid UUID.
 */
export const removeStudentFromRosterSchema = z.object({
  studentId: z.string().uuid('studentId must be a valid UUID'),
});

export type RemoveStudentFromRosterInput = z.infer<
  typeof removeStudentFromRosterSchema
>;
