import type { SentenceInput } from "@reading-advantage/game-contracts";

import type { GameCartridgeDefinition } from "../../internal/types";

import {
  ASTRAL_MAGE_ASSET_SLOTS,
  createAstralMageGameConfig,
} from "./scene";

/** Semantic asset requirements re-exported for edition manifests and tests. */
export { ASTRAL_MAGE_ASSET_SLOTS } from "./scene";

/** Public Astral Mage sentence target-action cartridge definition. */
export const astralMageCartridge = {
  manifest: {
    id: "astral-mage",
    title: "Astral Mage",
    description: "Navigate the magical void and shoot word crystals in sentence order.",
    inputMode: "sentence",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: [
      "arcade-physics",
      "camera",
      "object-pool",
      "particles",
      "timers",
      "tweens",
    ],
    requiredAssetSlots: ASTRAL_MAGE_ASSET_SLOTS,
  },
  createGameConfig: (context) =>
    createAstralMageGameConfig({
      input: context.input as SentenceInput,
      edition: context.edition,
      complete: (results) => context.complete(results),
      diagnostics: (event) => context.diagnostic(event),
      seed: context.seed ?? Date.now(),
    }),
} satisfies GameCartridgeDefinition;

export default astralMageCartridge;
