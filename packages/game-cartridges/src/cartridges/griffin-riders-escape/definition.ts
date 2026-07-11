import type { SentenceInput } from "@reading-advantage/game-contracts";

import type { GameCartridgeDefinition } from "../../internal/types";
import {
  createGriffinRidersGameConfig,
  GRIFFIN_RIDERS_ASSET_SLOTS,
} from "./scene";

export { createGriffinRidersGameConfig, GRIFFIN_RIDERS_ASSET_SLOTS } from "./scene";

/** Public Griffin Riders Escape sentence gate-runner cartridge. */
export const griffinRidersEscapeCartridge = {
  manifest: {
    id: "griffin-riders-escape",
    title: "Griffin Riders Escape",
    description: "Switch lanes to clear ordered word gates and evade sky obstacles.",
    inputMode: "sentence",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["camera", "timers", "tweens"],
    requiredAssetSlots: GRIFFIN_RIDERS_ASSET_SLOTS,
  },
  createGameConfig: (context) => createGriffinRidersGameConfig({
    input: context.input as SentenceInput,
    edition: context.edition,
    inputController: context.inputController,
    complete: (results) => context.complete(results),
    diagnostics: (event) => context.diagnostic(event),
    seed: context.seed ?? Date.now(),
  }),
} as const satisfies GameCartridgeDefinition;

export default griffinRidersEscapeCartridge;
