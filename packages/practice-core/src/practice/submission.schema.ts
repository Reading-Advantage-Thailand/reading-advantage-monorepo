import { z } from 'zod';

export const PracticeTimingConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type PracticeTimingConfidence = z.infer<typeof PracticeTimingConfidenceSchema>;

export const PracticeTimingSummarySchema = z
  .object({
    startedAt: z.string().min(1),
    submittedAt: z.string().min(1),
    wallClockMs: z.number().nonnegative(),
    activeMs: z.number().nonnegative(),
    idleMs: z.number().nonnegative(),
    pauseCount: z.number().int().nonnegative(),
    focusLossCount: z.number().int().nonnegative(),
    visibilityHiddenCount: z.number().int().nonnegative(),
    longestIdleMs: z.number().nonnegative().optional(),
    confidence: PracticeTimingConfidenceSchema,
    confidenceReasons: z.array(z.string()).optional(),
  })
  .refine((data) => data.activeMs <= data.wallClockMs, {
    message: 'activeMs cannot exceed wallClockMs',
    path: ['activeMs'],
  });

export type PracticeTimingSummary = z.infer<typeof PracticeTimingSummarySchema>;

export const PracticeSubmissionPartSchema = z.object({
  partId: z.string().trim().min(1),
  rawAnswer: z.unknown(),
  normalizedAnswer: z.string().optional(),
  isCorrect: z.boolean().optional(),
  score: z.number().optional(),
  maxScore: z.number().optional(),
  misconceptionTags: z.array(z.string()).optional(),
  hintsUsed: z.number().int().nonnegative().optional(),
  revealStepsSeen: z.number().int().nonnegative().optional(),
  changedCount: z.number().int().nonnegative().optional(),
  firstInteractionAt: z.string().min(1).optional(),
  answeredAt: z.string().min(1).optional(),
  wallClockMs: z.number().nonnegative().optional(),
  activeMs: z.number().nonnegative().optional(),
});

export type PracticeSubmissionPart = z.infer<typeof PracticeSubmissionPartSchema>;

export const PracticeSubmissionEnvelopeSchema = z.object({
  contractVersion: z.literal('practice.v1'),
  activityId: z.string(),
  mode: z.enum(['worked_example', 'guided_practice', 'independent_practice', 'assessment', 'teaching']),
  status: z.enum(['draft', 'submitted', 'graded', 'returned']),
  attemptNumber: z.number().int().positive(),
  submittedAt: z.string(),
  answers: z.record(z.string(), z.unknown()),
  parts: z.array(PracticeSubmissionPartSchema),
  artifact: z.record(z.string(), z.unknown()).optional(),
  interactionHistory: z.array(z.unknown()).optional(),
  analytics: z.record(z.string(), z.unknown()).optional(),
  studentFeedback: z.string().optional(),
  teacherSummary: z.string().optional(),
  timing: PracticeTimingSummarySchema.optional(),
});

export type PracticeSubmissionEnvelope = z.infer<typeof PracticeSubmissionEnvelopeSchema>;
