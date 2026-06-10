import { z } from 'zod';

/**
 * Schema for submitting a quiz attempt (POST /api/lessons/{lessonSlug}/quiz).
 * attemptId must be a valid UUID. responses is a non-empty array of answer objects.
 */
export const submitQuizAttemptSchema = z.object({
  attemptId: z.string().uuid('attemptId must be a valid UUID'),
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1),
        studentAnswer: z.unknown(),
        timeSpentSeconds: z.number().nonnegative().optional(),
        answeredAt: z.string().datetime({ offset: true }).optional(),
        order: z.number().int().positive().optional(),
      })
    )
    .min(1, 'At least one response is required'),
});

export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
