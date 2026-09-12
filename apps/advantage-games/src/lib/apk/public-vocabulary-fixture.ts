import type { VocabularyInput } from "@reading-advantage/game-contracts";

/** Deterministic vocabulary input for public local APK development routes. */
export const PUBLIC_ARCADE_VOCABULARY_FIXTURE = Object.freeze([
  Object.freeze({ term: "bridge", translation: "สะพาน" }),
  Object.freeze({ term: "forest", translation: "ป่า" }),
  Object.freeze({ term: "lantern", translation: "โคมไฟ" }),
  Object.freeze({ term: "river", translation: "แม่น้ำ" }),
] satisfies VocabularyInput);
