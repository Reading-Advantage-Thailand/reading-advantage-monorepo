import { z } from "zod";

const scriptSceneSchema = z
  .object({
    narration: z.string().min(1),
    imagePrompt: z.string().min(1),
    motionDirection: z.string().min(1),
  })
  .strict();

/** Validates the persisted structural contract for a 5–7 scene script. */
export const scriptSchema = z.array(scriptSceneSchema).min(5).max(7);

/**
 * Reports whether narration contains at least one Thai code point.
 * @param narration The scene narration to inspect.
 * @returns Whether the narration contains Thai-language characters.
 */
export function containsThaiNarration(narration: string): boolean {
  return /[\u0E00-\u0E7F]/u.test(narration);
}

/**
 * Validates generated scripts, requiring Thai narration in every scene.
 *
 * Persisted scripts continue to use `scriptSchema` so editors can surface
 * legacy drafts. New AI output must pass this stronger generation boundary.
 */
export const thaiNarrationScriptSchema = scriptSchema.superRefine(
  (scenes, context) => {
    scenes.forEach((scene, index) => {
      if (!containsThaiNarration(scene.narration)) {
        context.addIssue({
          code: "custom",
          path: [index, "narration"],
          message: "Narration must contain Thai-language characters",
        });
      }
    });
  },
);

/** One structurally valid Marketing script scene. */
export type ScriptScene = z.infer<typeof scriptSceneSchema>;

/** A structurally valid 5–7 scene Marketing script. */
export type Script = z.infer<typeof scriptSchema>;
