import type { SentenceInput } from "@reading-advantage/game-contracts";

import type { GameCartridgeDefinition } from "../../internal/types";
import {
  createSpellweaversRunGameConfig,
  SPELLWEAVERS_RUN_ASSET_SLOTS,
} from "./scene";

export { createSpellweaversRunGameConfig, SPELLWEAVERS_RUN_ASSET_SLOTS } from "./scene";

/** Public Spellweavers Run sentence cartridge using shared lane and scroll systems. */
export const spellweaversRunCartridge = {
  manifest: {
    id: "spellweavers-run",
    title: "Spellweavers Run",
    description: "Collect approaching word orbs in order before the spell loses its mana.",
    inputMode: "sentence",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["timers", "tweens"],
    requiredAssetSlots: SPELLWEAVERS_RUN_ASSET_SLOTS,
  },
  createGameConfig: (context) => createSpellweaversRunGameConfig({
    input: context.input as SentenceInput,
    edition: context.edition,
    inputController: context.inputController,
    complete: (results) => context.complete(results),
    diagnostics: (event) => context.diagnostic(event),
    seed: context.seed ?? Date.now(),
  }),
} as const satisfies GameCartridgeDefinition;

export default spellweaversRunCartridge;
