import type { Script } from "@/lib/script-schema";

/**
 * Builds the initial Thai marketing-script generation prompt.
 * @param app The Marketing application key.
 * @param topic The approved campaign topic.
 * @returns A provider-neutral prompt requesting a 5–7 scene JSON script.
 */
export function buildScriptGenerationPrompt(app: string, topic: string): string {
  const appDisplayName = app.replace(/-/g, " ");

  return `You are a Thai marketing scriptwriter for K-12 education in Thailand.

App: ${appDisplayName} (${app})
Topic: ${topic}

Write a Thai-language marketing script for this topic.

Requirements:
- The script must contain 5 to 7 (5–7) scenes total.
- Each scene MUST include three fields:
  - "narration": the Thai voiceover / คำบรรยาย spoken to the viewer
  - "imagePrompt": an English description of the still image prompt that illustrates the scene
  - "motionDirection": how the camera or composition moves — the motion direction (e.g. "Slow zoom in", "Static", "Pan left to right")
- Each scene should build toward a clear call-to-action at the end.
- Use Thai narration throughout — คำบรรยาย must be in Thai language.
- The output must be a single JSON array (no commentary, no markdown, no explanation).

Return ONLY the JSON array.`;
}

/**
 * Builds the single bounded repair prompt for structurally valid scripts whose
 * narration is not Thai in every scene.
 * @param app The Marketing application key.
 * @param topic The approved campaign topic.
 * @param script The structurally valid script requiring narration repair.
 * @returns A prompt preserving scene structure while requiring Thai narration.
 */
export function buildThaiNarrationRepairPrompt(
  app: string,
  topic: string,
  script: Script,
): string {
  return `Repair this marketing script for ${app} and topic "${topic}".

Every scene narration MUST be written in Thai and contain Thai characters.
Preserve the 5–7 scene count, imagePrompt, and motionDirection fields.
Return ONLY the repaired JSON array with no markdown or commentary.

Script to repair:
${JSON.stringify(script)}`;
}
