import { z } from "zod";

/**
 * Phase 4 — `recordActivity` input schema (D-06 Tier 1).
 *
 * `.strict()` rejects unknown keys (the host mutations are public-facing
 * in Reading/Primary and must not accept arbitrary extra fields). `xpEarned`
 * is bounded `0..100` to close the B46-031 unbounded-XP hole. `activityType`
 * is bounded `1..64` characters to prevent empty-string and over-long input.
 * `metadata` is optional and bounded to 4 KiB to bound the per-row payload.
 */
export const recordActivityInputSchema = z
  .object({
    activityType: z.string().min(1).max(64),
    xpEarned: z.number().int().min(0).max(100).optional(),
    metadata: z.string().max(4096).optional(),
  })
  .strict();

/**
 * Phase 4 — `updateLessonProgress` input schema (D-06 Tier 1).
 *
 * `.strict()` rejects unknown keys. `lessonId` is a UUID (matches the
 * `lessons.id` column type). `status` is an enum (closes the free-text
 * status hole). `progress` is bounded `0..100`.
 *
 * Tier 2 note (Decision 4.4): the `lessonId` tenant-ownership check is NOT
 * expressed here — it requires an `assignments → classrooms.schoolId` join
 * and is tracked as `[b] deferred:infra` in plan.md Phase 6.
 */
export const updateLessonProgressInputSchema = z
  .object({
    lessonId: z.string().uuid(),
    status: z.enum(["not_started", "in_progress", "completed"]),
    progress: z.number().min(0).max(100),
  })
  .strict();

/**
 * Inferred TypeScript types for the progress domain schemas.
 */
export type RecordActivityInput = z.infer<typeof recordActivityInputSchema>;
export type UpdateLessonProgressInput = z.infer<typeof updateLessonProgressInputSchema>;