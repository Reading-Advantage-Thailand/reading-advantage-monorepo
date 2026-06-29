import { z } from "zod";

/**
 * Zod-backed schema for the marketing video pipeline.
 *
 * Per `measure/tracks/video_pipeline_20260613/spec.md` FR-2:
 *   - Script output is a JSON array of 5–7 scenes.
 *   - Each scene contains `narration`, `imagePrompt`, and `motionDirection`.
 *
 * The scene object is `strict()` so unknown fields are rejected, matching
 * the contract asserted by the Red tests in
 * `apps/marketing/app/__tests__/phase-6-script.test.ts` (Phase 3 Zod suite).
 */
const scriptSceneSchema = z
  .object({
    narration: z.string().min(1),
    imagePrompt: z.string().min(1),
    motionDirection: z.string().min(1),
  })
  .strict();

export const scriptSchema = z.array(scriptSceneSchema).min(5).max(7);

export type ScriptScene = z.infer<typeof scriptSceneSchema>;
export type Script = z.infer<typeof scriptSchema>;