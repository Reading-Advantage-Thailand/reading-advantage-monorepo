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
 * Reports whether Thai letters form a meaningful majority of narration.
 * @param narration The scene narration to inspect.
 * @returns Whether at least three Thai letters make up half of all letters.
 */
export function containsThaiNarration(narration: string): boolean {
  const letters = [...narration].filter((character) => /\p{L}/u.test(character));
  const thaiLetters = letters.filter((character) =>
    /\p{Script=Thai}/u.test(character),
  );
  return thaiLetters.length >= 3 && thaiLetters.length / letters.length >= 0.5;
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
