import { z } from "zod";

export const recordActivityInputSchema = z.object({
  activityType: z.string().min(1),
  xpEarned: z.number().int().optional(),
  metadata: z.string().optional(),
});

export type RecordActivityInput = z.infer<typeof recordActivityInputSchema>;

export const updateLessonProgressInputSchema = z.object({
  lessonId: z.string().min(1),
  status: z.string().min(1),
  progress: z.number(),
});

export type UpdateLessonProgressInput = z.infer<typeof updateLessonProgressInputSchema>;
