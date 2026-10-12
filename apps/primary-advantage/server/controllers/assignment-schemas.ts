import { z } from "zod";

/** The body of `POST /api/assignments`, as the teacher assign form sends it. */
export const CreateAssignmentBodySchema = z.object({
  classroomId: z.string().min(1),
  articleId: z.string().min(1),
  students: z.array(z.string().min(1)).min(1).max(500),
  name: z.string().min(1).max(500),
  description: z.string().max(5000),
  dueDate: z.coerce.date(),
});

/** The body of `POST /api/assignments/[id]`, as the lesson progress bar sends it. */
export const LessonProgressBodySchema = z.object({
  articleId: z.string().min(1),
  progress: z.number().min(0).max(100),
  timeSpent: z.number().min(0),
});
