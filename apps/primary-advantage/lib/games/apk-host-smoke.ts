import {
  cartridgeLoaders,
  type CartridgeId,
} from "@reading-advantage/game-cartridges/catalog";
import { primaryChibiEdition } from "@reading-advantage/game-cartridges/editions";
import {
  mapGameResultsToCompletionInput,
  normalizeVocabularyInput,
  type GameCompletionInput,
  type GameResults,
  type HostCompletionContext,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";

/** Primary Advantage package-consumption proof using the Primary Chibi edition. */
export const primaryAPKSmokeConfig = {
  cartridgeId: "gate-runner" as CartridgeId,
  edition: primaryChibiEdition,
  input: normalizeVocabularyInput([
    { id: "primary-1", term: "cat", translation: "gato" },
    { id: "primary-2", term: "dog", translation: "perro" },
  ]),
} satisfies {
  cartridgeId: CartridgeId;
  edition: typeof primaryChibiEdition;
  input: VocabularyInput;
};

/**
 * Loads the Primary smoke cartridge through the shared literal dynamic registry.
 * @returns The shared cartridge definition without copied source or assets.
 */
export function loadPrimaryAPKSmokeCartridge() {
  return cartridgeLoaders[primaryAPKSmokeConfig.cartridgeId]();
}

/**
 * Maps a Primary cartridge result into the server completion boundary.
 * @param results Stable cartridge output containing non-authoritative display XP.
 * @param context Authenticated host timing and idempotency context.
 * @returns Server completion input that excludes display XP and identity claims.
 */
export function mapPrimaryAPKResult(
  results: GameResults,
  context: HostCompletionContext,
): GameCompletionInput {
  return mapGameResultsToCompletionInput(results, context);
}
