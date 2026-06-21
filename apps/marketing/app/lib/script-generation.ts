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
