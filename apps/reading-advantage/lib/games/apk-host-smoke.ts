import {
  cartridgeLoaders,
  type CartridgeId,
} from "@reading-advantage/game-cartridges/catalog";
import { secondaryEpicEdition } from "@reading-advantage/game-cartridges/editions";
import {
  mapGameResultsToCompletionInput,
  normalizeVocabularyInput,
  type GameCompletionInput,
  type GameResults,
  type HostCompletionContext,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";

/** Reading Advantage package-consumption proof using the Secondary Epic edition. */
export const readingAPKSmokeConfig = {
  cartridgeId: "typing-defense" as CartridgeId,
  edition: secondaryEpicEdition,
  input: normalizeVocabularyInput([
    { id: "reading-1", term: "analyze", translation: "examine closely" },
    { id: "reading-2", term: "infer", translation: "reach a conclusion" },
  ]),
} satisfies {
  cartridgeId: CartridgeId;
  edition: typeof secondaryEpicEdition;
  input: VocabularyInput;
};

/**
 * Loads the Reading smoke cartridge through the shared literal dynamic registry.
 * @returns The shared cartridge definition without copied source or assets.
 */
export function loadReadingAPKSmokeCartridge() {
  return cartridgeLoaders[readingAPKSmokeConfig.cartridgeId]();
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
