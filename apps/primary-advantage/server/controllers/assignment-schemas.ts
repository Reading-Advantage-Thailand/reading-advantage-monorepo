import { z } from "zod";

/** A Postgres uuid in text form, so a bad id gives 400 and never reaches SQL. */
export const uuidText = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** The body of `POST /api/assignments`, as the teacher assign form sends it. */
export const CreateAssignmentBodySchema = z.object({
  classroomId: uuidText,
  articleId: uuidText,
  students: z.array(z.string().min(1)).min(1).max(500),
  name: z.string().min(1).max(500),
  description: z.string().max(5000),
  dueDate: z.coerce.date(),
});

/** The body of `POST /api/assignments/[id]`, as the lesson progress bar sends it. */
export const LessonProgressBodySchema = z.object({
  articleId: uuidText,
  progress: z.number().min(0).max(100),
  timeSpent: z.number().min(0),
});
