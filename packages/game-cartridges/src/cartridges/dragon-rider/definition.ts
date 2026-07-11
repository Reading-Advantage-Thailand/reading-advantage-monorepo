import type { VocabularyInput } from "@reading-advantage/game-contracts";

import type { GameCartridgeDefinition } from "../../internal/types";
import {
  createDragonRiderGameConfig,
  DRAGON_RIDER_ASSET_SLOTS,
} from "./scene";

export { createDragonRiderGameConfig, DRAGON_RIDER_ASSET_SLOTS } from "./scene";

/** Public Dragon Rider vocabulary cartridge using shared traversal systems. */
export const dragonRiderCartridge = {
  manifest: {
    id: "dragon-rider",
    title: "Dragon Rider",
    description: "Choose translation gates to assemble a dragon flight and defeat the boss.",
    inputMode: "vocabulary",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["arcade-physics", "camera", "timers", "tweens"],
    requiredAssetSlots: DRAGON_RIDER_ASSET_SLOTS,
  },
  createGameConfig: (context) =>
    createDragonRiderGameConfig({
      input: context.input as VocabularyInput,
      edition: context.edition,
      inputController: context.inputController,
      complete: (results) => context.complete(results),
      diagnostics: (event) => context.diagnostic(event),
      seed: context.seed ?? Date.now(),
    }),
} as const satisfies GameCartridgeDefinition;

export default dragonRiderCartridge;
