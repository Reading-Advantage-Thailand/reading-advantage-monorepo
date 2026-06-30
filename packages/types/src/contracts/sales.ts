import { z } from "zod";

// ─── Sales Contracts ──────────────────────────────────────
//
// Source of truth for sales-advantage Zod schemas (CA-003, MR-C04).
//
// These schemas were previously defined only in
// `@reading-advantage/domain/sales/schema.ts`. They are duplicated here
// in `@reading-advantage/types` so that:
//   - Frontends, webhooks, and external consumers can validate the same
//     payloads without depending on the domain package.
//   - The shared cross-app contract layer owns the wire format.
//
// Drift between this file and `packages/domain/src/sales/schema.ts` is
// caught by `shared-contracts.test.ts` in `@reading-advantage/types` and
// by structural tests in the domain package. Any change to the wire
// format must update both files.
//
// Types depends only on zod; it cannot import from `@reading-advantage/domain`.

// ─── Curriculum output contracts ──────────────────────────

export const moduleOutputSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  phase: z.string(),
  order: z.number(),
  createdAt: z.coerce.date(),
});

export type ModuleOutput = z.infer<typeof moduleOutputSchema>;

export const lessonOutputSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  type: z.enum(["theory", "roleplay", "quiz"]),
  content: z.string(),
  order: z.number(),
  reviewStatus: z.enum(["draft", "reviewed", "approved"]),
  createdAt: z.coerce.date(),
});

export type LessonOutput = z.infer<typeof lessonOutputSchema>;

export const rubricCriteriaSchema = z.object({
  criterion: z.string(),
  weight: z.number(),
  passingScore: z.number(),
  sourceRef: z.string(),
});

export type RubricCriteria = z.infer<typeof rubricCriteriaSchema>;

export const rubricOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  criteriaJson: z.array(rubricCriteriaSchema),
  reviewStatus: z.enum(["draft", "reviewed", "approved"]),
  createdAt: z.coerce.date(),
});

export type RubricOutput = z.infer<typeof rubricOutputSchema>;

export const roleplayScenarioOutputSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  personaName: z.string(),
  personaRole: z.string(),
  situation: z.string(),
  objective: z.string(),
  prospectContextJson: z.record(z.unknown()),
  rubricId: z.string(),
  order: z.number(),
  createdAt: z.coerce.date(),
});

export type RoleplayScenarioOutput = z.infer<
  typeof roleplayScenarioOutputSchema
>;

// ─── Attempt output contracts ─────────────────────────────

export const roleplayAttemptOutputSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  userId: z.string(),
  audioStorageKey: z.string().nullable(),
  durationMs: z.number(),
  transcriptExcerpt: z.string().nullable(),
  llmScoreJson: z.unknown().nullable(),
  overallScore: z.string().nullable(),
  passed: z.boolean().nullable(),
  llmFeedback: z.string().nullable(),
  attemptNumber: z.number(),
  createdAt: z.coerce.date(),
});

export type RoleplayAttemptOutput = z.infer<typeof roleplayAttemptOutputSchema>;

// ─── Quiz + progress contracts ────────────────────────────

export const quizSubmissionInputSchema = z.object({
  lessonId: z.string().uuid(),
  answers: z.record(z.string()),
});

export type QuizSubmissionInput = z.infer<typeof quizSubmissionInputSchema>;

export const quizResultOutputSchema = z.object({
  lessonId: z.string(),
  score: z.number(),
  passed: z.boolean(),
  results: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      explanation: z.string(),
    }),
  ),
});

export type QuizResultOutput = z.infer<typeof quizResultOutputSchema>;

export const progressOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  lessonId: z.string(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  completedAt: z.coerce.date().nullable(),
  score: z.string().nullable(),
});

export type ProgressOutput = z.infer<typeof progressOutputSchema>;

// ─── Chat contracts ───────────────────────────────────────

/**
 * Sales chat message output contract.
 *
 * Note: `chatMessageInputSchema` for sales is defined in
 * `packages/types/src/codecamp.ts` for the codecamp AI tutor. The sales
 * domain has its own `chatMessageInputSchema` in
 * `@reading-advantage/domain/sales/schema.ts` with a different shape
 * (includes `role` for assistant turns). Wire consumers should use
 * `salesChatMessageInputSchema` to disambiguate.
 */
export const chatMessageOutputSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
});

export type ChatMessageOutput = z.infer<typeof chatMessageOutputSchema>;
