import {
  cartridgeLoaders,
  type CartridgeId,
} from "@reading-advantage/game-cartridges/catalog";
import { primaryChibiEdition } from "@reading-advantage/game-cartridges/editions";
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

type PrimaryVocabularySmokeConfig = {
  cartridgeId: Extract<CartridgeId, "dragon-flight" | "magic-defense">;
  edition: typeof primaryChibiEdition;
  inputMode: "vocabulary";
  input: VocabularyInput;
};

type PrimarySentenceSmokeConfig = {
  cartridgeId: Extract<
    CartridgeId,
    "dungeon-liberator" | "astral-mage" | "sorcerer-ziggurat"
  >;
  edition: typeof primaryChibiEdition;
  inputMode: "sentence";
  input: SentenceInput;
};

/** One Primary Advantage host fixture for a public APK cartridge. */
export type PrimaryAPKSmokeConfig =
  | PrimaryVocabularySmokeConfig
  | PrimarySentenceSmokeConfig;

/** Primary Advantage package-consumption proofs using the Primary Chibi edition. */
export const primaryAPKSmokeConfigs = [
  {
    cartridgeId: "dragon-flight",
    edition: primaryChibiEdition,
    inputMode: "vocabulary",
    input: normalizeVocabularyInput([
      { id: "primary-dragon-1", term: "cat", translation: "gato" },
      { id: "primary-dragon-2", term: "dog", translation: "perro" },
    ]),
  },
  {
    cartridgeId: "dungeon-liberator",
    edition: primaryChibiEdition,
    inputMode: "sentence",
    input: normalizeSentenceInput([
      {
        id: "primary-dungeon-1",
        term: "The little fox found a key.",
        translation: "El pequeno zorro encontro una llave.",
      },
      {
        id: "primary-dungeon-2",
        term: "The door opened with a click.",
        translation: "La puerta se abrio con un clic.",
      },
    ]),
  },
  {
    cartridgeId: "magic-defense",
    edition: primaryChibiEdition,
    inputMode: "vocabulary",
    input: normalizeVocabularyInput([
      { id: "primary-magic-1", term: "sun", translation: "sol" },
      { id: "primary-magic-2", term: "moon", translation: "luna" },
    ]),
  },
  {
    cartridgeId: "astral-mage",
    edition: primaryChibiEdition,
    inputMode: "sentence",
    input: normalizeSentenceInput([
      {
        id: "primary-astral-1",
        term: "The star shines over the moon.",
        translation: "La estrella brilla sobre la luna.",
      },
      {
        id: "primary-astral-2",
        term: "The little mage finds the crystal.",
        translation: "El pequeno mago encuentra el cristal.",
      },
    ]),
  },
  {
    cartridgeId: "sorcerer-ziggurat",
    edition: primaryChibiEdition,
    inputMode: "sentence",
    input: normalizeSentenceInput([
      {
        id: "primary-ziggurat-1",
        term: "The hero jumps onto the blue cube.",
        translation: "El heroe salta sobre el cubo azul.",
      },
      {
        id: "primary-ziggurat-2",
        term: "The bright rune opens the door.",
        translation: "La runa brillante abre la puerta.",
      },
    ]),
  },
] as const satisfies readonly PrimaryAPKSmokeConfig[];

/**
 * Loads a Primary smoke cartridge through the shared literal dynamic registry.
 * @param cartridgeId Public cartridge identifier selected by the Primary host.
 * @returns The shared cartridge definition without copied source or assets.
 */
export function loadPrimaryAPKSmokeCartridge(cartridgeId: CartridgeId) {
  return cartridgeLoaders[cartridgeId]();
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
