export const cartridgeManifest = {
  id: "codecamp.independent.sentence-sort",
  title: "Sentence Sort",
  description: "Arrange sentence chunks into a valid sentence.",
  version: "0.1.0",
  runtimeApiVersion: "1.0.0",
  inputMode: "sentence" as const,
  requiredAssetBindings: ["background", "tile", "success"],
  capabilities: ["pointer", "keyboard", "reduced-motion"],
};

/** Independent starter returns serializable state without copying the guided mechanic. */
export function createSentenceSortingCartridge(chunks: string[]) {
  return { remainingChunks: [...chunks], arrangedChunks: [] as string[], completed: false };
}
