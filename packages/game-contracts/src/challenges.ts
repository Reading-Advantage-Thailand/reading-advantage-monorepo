import { z } from "zod";

import {
  sentenceInputSchema,
  vocabularyInputSchema,
} from "./educational-io.js";
import { gameDifficultySchema } from "./completion.js";
import {
  readToSelectAudioSessionConfigSchema,
} from "./listening.js";

const MAX_CHALLENGE_ITEMS = 50;
const safeCountSchema = z.number().int().min(1).max(1_000_000);
const seedSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const timestampSchema = z.string().datetime({ offset: true });
const boundedIdSchema = z.string().trim().min(1).max(128);

/** Reading configuration for a challenge that does not use answer audio. */
export const challengeReadingModalitySchema = z.object({
  modality: z.literal("reading"),
  promptLocale: z.literal("th-TH"),
  answerLocale: z.literal("en-US"),
  promptField: z.literal("translation"),
  answerField: z.literal("term"),
  scored: z.literal(true),
}).strict();

const challengeAnswerAudioModalitySchema = readToSelectAudioSessionConfigSchema.refine(
  ({ scored }) => scored,
  { message: "Comparable answer audio must be scored", path: ["scored"] },
);

/** Supported learning modality pinned by a comparable challenge. */
export const challengeModalitySchema = z.union([
  challengeReadingModalitySchema,
  challengeAnswerAudioModalitySchema,
]);

/** Exact server-owned learning content for one comparable challenge. */
export const challengeContentSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("vocabulary"),
    items: vocabularyInputSchema.min(1).max(MAX_CHALLENGE_ITEMS),
  }).strict(),
  z.object({
    mode: z.literal("sentence"),
    items: sentenceInputSchema.min(1).max(MAX_CHALLENGE_ITEMS),
  }).strict(),
]).superRefine((content, context) => {
  content.items.forEach((item, index) => {
    for (const field of ["term", "translation"] as const) {
      if (!item[field].trim() || item[field].length > 2_000) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Challenge learning text must contain 1 to 2000 visible characters",
          path: ["items", index, field],
        });
      }
    }
  });
});

/** Server-owned class challenge definition with comparable run settings. */
export const classChallengeDefinitionSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  createdByUserId: boundedIdSchema,
  title: z.string().trim().min(1).max(100),
  gameId: boundedIdSchema,
  gameVersion: boundedIdSchema,
  contentLocale: z.literal("th"),
  content: challengeContentSchema,
  seed: seedSchema,
  difficulty: gameDifficultySchema,
  modality: challengeModalitySchema,
  startsAt: timestampSchema,
  expiresAt: timestampSchema,
  target: safeCountSchema,
  teacherParticipationEnabled: z.boolean(),
}).strict().superRefine((definition, context) => {
  if (Date.parse(definition.startsAt) >= Date.parse(definition.expiresAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Challenge expiry must follow its start",
      path: ["expiresAt"],
    });
  }
});

/** Browser-safe challenge summary without learning content or answers. */
export const classChallengePublicSummarySchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  gameId: boundedIdSchema,
  gameVersion: boundedIdSchema,
  contentMode: z.enum(["vocabulary", "sentence"]),
  contentLocale: z.literal("th"),
  contentItemCount: z.number().int().min(1).max(MAX_CHALLENGE_ITEMS),
  seed: seedSchema,
  difficulty: gameDifficultySchema,
  modality: challengeModalitySchema,
  startsAt: timestampSchema,
  expiresAt: timestampSchema,
  target: safeCountSchema,
  contributionCount: z.number().int().min(0).max(1_000_000),
}).strict().superRefine((summary, context) => {
  if (Date.parse(summary.startsAt) >= Date.parse(summary.expiresAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Challenge expiry must follow its start",
      path: ["expiresAt"],
    });
  }
});

/** Student launch issued by the server for one eligible challenge run. */
export const studentChallengeRunLaunchSchema = z.object({
  runId: z.string().uuid(),
  challengeId: z.string().uuid(),
  userId: boundedIdSchema,
  challenge: classChallengePublicSummarySchema,
  content: challengeContentSchema,
  issuedAt: timestampSchema,
  expiresAt: timestampSchema,
}).strict().superRefine((launch, context) => {
  const mismatches = [
    launch.challengeId !== launch.challenge.id,
    launch.content.mode !== launch.challenge.contentMode,
    launch.content.items.length !== launch.challenge.contentItemCount,
  ];
  if (mismatches.some(Boolean)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Challenge launch must match its public summary",
      path: ["challenge"],
    });
  }
  const issuedAt = Date.parse(launch.issuedAt);
  const runExpiresAt = Date.parse(launch.expiresAt);
  if (issuedAt < Date.parse(launch.challenge.startsAt) || issuedAt >= runExpiresAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Challenge run must start during its eligibility window",
      path: ["issuedAt"],
    });
  }
  if (runExpiresAt > Date.parse(launch.challenge.expiresAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Challenge run cannot outlive its challenge",
      path: ["expiresAt"],
    });
  }
});

/** Opaque reference that links a completion request to a server-owned run. */
export const challengeCompletionRunReferenceSchema = z.object({
  runId: z.string().uuid(),
}).strict();

/** Server-owned class challenge definition. */
export type ClassChallengeDefinition = z.infer<typeof classChallengeDefinitionSchema>;

/** Browser-safe class challenge summary. */
export type ClassChallengePublicSummary = z.infer<typeof classChallengePublicSummarySchema>;

/** Student launch for one server-issued challenge run. */
export type StudentChallengeRunLaunch = z.infer<typeof studentChallengeRunLaunchSchema>;

/** Opaque completion reference for one challenge run. */
export type ChallengeCompletionRunReference = z.infer<typeof challengeCompletionRunReferenceSchema>;
