import type { SentenceInput } from "@reading-advantage/game-contracts";

import type { GameCartridgeDefinition } from "../../internal/types";
import {
  createStormCastleGameConfig,
  STORM_CASTLE_ASSET_SLOTS,
} from "./scene";

export { createStormCastleGameConfig, STORM_CASTLE_ASSET_SLOTS } from "./scene";

/** Public Storm Castle Tower vertical sentence-traversal cartridge. */
export const stormCastleTowerCartridge = {
  manifest: {
    id: "storm-castle-tower",
    title: "Storm Castle Tower",
    description: "Climb ordered word windows while avoiding falling tower hazards.",
    inputMode: "sentence",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["camera", "timers", "tweens"],
    requiredAssetSlots: STORM_CASTLE_ASSET_SLOTS,
  },
  createGameConfig: (context) => createStormCastleGameConfig({
    input: context.input as SentenceInput,
    edition: context.edition,
    inputController: context.inputController,
    complete: (results) => context.complete(results),
    diagnostics: (event) => context.diagnostic(event),
    seed: context.seed ?? Date.now(),
  }),
} as const satisfies GameCartridgeDefinition;

export default stormCastleTowerCartridge;
