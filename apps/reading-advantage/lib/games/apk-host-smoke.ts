import {
  cartridgeLoaders,
  type CartridgeId,
} from "@reading-advantage/game-cartridges/catalog";
import { secondaryEpicEdition } from "@reading-advantage/game-cartridges/editions";
import {
  mapGameResultsToCompletionInput,
  normalizeSentenceInput,
  normalizeVocabularyInput,
  type GameCompletionInput,
  type GameResults,
  type HostCompletionContext,
  type SentenceInput,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";

type ReadingVocabularySmokeConfig = {
  cartridgeId: Extract<CartridgeId, "dragon-flight" | "magic-defense">;
  edition: typeof secondaryEpicEdition;
  inputMode: "vocabulary";
  input: VocabularyInput;
};

type ReadingSentenceSmokeConfig = {
  cartridgeId: Extract<CartridgeId, "dungeon-liberator">;
  edition: typeof secondaryEpicEdition;
  inputMode: "sentence";
  input: SentenceInput;
};

/** One Reading Advantage host fixture for a public APK cartridge. */
export type ReadingAPKSmokeConfig =
  | ReadingVocabularySmokeConfig
  | ReadingSentenceSmokeConfig;

/** Reading Advantage package-consumption proofs using the Secondary Epic edition. */
export const readingAPKSmokeConfigs = [
  {
    cartridgeId: "dragon-flight",
    edition: secondaryEpicEdition,
    inputMode: "vocabulary",
    input: normalizeVocabularyInput([
      {
        id: "reading-dragon-1",
        term: "analyze",
        translation: "examine closely",
      },
      {
        id: "reading-dragon-2",
        term: "infer",
        translation: "reach a conclusion",
      },
    ]),
  },
  {
    cartridgeId: "dungeon-liberator",
    edition: secondaryEpicEdition,
    inputMode: "sentence",
    input: normalizeSentenceInput([
      {
        id: "reading-dungeon-1",
        term: "The explorers entered the ancient library.",
        translation: "Los exploradores entraron en la biblioteca antigua.",
      },
      {
        id: "reading-dungeon-2",
        term: "They discovered a map behind the shelves.",
        translation: "Descubrieron un mapa detras de los estantes.",
      },
    ]),
  },
  {
    cartridgeId: "magic-defense",
    edition: secondaryEpicEdition,
    inputMode: "vocabulary",
    input: normalizeVocabularyInput([
      {
        id: "reading-magic-1",
        term: "resilient",
        translation: "able to recover",
      },
      { id: "reading-magic-2", term: "vigilant", translation: "watchful" },
    ]),
  },
] as const satisfies readonly ReadingAPKSmokeConfig[];

/**
 * Loads a Reading smoke cartridge through the shared literal dynamic registry.
 * @param cartridgeId Public cartridge identifier selected by the Reading host.
 * @returns The shared cartridge definition without copied source or assets.
 */
export function loadReadingAPKSmokeCartridge(cartridgeId: CartridgeId) {
  return cartridgeLoaders[cartridgeId]();
}

/**
 * Maps a Reading cartridge result into the server completion boundary.
 * @param results Stable cartridge output containing non-authoritative display XP.
 * @param context Authenticated host timing and idempotency context.
 * @returns Server completion input that excludes display XP and identity claims.
 */
export function mapReadingAPKResult(
  results: GameResults,
  context: HostCompletionContext,
): GameCompletionInput {
  return mapGameResultsToCompletionInput(results, context);
}
