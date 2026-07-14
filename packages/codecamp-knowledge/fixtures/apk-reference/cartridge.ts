export const cartridgeManifest = {
  id: "apk.reference.word-match", title: "Word Match Reference", description: "Complete instructor reference cartridge.",
  version: "1.0.0", runtimeApiVersion: "1.0.0", inputMode: "vocabulary" as const,
  requiredAssetBindings: ["background", "card", "success"], capabilities: ["pointer", "keyboard", "reduced-motion"],
};

/** Complete deterministic reference matcher used by the I Do annotated walkthrough. */
export function matchesWord(promptId: string, answerId: string, expectedByPrompt: Record<string, string>): boolean {
  return expectedByPrompt[promptId] === answerId;
}
