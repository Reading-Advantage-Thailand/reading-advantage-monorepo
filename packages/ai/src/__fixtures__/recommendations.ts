/**
 * Captured production-shape response for the science-advantage
 * `recommendationSchema` (defined in
 * `apps/science-advantage/lib/ai/recommendation-service.ts:16-32`).
 *
 * Used by:
 *   - Phase 2 mock-provider snapshot test
 *   - Phase 6 RecommendationService regression net
 *   - The shared contract harness (`__fixtures__/contract-suite.ts`)
 *
 * The fixture intentionally exercises every field in the schema (required
 * minimums, optional defaults, and a non-empty `nextBestAlternatives` array)
 * so the snapshot is sensitive to any future drift in either the schema or
 * the mock provider's pass-through behaviour.
 *
 * If `recommendationSchema` changes, update this fixture in the same change
 * and re-run snapshots — that is the contract that protects Phases 3-7 from
 * silent drift.
 */
import { z } from "zod";

/**
 * Re-declaration of the science-advantage `recommendationSchema` shape.
 * Kept locally so `packages/ai` does not import from an application package.
 * Must remain structurally equivalent to
 * `apps/science-advantage/lib/ai/recommendation-service.ts:16`.
 */
export const recommendationFixtureSchema = z.object({
  recommendedLessonId: z.string().min(1),
  recommendedLessonSlug: z.string().min(1),
  lessonTitle: z.string().min(1),
  focusStandards: z.array(z.string().min(1)).min(1).max(5),
  reasoning: z.string().min(10).max(500),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  nextBestAlternatives: z
    .array(
      z.object({
        lessonId: z.string().min(1),
        lessonTitle: z.string().min(1),
      })
    )
    .max(3)
    .default([]),
});

/**
 * Inferred TypeScript shape for the recommendation fixture.
 */
export type RecommendationFixture = z.infer<typeof recommendationFixtureSchema>;

/**
 * Deterministic captured response satisfying `recommendationFixtureSchema`.
 * Treat this object as immutable — call sites should clone before mutating.
 */
export const recommendationFixture: RecommendationFixture = {
  recommendedLessonId: "lesson_ngss_ms_ps1_1_atoms",
  recommendedLessonSlug: "atoms-and-molecules",
  lessonTitle: "Atoms and Molecules: Building Blocks of Matter",
  focusStandards: ["MS-PS1-1", "MS-PS1-4"],
  reasoning:
    "The student answered 2 of 5 questions correctly on the diagnostic, with errors concentrated on subatomic-particle identification. Re-anchoring with the atoms-and-molecules lesson rebuilds the prerequisite model before progressing to chemical reactions.",
  confidence: "high",
  nextBestAlternatives: [
    {
      lessonId: "lesson_ngss_ms_ps1_2_chemical_change",
      lessonTitle: "Evidence of a Chemical Reaction",
    },
    {
      lessonId: "lesson_ngss_ms_ps1_3_synthetic_materials",
      lessonTitle: "Synthetic Materials and Their Sources",
    },
  ],
};

/**
 * The deterministic prompt that produced `recommendationFixture` in
 * production. Used to drive the snapshot test in
 * `__tests__/phase-2-mock-provider.test.ts`.
 */
export const recommendationFixturePrompt =
  "Student: stu_test_001, mastery 0.42 on MS-PS1-1. Candidate lessons: " +
  "atoms-and-molecules, evidence-of-a-chemical-reaction, synthetic-materials. " +
  "Recommend the next best lesson and rationale.";
