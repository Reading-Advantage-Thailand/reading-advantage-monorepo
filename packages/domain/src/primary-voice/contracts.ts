import { z } from "zod";

/** The 0-5 scores of a practice session (FR-12). */
export const voiceScoresSchema = z
  .object({
    fluency: z.number().int().min(0).max(5),
    grammar: z.number().int().min(0).max(5),
    vocabulary: z.number().int().min(0).max(5),
    pronunciation: z.number().int().min(0).max(5),
  })
  .strict();

/** The private summary of a session; no transcript. */
export const voiceSummarySchema = z
  .object({
    summaryTh: z.string().max(1000),
    strengths: z.array(z.string().max(300)).max(3),
    improvements: z.array(z.string().max(300)).max(3),
    practicedTopics: z.array(z.string().max(300)).max(5).default([]),
  })
  .strict();

/** Why a student cannot start a session now. */
export const voiceBlockSchema = z.enum(["DISABLED", "SCHOOL_DISABLED", "AUTH_STRENGTH", "NO_AVATAR", "SESSION_ACTIVE", "QUOTA_EXHAUSTED"]);

/** What the student may do this month (FR-1 to FR-6). */
export const voiceEntitlementSchema = z
  .object({
    enabled: z.boolean(),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    budgetSeconds: z.number().int().nonnegative(),
    usedSeconds: z.number().int().nonnegative(),
    remainingSeconds: z.number().int().nonnegative(),
    sessionCapSeconds: z.number().int().positive(),
    activeSession: z.object({ sessionId: z.string(), expiresAt: z.string().datetime(), articleId: z.string().nullable() }).nullable(),
    blockedBy: voiceBlockSchema.nullable(),
  })
  .strict();

/** What the browser sends to start a session: the lesson and its WebRTC offer. */
export const startVoiceSessionInputSchema = z
  .object({
    articleId: z.string().uuid().nullable().default(null),
    sdp: z.string().min(1).max(100_000).refine((value) => value.startsWith("v=0"), "an SDP offer starts with v=0"),
  })
  .strict();

/** What the browser gets back: the provider answer and the reservation. */
export const startVoiceSessionOutputSchema = z
  .object({
    sessionId: z.string(),
    answerSdp: z.string(),
    expiresAt: z.string().datetime(),
    reservedSeconds: z.number().int().positive(),
    remainingSeconds: z.number().int().nonnegative(),
  })
  .strict();

/** The end reasons a client may send. */
export const voiceEndReasonSchema = z.enum(["USER_ENDED", "CONNECTION_LOST", "PAGE_CLOSED"]);

/** A finished session as the student and the teacher see it. */
export const voiceSessionRecordSchema = z
  .object({
    sessionId: z.string(),
    articleId: z.string().nullable(),
    status: z.string(),
    consumedSeconds: z.number().int().nonnegative(),
    startedAt: z.string().datetime().nullable(),
    endedAt: z.string().datetime().nullable(),
    endReason: z.string().nullable(),
    summary: voiceSummarySchema.nullable(),
    scores: voiceScoresSchema.nullable(),
  })
  .strict();

export type VoiceScores = z.infer<typeof voiceScoresSchema>;
export type VoiceSummary = z.infer<typeof voiceSummarySchema>;
export type VoiceBlock = z.infer<typeof voiceBlockSchema>;
export type VoiceEntitlement = z.infer<typeof voiceEntitlementSchema>;
export type StartVoiceSessionInput = z.input<typeof startVoiceSessionInputSchema>;
export type StartVoiceSessionOutput = z.infer<typeof startVoiceSessionOutputSchema>;
export type VoiceEndReason = z.infer<typeof voiceEndReasonSchema>;
export type VoiceSessionRecord = z.infer<typeof voiceSessionRecordSchema>;
