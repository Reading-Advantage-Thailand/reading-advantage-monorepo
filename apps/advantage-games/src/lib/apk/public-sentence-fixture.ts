import type { SentenceInput } from "@reading-advantage/game-contracts";

/** Deterministic sentence input for public local APK development routes. */
export const PUBLIC_ARCADE_SENTENCE_FIXTURE = Object.freeze([
  Object.freeze({ term: "The dragon crosses the bridge", translation: "มังกรข้ามสะพาน" }),
  Object.freeze({ term: "A lantern glows in the forest", translation: "โคมไฟส่องแสงในป่า" }),
] satisfies SentenceInput);
