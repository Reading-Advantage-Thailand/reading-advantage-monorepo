import { z } from "zod";
import {
  challengeContentSchema,
  challengeModalitySchema,
} from "@reading-advantage/game-contracts";
import { gameDifficultyEnum, gameTypeEnum } from "../games/schema.js";

/** Strict teacher input for one server-owned class challenge. */
export const createClassChallengeInputSchema = z.object({
  creationKey: z.string().uuid().optional(),
  classId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  gameId: gameTypeEnum,
  gameVersion: z.string().trim().min(1).max(128),
  contentLocale: z.literal("th"),
  content: challengeContentSchema,
  seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  difficulty: gameDifficultyEnum,
  modality: challengeModalitySchema,
  startsAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  target: z.number().int().min(1).max(1_000_000),
  teacherParticipationEnabled: z.boolean(),
}).strict().superRefine((input, context) => {
  if (Date.parse(input.startsAt) >= Date.parse(input.expiresAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Challenge expiry must follow its start",
      path: ["expiresAt"],
    });
  }
});

/** Strict input for reading public challenges in one class. */
export const listClassChallengesInputSchema = z.object({
  classId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(10_000).default(0),
}).strict();

/** Strict input for listing a student's tenant classes. */
export const listStudentClassesInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(25),
  offset: z.number().int().min(0).max(10_000).default(0),
}).strict();

/** Public class identity for student challenge discovery. */
export const studentChallengeClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
}).strict();

/** Bounded class page for student challenge discovery. */
export const studentChallengeClassPageSchema = z.object({
  classes: studentChallengeClassSchema.array(),
  hasMore: z.boolean(),
}).strict();

/** Strict input for starting one server-issued challenge run. */
export const startClassChallengeRunInputSchema = z.object({
  challengeId: z.string().uuid(),
}).strict();

/** Validated teacher input for creating a class challenge. */
export type CreateClassChallengeInput = z.infer<typeof createClassChallengeInputSchema>;

/** Validated input for listing one class's challenges. */
export type ListClassChallengesInput = z.input<typeof listClassChallengesInputSchema>;

/** Validated input for listing a student's tenant classes. */
export type ListStudentClassesInput = z.input<typeof listStudentClassesInputSchema>;

/** Public student class page. */
export type StudentChallengeClassPage = z.infer<typeof studentChallengeClassPageSchema>;

/** Validated input for starting one server-issued challenge run. */
export type StartClassChallengeRunInput = z.infer<typeof startClassChallengeRunInputSchema>;
