import type {
  SentenceInput,
  VocabularyInput,
} from "@reading-advantage/game-contracts";

/** One reusable QC content fixture for a cartridge input mode. */
export type APKQCFixture =
  | {
      /** Stable fixture identifier. */
      id: string;
      /** Operator-facing fixture title. */
      title: string;
      /** Vocabulary cartridge input mode. */
      inputMode: "vocabulary";
      /** Strict vocabulary array. */
      input: VocabularyInput;
    }
  | {
      /** Stable fixture identifier. */
      id: string;
      /** Operator-facing fixture title. */
      title: string;
      /** Sentence cartridge input mode. */
      inputMode: "sentence";
      /** Strict sentence array. */
      input: SentenceInput;
    };

/** Deterministic learning-content fixtures available in the local QC lab. */
export const APK_QC_FIXTURES: readonly APKQCFixture[] = [
  {
    id: "travel-basics",
    title: "Travel basics",
    inputMode: "vocabulary",
    input: [
      { term: "journey", translation: "voyage" },
      { term: "bridge", translation: "pont" },
      { term: "forest", translation: "forêt" },
      { term: "lantern", translation: "lanterne" },
    ],
  },
  {
    id: "classroom-basics",
    title: "Classroom basics",
    inputMode: "vocabulary",
    input: [
      { term: "question", translation: "pregunta" },
      { term: "answer", translation: "respuesta" },
      { term: "book", translation: "libro" },
      { term: "friend", translation: "amigo" },
    ],
  },
  {
    id: "sentence-order",
    title: "Sentence order",
    inputMode: "sentence",
    input: [
      { term: "The curious fox crossed the quiet bridge", translation: "Narrative sentence" },
      { term: "We practice new words every morning", translation: "Habit sentence" },
    ],
  },
] as const;
