import { z } from "zod";

export const createAssignmentInputSchema = z.object({
  title: z.string().min(1),
  classroomId: z.string().min(1),
  articleId: z.string().optional(),
  lessonId: z.string().optional(),
  dueDate: z.date().optional(),
  type: z.string().min(1),
  studentIds: z.array(z.string()).optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

export const updateAssignmentInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  dueDate: z.date().nullable().optional(),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentInputSchema>;

export const submitAssignmentInputSchema = z.object({
  assignmentId: z.string().min(1),
  score: z.number(),
});

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentInputSchema>;
