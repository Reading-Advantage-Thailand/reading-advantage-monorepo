import {
  cartridgeCatalog,
  type CartridgeId,
} from "@reading-advantage/game-cartridges/catalog";
import type {
  SentenceInput,
  VocabularyInput,
} from "@reading-advantage/game-contracts";

const ARCADE_VOCABULARY = [
  { term: "journey", translation: "voyage" },
  { term: "bridge", translation: "pont" },
  { term: "forest", translation: "forêt" },
  { term: "lantern", translation: "lanterne" },
] satisfies VocabularyInput;

const ARCADE_SENTENCES = [
  {
    term: "The curious fox crossed the quiet bridge",
    translation: "Narrative sentence",
  },
  {
    term: "We practice new words every morning",
    translation: "Habit sentence",
  },
] satisfies SentenceInput;

/** Returns the published cartridge identifiers in their package-owned order.
 * @returns The exact public APK catalog identifiers.
 */
export function listArcadeCartridgeIds(): readonly CartridgeId[] {
  return cartridgeCatalog.map(({ id }) => id);
}

/** Resolves the stable learning content for a cartridge input mode.
 * @param inputMode Educational input shape declared by the cartridge catalog.
 * @returns A stable vocabulary or sentence array using the public input ABI.
 */
export function getArcadeContent(
  inputMode: "vocabulary" | "sentence",
): VocabularyInput | SentenceInput {
  return inputMode === "vocabulary" ? ARCADE_VOCABULARY : ARCADE_SENTENCES;
}

/** Selects the next published cartridge using deterministic catalog rotation.
 * @param cartridgeId Current cartridge identifier.
 * @returns The following identifier, wrapping to the first published cartridge.
 */
export function getNextCartridgeId(cartridgeId: CartridgeId): CartridgeId {
  const ids = listArcadeCartridgeIds();
  const currentIndex = ids.indexOf(cartridgeId);
  return ids[(currentIndex + 1) % ids.length]!;
}
