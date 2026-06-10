import { z } from "zod";

export const submitScienceAttemptInputSchema = z.object({
  lessonId: z.string().min(1),
  score: z.number(),
  maxScore: z.number(),
  attemptNumber: z.number().int().min(1),
});

export type SubmitScienceAttemptInput = z.infer<typeof submitScienceAttemptInputSchema>;

export const getStudentScienceAttemptsInputSchema = z.object({
  studentId: z.string().min(1),
  lessonId: z.string().min(1),
});

export type GetStudentScienceAttemptsInput = z.infer<typeof getStudentScienceAttemptsInputSchema>;
